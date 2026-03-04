from datetime import UTC, datetime, timedelta
from uuid import uuid4

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
token_blacklist: set[str] = set()


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def _create_token(
    subject: str,
    token_type: str,
    expires_delta: timedelta,
    role: str | None = None,
) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": subject,
        "type": token_type,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
        "jti": str(uuid4()),
    }
    if role:
        payload["role"] = role

    secret = settings.JWT_SECRET_KEY if token_type == "access" else settings.JWT_REFRESH_SECRET_KEY
    return jwt.encode(payload, secret, algorithm=settings.JWT_ALGORITHM)


def create_access_token(subject: str, role: str) -> str:
    return _create_token(
        subject=subject,
        role=role,
        token_type="access",
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(subject: str) -> str:
    return _create_token(
        subject=subject,
        token_type="refresh",
        expires_delta=timedelta(minutes=settings.REFRESH_TOKEN_EXPIRE_MINUTES),
    )


def decode_token(token: str, token_type: str) -> dict:
    secret = settings.JWT_SECRET_KEY if token_type == "access" else settings.JWT_REFRESH_SECRET_KEY
    try:
        payload = jwt.decode(token, secret, algorithms=[settings.JWT_ALGORITHM])
    except JWTError as exc:
        raise ValueError("Invalid token") from exc

    if payload.get("type") != token_type:
        raise ValueError("Invalid token type")
    return payload


def decode_any_token(token: str) -> dict:
    try:
        return decode_token(token, "access")
    except ValueError:
        return decode_token(token, "refresh")


def revoke_token_jti(jti: str) -> None:
    token_blacklist.add(jti)


def is_token_revoked(jti: str | None) -> bool:
    return bool(jti and jti in token_blacklist)
