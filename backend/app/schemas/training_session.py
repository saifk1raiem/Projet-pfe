from datetime import date

from pydantic import BaseModel, Field

from app.models.enums import SessionStatus


class SessionBase(BaseModel):
    formation_id: int
    formateur_id: int
    start_date: date
    end_date: date
    location: str = Field(min_length=1, max_length=150)
    status: SessionStatus


class SessionCreate(SessionBase):
    pass


class SessionUpdate(BaseModel):
    formation_id: int | None = None
    formateur_id: int | None = None
    start_date: date | None = None
    end_date: date | None = None
    location: str | None = Field(default=None, min_length=1, max_length=150)
    status: SessionStatus | None = None


class SessionRead(SessionBase):
    id: int

    model_config = {"from_attributes": True}
