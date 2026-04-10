from pydantic import BaseModel


class FormateurCreateRequest(BaseModel):
    nom: str
    telephone: str | None = None
    email: str | None = None
    specialite: str | None = None
    formation_ids: list[int] = []


class FormateurUpdateRequest(BaseModel):
    nom: str
    telephone: str | None = None
    email: str | None = None
    specialite: str | None = None
    formation_ids: list[int] = []


class FormateurDeleteResponse(BaseModel):
    id: int
    deleted: bool = True
    detached_qualifications: int = 0


class FormateurResponse(BaseModel):
    id: int
    nom: str
    telephone: str | None = None
    email: str | None = None
    specialite: str | None = None
    formation_ids: list[int] = []
    formations: int = 0
    collaborateurs: int = 0
