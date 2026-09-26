import re
import hashlib
import logging
from datetime import datetime, timedelta, timezone
from typing import Optional, Union, Any, Tuple
from jose import jwt, JWTError
from passlib.context import CryptContext
from app.core.config import settings

logger = logging.getLogger("legallens.security")

try:
    import bcrypt
    if not hasattr(bcrypt, "__about__"):
        class BcryptAbout:
            __version__ = getattr(bcrypt, "__version__", "4.0.0")
        bcrypt.__about__ = BcryptAbout()
except ImportError:
    bcrypt = None

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

_COMMON_PASSWORDS = {
    "password", "12345678", "qwerty123", "letmein", "welcome1",
    "monkey123", "dragon123", "baseball1", "football1", "superman1",
    "trustno1", "hello123", "freedom1", "whatever1", "password1",
    "abc123456", "00000000", "11111111", "iloveyou1", "admin123"
}

_INVALIDATED_TOKENS: set = set()


def validate_password_strength(password: str) -> Tuple[bool, list]:
    errors = []
    if len(password) < settings.PASSWORD_MIN_LENGTH:
        errors.append(f"Password must be at least {settings.PASSWORD_MIN_LENGTH} characters long.")
    if settings.PASSWORD_REQUIRE_UPPERCASE and not re.search(r"[A-Z]", password):
        errors.append("Password must contain at least one uppercase letter.")
    if settings.PASSWORD_REQUIRE_LOWERCASE and not re.search(r"[a-z]", password):
        errors.append("Password must contain at least one lowercase letter.")
    if settings.PASSWORD_REQUIRE_DIGIT and not re.search(r"\d", password):
        errors.append("Password must contain at least one digit.")
    if settings.PASSWORD_REQUIRE_SPECIAL and not re.search(r"[!@#$%^&*()_+\-=\[\]{};':\"\\|,.<>\/?]", password):
        errors.append("Password must contain at least one special character.")
    if password.lower() in _COMMON_PASSWORDS:
        errors.append("This password is too common. Please choose a stronger password.")
    if len(set(password)) < max(4, len(password) // 3):
        errors.append("Password contains too few unique characters.")
    return (len(errors) == 0, errors)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    if not plain_password or not hashed_password:
        return False
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        try:
            hashed_bytes = hashlib.sha256(plain_password.encode()).hexdigest()
            return hashed_bytes == hashed_password
        except Exception:
            return False


def get_password_hash(password: str) -> str:
    try:
        return pwd_context.hash(password)
    except Exception:
        return hashlib.sha256(password.encode()).hexdigest()


def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)

    jti = hashlib.sha256(f"{subject}{expire.timestamp()}{settings.SECRET_KEY[:8]}".encode()).hexdigest()[:16]
    to_encode = {"exp": expire, "sub": str(subject), "jti": jti, "iat": datetime.now(timezone.utc)}
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt


def decode_access_token(token: str) -> Optional[str]:
    if not token or token in _INVALIDATED_TOKENS:
        return None
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        jti = payload.get("jti", "")
        if jti and jti in _INVALIDATED_TOKENS:
            return None
        sub = payload.get("sub")
        if sub:
            return str(sub)
        return None
    except JWTError:
        return None
    except Exception:
        return None


def invalidate_token(token: str) -> bool:
    try:
        if len(_INVALIDATED_TOKENS) > 10000:
            _INVALIDATED_TOKENS.clear()
        if token:
            _INVALIDATED_TOKENS.add(token)
        return True
    except Exception:
        return False


def sanitize_html_input(text: str) -> str:
    try:
        import bleach
        allowed_tags: list = []
        allowed_attrs: dict = {}
        return bleach.clean(text or "", tags=allowed_tags, attributes=allowed_attrs, strip=True)
    except Exception:
        cleaned = re.sub(r"<[^>]*>", "", text or "")
        cleaned = re.sub(r"[<>]", "", cleaned)
        return cleaned


def sanitize_filename(filename: str) -> str:
    if not filename:
        return "document"
    basename = os.path.basename(filename) if "os" in globals() else filename.split("/")[-1].split("\\")[-1]
    basename = basename.replace("\0", "").strip()
    basename = re.sub(r"[^\w\-\. ]+", "_", basename)
    basename = basename.strip(" .")
    if len(basename) > 200:
        name, ext = os.path.splitext(basename) if "os" in globals() else (basename[:-5], basename[-5:])
        basename = name[:195] + ext
    return basename or "document"


import os
