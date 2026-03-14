from datetime import datetime

from pydantic import BaseModel, EmailStr, field_validator

from app.models.enums import UserRole, normalize_user_role


class UserBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    role: UserRole
    is_active: bool = True

    @field_validator("role", mode="before")
    @classmethod
    def normalize_role(cls, value: UserRole | str) -> UserRole:
        normalized = normalize_user_role(value)
        if normalized is None:
            raise ValueError("Role is required")
        return normalized


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    role: UserRole | None = None
    is_active: bool | None = None
    first_name: str | None = None
    last_name: str | None = None

    @field_validator("role", mode="before")
    @classmethod
    def normalize_role(cls, value: UserRole | str | None) -> UserRole | None:
        return normalize_user_role(value)


class UserRead(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LoginUserOption(BaseModel):
    id: int
    first_name: str
    last_name: str
    email: EmailStr
    role: UserRole

    model_config = {"from_attributes": True}
