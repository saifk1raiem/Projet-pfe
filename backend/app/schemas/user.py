from datetime import datetime

from pydantic import BaseModel, EmailStr

from app.models.enums import UserRole


class UserBase(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    role: UserRole
    is_active: bool = True


class UserCreate(UserBase):
    password: str


class UserUpdate(BaseModel):
    role: UserRole | None = None
    is_active: bool | None = None
    first_name: str | None = None
    last_name: str | None = None


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
