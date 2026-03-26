from pydantic import BaseModel, Field

from app.schemas.extraction_contract import CollaboratorPreviewConflict


class QualificationImportRow(BaseModel):
    matricule: str | None = None
    nom: str | None = None
    prenom: str | None = None
    fonction: str | None = None
    centre_cout: str | None = None
    groupe: str | None = None
    competence: str | None = None
    formateur: str | None = None
    motif: str | None = None
    contre_maitre: str | None = None
    segment: str | None = None
    gender: str | None = None
    num_tel: str | None = None
    formation_id: int | None = None
    formation_label: str | None = None
    statut: str | None = None
    etat: str | None = None
    date_association_systeme: str | None = None
    etat_qualification: str | None = None
    score: float | None = None
    date_recrutement: str | None = None
    anciennete: int | None = None

    model_config = {"extra": "ignore"}


class QualificationFileError(BaseModel):
    file: str
    error: str


class QualificationPreviewResponse(BaseModel):
    columns_detected: list[str] = Field(default_factory=list)
    mapping_used: dict[str, str] = Field(default_factory=dict)
    rows: list[QualificationImportRow] = Field(default_factory=list)
    rows_count: int = 0
    file_errors: list[QualificationFileError] = Field(default_factory=list)
    conflicts: list[CollaboratorPreviewConflict] = Field(default_factory=list)


class QualificationImportRequest(BaseModel):
    rows: list[QualificationImportRow] = Field(default_factory=list)


class QualificationImportSummary(BaseModel):
    collaborators_inserted: int = 0
    collaborators_updated: int = 0
    qualifications_inserted: int = 0
    qualifications_updated: int = 0
    formateurs_created: int = 0
    qualification_rows_with_formateur: int = 0
    skipped: int = 0


class QualificationImportResponse(BaseModel):
    import_summary: QualificationImportSummary
