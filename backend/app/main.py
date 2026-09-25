import os
import time
import logging
from collections import defaultdict
from fastapi import FastAPI, Request, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.database.session import engine, Base
from app.api import auth, documents, chat, compare

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("legallens")

# Auto-create database tables and ensure schema sync on startup
try:
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        from sqlalchemy import text
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1 NOT NULL"))
            conn.commit()
        except Exception:
            pass  # column already exists
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
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ---------------------------------------------------------------------------
# GZip Compression Middleware (Efficiency)
# ---------------------------------------------------------------------------
app.add_middleware(GZipMiddleware, minimum_size=1000)

# ---------------------------------------------------------------------------
# CORS Configuration (Production + Vercel Deployment Support)
# ---------------------------------------------------------------------------
DEFAULT_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
]

env_origins = os.getenv("CORS_ALLOWED_ORIGINS", "")
if env_origins:
    for o in env_origins.split(","):
        cleaned = o.strip()
        if cleaned and cleaned not in DEFAULT_ORIGINS:
            DEFAULT_ORIGINS.append(cleaned)

# Regex matches localhost, 127.0.0.1 on any port, and any *.vercel.app deployment URL
CORS_ORIGIN_REGEX = r"^https?://(localhost|127\.0\.0\.1|.*\.vercel\.app)(:\d+)?$"

app.add_middleware(
    CORSMiddleware,
    allow_origins=DEFAULT_ORIGINS,
    allow_origin_regex=CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

# ---------------------------------------------------------------------------
# Rate Limiting Middleware (Security: In-memory sliding window for auth endpoints)
# ---------------------------------------------------------------------------
_auth_rate_limit: dict[str, list[float]] = defaultdict(list)
AUTH_WINDOW_SECONDS = 60
MAX_AUTH_ATTEMPTS = 30  # generous for normal users, blocks brute-force bots


@app.middleware("http")
async def rate_limit_auth_endpoints(request: Request, call_next):
    path = request.url.path
    if path.endswith("/auth/login") or path.endswith("/auth/register"):
        client_ip = request.client.host if request.client else "unknown"
        now = time.time()
        timestamps = _auth_rate_limit[client_ip]
        # Keep only timestamps within the sliding window
        _auth_rate_limit[client_ip] = [t for t in timestamps if now - t < AUTH_WINDOW_SECONDS]
        if len(_auth_rate_limit[client_ip]) >= MAX_AUTH_ATTEMPTS:
            logger.warning(f"Rate limit exceeded for IP: {client_ip} on {path}")
            return JSONResponse(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                content={"detail": "Too many requests. Please wait a moment before trying again."},
            )
        _auth_rate_limit[client_ip].append(now)

    return await call_next(request)


# ---------------------------------------------------------------------------
# Security Headers Middleware
# ---------------------------------------------------------------------------
@app.middleware("http")
async def add_security_headers(request: Request, call_next):
    response = await call_next(request)
    if request.method != "OPTIONS":
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), microphone=(), camera=()"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
    return response


# ---------------------------------------------------------------------------
# Global error handler — never leak stack traces to clients
# ---------------------------------------------------------------------------
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    logger.error(f"Unhandled error on {request.method} {request.url}: {exc}", exc_info=True)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected server error occurred. Please try again later."},
    )


# ---------------------------------------------------------------------------
# Router Registration
# ---------------------------------------------------------------------------
app.include_router(auth.router, prefix=settings.API_V1_STR)
app.include_router(documents.router, prefix=settings.API_V1_STR)
app.include_router(chat.router, prefix=settings.API_V1_STR)
app.include_router(compare.router, prefix=settings.API_V1_STR)


@app.get("/", tags=["Health"])
def root():
    return {
        "status": "healthy",
        "service": "LegalLens AI API",
        "version": "1.0.0",
        "docs": "/docs",
        "disclaimer": (
            "LegalLens AI provides general legal information and document assistance. "
            "It does not replace professional legal advice."
        ),
    }


@app.get("/health", tags=["Health"])
@app.get("/api/health", tags=["Health"])
def health_check():
    return {"status": "ok"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
