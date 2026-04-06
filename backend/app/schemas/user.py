from datetime import datetime

from pydantic import BaseModel, EmailStr, Field, field_validator

from app.models.enums import UserRole


class UserBase(BaseModel):
    first_name: str
    last_name: str
    username: str | None = None
    email: EmailStr
    avatar_url: str | None = None
    role: UserRole
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    username: str | None = Field(default=None, max_length=100)
    role: UserRole | None = None
    is_active: bool | None = None
    first_name: str | None = None
    last_name: str | None = None
    email: EmailStr | None = None
    avatar_url: str | None = None
    current_password: str | None = None
    password: str | None = Field(default=None, min_length=8)

    @field_validator("username", mode="before")
    @classmethod
    def normalize_username(cls, value: str | None):
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized or None

    @field_validator("avatar_url", mode="before")
    @classmethod
    def normalize_avatar_url(cls, value: str | None):
        if value is None:
            return None
        normalized = str(value).strip()
        return normalized or None


class UserRead(UserBase):
    id: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class LoginUserOption(BaseModel):
    id: int
    first_name: str
    last_name: str
    username: str | None = None
    email: EmailStr
    avatar_url: str | None = None
    role: UserRole

    model_config = {"from_attributes": True}
