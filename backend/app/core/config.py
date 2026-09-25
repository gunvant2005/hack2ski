import os

# Safe dotenv loading for local development
try:
    from dotenv import load_dotenv
    load_dotenv()
    _parent_env = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(__file__)))), ".env")
    if os.path.exists(_parent_env):
        load_dotenv(_parent_env)
except ImportError:
    pass

from pydantic_settings import BaseSettings, SettingsConfigDict

is_serverless = bool(os.getenv("VERCEL") or os.getenv("AWS_LAMBDA_FUNCTION_NAME"))
default_db = "sqlite:////tmp/legallens.db" if is_serverless else "sqlite:///./legallens.db"
default_upload = "/tmp/uploads" if is_serverless else os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), "uploads")


class Settings(BaseSettings):
    PROJECT_NAME: str = "LegalLens AI"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = os.getenv("JWT_SECRET", "super-secret-legallens-jwt-key-2026-hackathon")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days

    # Database
    DATABASE_URL: str = os.getenv("DATABASE_URL", default_db)

    # AI Configuration
    LLM_API_KEY: str = os.getenv("LLM_API_KEY", os.getenv("GEMINI_API_KEY", ""))
    EMBEDDING_API_KEY: str = os.getenv("EMBEDDING_API_KEY", os.getenv("GEMINI_API_KEY", ""))

    # Upload configuration
    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", default_upload)
    MAX_UPLOAD_SIZE_MB: int = 20

    model_config = SettingsConfigDict(
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()

try:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
except Exception:
    pass
