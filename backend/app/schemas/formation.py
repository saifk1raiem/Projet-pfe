from pydantic import BaseModel, Field


class FormationBase(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    name: str = Field(min_length=1, max_length=200)
    field: str = Field(min_length=1, max_length=100)
    duration_days: int = Field(gt=0)


class FormationCreate(FormationBase):
    pass


class FormationUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=50)
    name: str | None = Field(default=None, min_length=1, max_length=200)
    field: str | None = Field(default=None, min_length=1, max_length=100)
    duration_days: int | None = Field(default=None, gt=0)


class FormationRead(FormationBase):
    id: int

    model_config = {"from_attributes": True}
