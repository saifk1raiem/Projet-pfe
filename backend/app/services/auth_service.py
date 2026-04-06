from datetime import UTC, datetime, timedelta
import secrets

from fastapi import HTTPException, status
from passlib.exc import UnknownHashError
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password, verify_password
from app.models.enums import UserRole
from app.models.user import User
from app.schemas.user import UserCreate, UserUpdate
from app.services.email_service import (
    EmailConfigurationError,
    EmailDeliveryError,
    send_password_reset_email,
)


def _normalize_username(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip()
    return normalized or None


def _normalize_avatar_url(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = str(value).strip()
    return normalized or None


def _get_user_by_email(db: Session, email: str) -> User | None:
    return db.scalar(select(User).where(User.email == email.lower()))


def _get_user_by_username(db: Session, username: str) -> User | None:
    return db.scalar(select(User).where(func.lower(User.username) == username.lower()))


def _is_reserved_super_admin_email(email: str | None) -> bool:
    return bool(email and email.lower() == settings.SUPER_ADMIN_EMAIL.lower())


def _ensure_email_available(db: Session, email: str, exclude_user_id: int | None = None) -> None:
    existing = _get_user_by_email(db, email)
    if existing and existing.id != exclude_user_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Email already exists")


def _ensure_username_available(db: Session, username: str | None, exclude_user_id: int | None = None) -> None:
    if not username:
        return
    existing = _get_user_by_username(db, username)
    if existing and existing.id != exclude_user_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Username already exists")


def _validate_role_change(user: User, requested_role: UserRole, acting_user: User) -> None:
    if requested_role == user.role:
        return
    if _is_reserved_super_admin_email(user.email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The super admin account role cannot be changed",
        )
    if acting_user.role != UserRole.super_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Only the super admin can change roles")
    if requested_role == UserRole.super_admin and user.role != UserRole.super_admin:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only one super admin account is allowed")


def _verify_user_password(db: Session, user: User, password: str) -> bool:
    is_valid = False
    try:
        is_valid = verify_password(password, user.password_hash)
    except (UnknownHashError, ValueError):
        if password == user.password_hash:
            is_valid = True
            user.password_hash = hash_password(password)
            db.commit()
            db.refresh(user)
    return is_valid


def create_user(db: Session, payload: UserCreate, acting_user: User) -> User:
    normalized_email = payload.email.lower()
    normalized_username = _normalize_username(payload.username)
    _ensure_email_available(db, normalized_email)
    _ensure_username_available(db, normalized_username)

    if payload.role == UserRole.super_admin:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Super admin cannot be created here")
    if _is_reserved_super_admin_email(normalized_email):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="The reserved super admin email cannot be used here",
        )
    if acting_user.role != UserRole.super_admin and payload.role != UserRole.observer:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only the super admin can assign admin roles",
        )

    user = User(
        first_name=payload.first_name,
        last_name=payload.last_name,
        username=normalized_username,
        email=normalized_email,
        avatar_url=_normalize_avatar_url(payload.avatar_url),
        password_hash=hash_password(payload.password),
        role=payload.role,
        is_active=payload.is_active,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


def update_user_account(db: Session, user: User, payload: UserUpdate, acting_user: User) -> User:
    data = payload.model_dump(exclude_unset=True)
    is_self_update = acting_user.id == user.id

    if "email" in data and data["email"] is not None:
        normalized_email = data["email"].lower()
        if _is_reserved_super_admin_email(user.email) and normalized_email != user.email.lower():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The super admin email cannot be changed",
            )
        _ensure_email_available(db, normalized_email, exclude_user_id=user.id)
        user.email = normalized_email

    if "username" in data:
        normalized_username = _normalize_username(data["username"])
        _ensure_username_available(db, normalized_username, exclude_user_id=user.id)
        user.username = normalized_username

    if "avatar_url" in data:
        user.avatar_url = _normalize_avatar_url(data["avatar_url"])

    if "first_name" in data and data["first_name"] is not None:
        user.first_name = data["first_name"]

    if "last_name" in data and data["last_name"] is not None:
        user.last_name = data["last_name"]

    if "password" in data and data["password"]:
        if is_self_update:
            current_password = data.get("current_password")
            if not current_password:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Current password is required to change your password",
                )
            if not _verify_user_password(db, user, current_password):
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Current password is incorrect",
                )
        user.password_hash = hash_password(data["password"])

    if "role" in data and data["role"] is not None:
        _validate_role_change(user, data["role"], acting_user)
        user.role = data["role"]

    if "is_active" in data and data["is_active"] is not None:
        if (user.role == UserRole.super_admin or _is_reserved_super_admin_email(user.email)) and not data["is_active"]:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="The super admin account cannot be deactivated",
            )
        user.is_active = data["is_active"]

    db.commit()
    db.refresh(user)
    return user


def _clear_password_reset_state(user: User) -> None:
    user.password_reset_code_hash = None
    user.password_reset_code_expires_at = None


def _normalize_datetime(value: datetime | None) -> datetime | None:
    if value is None or value.tzinfo is not None:
        return value
    return value.replace(tzinfo=UTC)


def authenticate_user(db: Session, email: str, password: str) -> User:
    user = _get_user_by_email(db, email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    is_valid = _verify_user_password(db, user, password)

    if not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")
    return user


def request_password_reset(db: Session, email: str) -> None:
    user = _get_user_by_email(db, email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="An account with this email does not exist",
        )
    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User is inactive")

    code = f"{secrets.randbelow(1_000_000):06d}"
    user.password_reset_code_hash = hash_password(code)
    user.password_reset_code_expires_at = datetime.now(UTC) + timedelta(
        minutes=settings.PASSWORD_RESET_CODE_EXPIRE_MINUTES
    )
    db.commit()
    db.refresh(user)

    try:
        send_password_reset_email(
            recipient_email=user.email,
            recipient_name=f"{user.first_name} {user.last_name}".strip(),
            code=code,
        )
    except EmailConfigurationError as exc:
        _clear_password_reset_state(user)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Email service is not configured",
        ) from exc
    except EmailDeliveryError as exc:
        _clear_password_reset_state(user)
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Failed to send reset email",
        ) from exc


def reset_password_with_code(db: Session, email: str, code: str, new_password: str) -> None:
    user = _get_user_by_email(db, email)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="An account with this email does not exist",
        )

    expires_at = _normalize_datetime(user.password_reset_code_expires_at)
    if not user.password_reset_code_hash or not expires_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No reset code has been requested for this account",
        )

    if expires_at < datetime.now(UTC):
        _clear_password_reset_state(user)
        db.commit()
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Reset code has expired")

    if not verify_password(code, user.password_reset_code_hash):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid reset code")

    user.password_hash = hash_password(new_password)
    _clear_password_reset_state(user)
    db.commit()
