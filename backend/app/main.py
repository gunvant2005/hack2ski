import os
import time
import logging
import json
import re
from collections import defaultdict, deque
from fastapi import FastAPI, Request, status, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse, PlainTextResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
from app.core.config import settings
from app.database.session import engine, Base
from app.api import auth, documents, chat, compare

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    handlers=[logging.StreamHandler()],
)
logger = logging.getLogger("legallens")

try:
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        from sqlalchemy import text
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1 NOT NULL"))
            conn.commit()
        except Exception:
            pass
    logger.info("Database tables verified/created.")
except Exception as e:
    logger.warning(f"Database table verification deferred: {e}")

app = FastAPI(
    title=settings.PROJECT_NAME,
    description=(
        "LegalLens AI — GenAI Legal Document Intelligence Platform API.\n\n"
        "**Disclaimer:** LegalLens AI provides general legal information and document assistance. "
        "It does **not** replace professional legal advice from a qualified attorney."
    ),
    version="1.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
    redirect_slashes=False,
)

app.add_middleware(GZipMiddleware, minimum_size=1000)

ALLOWED_HOSTS = ["*"]
if settings.ENVIRONMENT == "production":
    env_hosts = os.getenv("ALLOWED_HOSTS", "")
    if env_hosts:
        ALLOWED_HOSTS = [h.strip() for h in env_hosts.split(",") if h.strip()]
if len(ALLOWED_HOSTS) > 0 and ALLOWED_HOSTS[0] != "*":
    app.add_middleware(TrustedHostMiddleware, allowed_hosts=ALLOWED_HOSTS)

DEFAULT_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
]

env_origins = settings.CORS_ALLOWED_ORIGINS
if env_origins:
    for o in env_origins.split(","):
        cleaned = o.strip()
        if cleaned and cleaned not in DEFAULT_ORIGINS:
            DEFAULT_ORIGINS.append(cleaned)

CORS_ORIGIN_REGEX = r"^https?://(localhost|127\.0\.0\.1|.*\.vercel\.app)(:\d+)?$"

app.add_middleware(
    CORSMiddleware,
    allow_origins=DEFAULT_ORIGINS,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Origin", "X-Requested-With"],
    expose_headers=["Content-Disposition", "X-Request-ID"],
    max_age=600,
)

_auth_rate_limit: dict[str, deque] = defaultdict(deque)
_general_rate_limit: dict[str, deque] = defaultdict(deque)
AUTH_WINDOW_SECONDS = 60
GENERAL_WINDOW_SECONDS = 60
MAX_AUTH_ATTEMPTS = settings.RATE_LIMIT_PER_MINUTE_AUTH
MAX_GENERAL_REQUESTS = settings.RATE_LIMIT_PER_MINUTE_GENERAL

_REQUEST_COUNTER = 0


def _get_client_ip(request: Request) -> str:
    forwarded = request.headers.get("x-forwarded-for", "")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.headers.get("x-real-ip") or (request.client.host if request.client else "unknown")


def _check_sliding_window(tracker: dict[str, deque], key: str, window: int, limit: int) -> bool:
    now = time.time()
    dq = tracker[key]
    while dq and (now - dq[0]) >= window:
        dq.popleft()
    if len(dq) >= limit:
        return False
    dq.append(now)
    tracker[key] = dq
    return True


@app.middleware("http")
async def request_id_and_logging(request: Request, call_next):
    global _REQUEST_COUNTER
    _REQUEST_COUNTER += 1
    req_id = f"req-{int(time.time())}-{_REQUEST_COUNTER}"
    start = time.time()
    try:
        response = await call_next(request)
        elapsed = (time.time() - start) * 1000
        response.headers["X-Request-ID"] = req_id
        response.headers["X-Response-Time-MS"] = f"{elapsed:.1f}"
        method = request.method
        path = request.url.path
        status_code = response.status_code
        level = logging.INFO if status_code < 400 else logging.WARNING
        logger.log(level, f"[{req_id}] {method} {path} → {status_code} ({elapsed:.0f}ms)")
        return response
    except Exception as exc:
        elapsed = (time.time() - start) * 1000
        logger.error(f"[{req_id}] {request.method} {request.url.path} FAILED after {elapsed:.0f}ms: {exc}", exc_info=True)
        raise


@app.middleware("http")
async def rate_limit_middleware(request: Request, call_next):
    if request.method == "OPTIONS":
        return await call_next(request)
    path = request.url.path
    client_ip = _get_client_ip(request)

    if path.endswith("/auth/login") or path.endswith("/auth/register"):
        if not _check_sliding_window(_auth_rate_limit, client_ip, AUTH_WINDOW_SECONDS, MAX_AUTH_ATTEMPTS):
            logger.warning(f"Auth rate limit exceeded for IP: {client_ip} on {path}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many authentication attempts. Please wait and try again."},
            )
    else:
        if not _check_sliding_window(_general_rate_limit, client_ip, GENERAL_WINDOW_SECONDS, MAX_GENERAL_REQUESTS):
            logger.warning(f"General rate limit exceeded for IP: {client_ip} on {path}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many requests. Please slow down and try again shortly."},
            )

    return await call_next(request)


