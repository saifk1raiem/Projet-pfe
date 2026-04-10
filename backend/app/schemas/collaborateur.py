from pydantic import BaseModel, Field, field_validator


class CollaborateurUpdateRequest(BaseModel):
    nom: str | None = Field(default=None, min_length=1, max_length=150)
    prenom: str | None = Field(default=None, min_length=1, max_length=150)
    fonction: str | None = Field(default=None, max_length=100)
    centre_cout: str | None = Field(default=None, max_length=50)
    groupe: str | None = Field(default=None, max_length=50)
    contre_maitre: str | None = Field(default=None, max_length=100)
    segment: str | None = Field(default=None, max_length=50)
    gender: str | None = Field(default=None, max_length=10)
    num_tel: str | None = Field(default=None, max_length=20)
    date_recrutement: str | None = None
    anciennete: int | None = Field(default=None, ge=0)

    @field_validator(
        "fonction",
        "centre_cout",
        "groupe",
        "contre_maitre",
        "segment",
        "gender",
        "num_tel",
        "date_recrutement",
        mode="before",
    )
    @classmethod
    def normalize_blank_strings(cls, value: str | None):
        if value is None:
            return None
        text = str(value).strip()
        return text or None
