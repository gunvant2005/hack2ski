import os
import secrets

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


def _get_jwt_secret() -> str:
    env_secret = os.getenv("JWT_SECRET", "").strip()
    if env_secret and len(env_secret) >= 32:
        return env_secret
    generated = secrets.token_urlsafe(48)
    return generated


class Settings(BaseSettings):
    PROJECT_NAME: str = "LegalLens AI"
    API_V1_STR: str = "/api"
    SECRET_KEY: str = _get_jwt_secret()
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7

    DATABASE_URL: str = os.getenv("DATABASE_URL", default_db)

    LLM_API_KEY: str = os.getenv("LLM_API_KEY", os.getenv("GEMINI_API_KEY", ""))
    EMBEDDING_API_KEY: str = os.getenv("EMBEDDING_API_KEY", os.getenv("GEMINI_API_KEY", ""))

    UPLOAD_DIR: str = os.getenv("UPLOAD_DIR", default_upload)
    MAX_UPLOAD_SIZE_MB: int = 20

    ENVIRONMENT: str = os.getenv("ENVIRONMENT", "development").lower()
    DEBUG: bool = os.getenv("DEBUG", "1").lower() in ("1", "true", "yes")

    CORS_ALLOWED_ORIGINS: str = os.getenv("CORS_ALLOWED_ORIGINS", "")

    RATE_LIMIT_PER_MINUTE_AUTH: int = int(os.getenv("RATE_LIMIT_AUTH", "20"))
    RATE_LIMIT_PER_MINUTE_GENERAL: int = int(os.getenv("RATE_LIMIT_GENERAL", "120"))

    PASSWORD_MIN_LENGTH: int = 8
    PASSWORD_REQUIRE_UPPERCASE: bool = True
    PASSWORD_REQUIRE_LOWERCASE: bool = True
    PASSWORD_REQUIRE_DIGIT: bool = True
    PASSWORD_REQUIRE_SPECIAL: bool = False

    PROMPT_INJECTION_CHECK_ENABLED: bool = True
    LLM_TIMEOUT_SECONDS: int = 45
    LLM_MAX_RETRIES: int = 2

    ALLOWED_UPLOAD_EXTENSIONS: set = {".pdf", ".docx", ".doc", ".txt", ".rtf"}

    model_config = SettingsConfigDict(
        case_sensitive=True,
        extra="ignore",
    )


settings = Settings()

try:
    os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
except Exception:
    pass
