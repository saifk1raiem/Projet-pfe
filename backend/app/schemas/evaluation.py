from datetime import datetime

from pydantic import BaseModel, Field


class EvaluationCreate(BaseModel):
    collaborateur_id: int
    score_100: int = Field(ge=0, le=100)
    stars: int = Field(ge=1, le=5)
    comment: str | None = None


class EvaluationUpdate(BaseModel):
    score_100: int | None = Field(default=None, ge=0, le=100)
    stars: int | None = Field(default=None, ge=1, le=5)
    comment: str | None = None


class EvaluationRead(BaseModel):
    id: int
    session_id: int
    collaborateur_id: int
    formateur_id: int
    score_100: int
    stars: int
    comment: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