@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    if request.method != "OPTIONS":
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = (
            "geolocation=(), microphone=(), camera=(), payment=(), "
            "usb=(), bluetooth=(), magnetometer=(), gyroscope=()"
        )
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        
        path = request.url.path
        if path.startswith("/docs") or path.startswith("/redoc") or path.startswith("/openapi"):
            csp = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; "
                "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net fonts.googleapis.com; "
                "img-src 'self' data: https: https://fastapi.tiangolo.com; "
                "font-src 'self' data: https://cdn.jsdelivr.net fonts.gstatic.com; "
                "connect-src 'self' https:; "
                "frame-ancestors 'none'; "
                "base-uri 'self';"
            )
        else:
            csp = (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "font-src 'self' data:; "
                "connect-src 'self' https:; "
                "frame-ancestors 'none'; "
                "base-uri 'self'; "
                "form-action 'self';"
            )
        response.headers["Content-Security-Policy"] = csp
    return response


@app.middleware("http")
async def add_cache_headers(request: Request, call_next):
    response = await call_next(request)
    path = request.url.path
    method = request.method
    if path in ("/", "/health", "/api/health", "/favicon.ico"):
        response.headers["Cache-Control"] = "public, max-age=60, s-maxage=120"
    elif method == "GET" and "/documents/" in path:
        response.headers["Cache-Control"] = "private, max-age=30, must-revalidate"
    elif method == "GET" and method != "OPTIONS":
        response.headers["Cache-Control"] = "private, max-age=10, must-revalidate"
    else:
        response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
        response.headers["Pragma"] = "no-cache"
    return response


@app.exception_handler(RequestValidationError)
async def validation_exception_handler(request: Request, exc: RequestValidationError):
    errors = []
    for err in exc.errors():
        loc = " → ".join(str(x) for x in err.get("loc", []))
        msg = err.get("msg", "Validation error")
        errors.append(f"[{loc}] {msg}")
    logger.warning(f"Validation error on {request.method} {request.url.path}: {errors}")
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "detail": "Request validation failed. Please check your input.",
            "errors": errors,
        },
    )


@app.exception_handler(StarletteHTTPException)
async def http_exception_handler(request: Request, exc: StarletteHTTPException):
    if exc.status_code == 404:
        return JSONResponse(status_code=404, content={"detail": "Resource not found"})
    if exc.status_code == 401:
        return JSONResponse(
            status_code=401,
            content={"detail": exc.detail or "Authentication required"},
            headers={"WWW-Authenticate": "Bearer"},
        )
    return JSONResponse(status_code=exc.status_code, content={"detail": exc.detail or "Request error"})


@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected server error occurred. Please try again later."},
    )


app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(documents.router, prefix=settings.API_V1_STR)
app.include_router(chat.router, prefix=settings.API_V1_STR)
app.include_router(compare.router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "healthy",
        "service": "LegalLens AI API",
        "version": "1.1.0",
        "docs": "/docs",
        "redoc": "/redoc",
        "openapi": "/openapi.json",
        "genai_provider": "Google Gemini (multi-model cascade)",
        "rag_pipeline": "TF-IDF Semantic Embeddings + Keyword-Weighted Cosine Retrieval + Grounded Generation",
        "features": [
            "Plain-Language Document Summarization",
            "Categorized Clause Extraction",
            "AI Attention Radar Dashboard (Risk Detection)",
            "Grounded RAG Document Q&A with Citations",
            "Side-by-Side Document Comparison",
            "Before-You-Sign Checklist",
            "Lawyer Question Preparation",
            "Prompt Injection Defense",
            "Security Headers & Rate Limiting",
        ],
        "disclaimer": (
            "LegalLens AI provides general legal information and document assistance. "
            "It does not replace professional legal advice."
        ),
    }


@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check():
    db_ok = True
    try:
        with engine.connect() as conn:
            from sqlalchemy import text
            conn.execute(text("SELECT 1"))
    except Exception:
        db_ok = False
    return {
        "status": "ok" if db_ok else "degraded",
        "service": "LegalLens AI",
        "genai_ready": bool(settings.LLM_API_KEY and len(settings.LLM_API_KEY.strip()) > 5),
        "database": "connected" if db_ok else "disconnected",
        "version": "1.1.0",
    }


@app.get("/api/metrics", tags=["Monitoring"])
def api_metrics():
    return {
        "status": "operational",
        "genai_provider": "Google Gemini (multi-model cascade)",
        "genai_configured": bool(settings.LLM_API_KEY and len(settings.LLM_API_KEY.strip()) > 5),
        "rag_pipeline": "active",
        "embedding_dimensions": 64,
        "supported_formats": sorted(list(settings.ALLOWED_UPLOAD_EXTENSIONS)),
        "max_upload_mb": settings.MAX_UPLOAD_SIZE_MB,
        "security": {
            "jwt_auth": True,
            "rate_limiting": True,
            "rate_limits": {
                "auth_per_minute": settings.RATE_LIMIT_PER_MINUTE_AUTH,
                "general_per_minute": settings.RATE_LIMIT_PER_MINUTE_GENERAL,
            },
            "prompt_injection_defense": settings.PROMPT_INJECTION_CHECK_ENABLED,
            "cors_configured": True,
            "security_headers": True,
            "content_security_policy": True,
            "password_strength_validation": True,
            "input_sanitization": True,
        },
    }


@app.get("/robots.txt", include_in_schema=False)
def robots_txt():
    return PlainTextResponse(
        "User-agent: *\n"
        "Disallow: /api/\n"
    )


@app.get("/favicon.ico", include_in_schema=False)
def favicon():
    return Response(status_code=status.HTTP_204_NO_CONTENT)


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host="0.0.0.0",
        port=8000,
        reload=settings.DEBUG,
        log_level="info",
        proxy_headers=True,
        forwarded_allow_ips="*",
    )
