import os
import logging
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.core.config import settings
from app.database.session import engine, Base
from app.api import auth, documents, chat, compare

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("legallens")

# Auto-create database tables and ensure schema sync on startup
Base.metadata.create_all(bind=engine)
try:
    with engine.connect() as conn:
        from sqlalchemy import text
        try:
            conn.execute(text("ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT 1 NOT NULL"))
            conn.commit()
        except Exception:
            pass  # column already exists
except Exception as e:
    logger.debug(f"Schema sync check: {e}")
logger.info("Database tables verified/created.")

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
# CORS Middleware — restrict to trusted origins in production
# ---------------------------------------------------------------------------
ALLOWED_ORIGINS = [
    "http://localhost:3000",
    "http://localhost:3001",
    "http://localhost:3002",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3001",
    "http://127.0.0.1:3002",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_origin_regex=r"^https?://(localhost|127\.0\.0\.1)(:\d+)?$",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],
)

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
def health_check():
    return {"status": "ok"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)
