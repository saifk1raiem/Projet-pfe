from __future__ import annotations

from datetime import date, datetime
import re
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator


TARGET_SCHEMA_COLUMNS = [
    "matricule",
    "nom",
    "prenom",
    "fonction_sap",
    "centre_cout",
    "groupe",
    "competence",
    "formateur",
    "contre_maitre",
    "segment",
    "gender",
    "num_tel",
    "date_recrutement",
    "anciennete",
]


TARGET_SCHEMA_VALIDATION_RULES: dict[str, Any] = {
    "strict_columns_only": True,
    "exact_column_order": TARGET_SCHEMA_COLUMNS,
    "additional_properties": False,
    "missing_value_policy": "Return null for unknown or unavailable values",
    "date_format": "YYYY-MM-DD",
    "gender_normalization": {
        "accepted_output_values": ["M", "F", None],
        "input_examples": {
            "M": ["m", "male", "homme", "masculin", "man"],
            "F": ["f", "female", "femme", "feminin", "woman"],
        },
    },
    "derived_fields": {
        "anciennete": "If anciennete is null and date_recrutement exists, compute current_year - recruitment_year",
    },
    "name_splitting": {
        "rule": "If a single full-name value is used, first token => nom, remaining tokens => prenom",
        "fallback": "If unclear, keep nom and leave prenom null",
    },
}

_WHITESPACE_RE = re.compile(r"\s+")
_GENDER_M_VALUES = {"m", "male", "homme", "masculin", "man"}
_GENDER_F_VALUES = {"f", "female", "femme", "feminin", "woman"}
_DATE_FORMATS = (
    "%Y-%m-%d",
    "%Y/%m/%d",
    "%d/%m/%Y",
    "%d-%m-%Y",
    "%d.%m.%Y",
    "%m/%d/%Y",
    "%m-%d-%Y",
)


def _clean_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    return _WHITESPACE_RE.sub(" ", text)


def _parse_date_to_iso(value: Any) -> str | None:
    if value in (None, ""):
        return None

    if isinstance(value, datetime):
        return value.date().isoformat()
    if isinstance(value, date):
        return value.isoformat()

    text = _clean_text(value)
    if not text:
        return None

    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", text):
        return text

    normalized = text.replace("\\", "/")
    for date_format in _DATE_FORMATS:
        try:
            return datetime.strptime(normalized, date_format).date().isoformat()
        except ValueError:
            continue

    try:
        return datetime.fromisoformat(text).date().isoformat()
    except ValueError:
        return None


def _parse_optional_int(value: Any) -> int | None:
    if value in (None, ""):
        return None

    if isinstance(value, bool):
        return None

    if isinstance(value, int):
        return value

    if isinstance(value, float):
        return int(value)

    text = _clean_text(value)
    if not text:
        return None

    try:
        if "." in text:
            return int(float(text))
        return int(text)
    except ValueError:
        return None


class ExtractedCollaboratorRow(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "additionalProperties": False,
            "propertyOrder": TARGET_SCHEMA_COLUMNS,
        },
    )

    matricule: str | None = Field(default=None)
    nom: str | None = Field(default=None)
    prenom: str | None = Field(default=None)
    fonction_sap: str | None = Field(default=None)
    centre_cout: str | None = Field(default=None)
    groupe: str | None = Field(default=None)
    competence: str | None = Field(default=None)
    formateur: str | None = Field(default=None)
    contre_maitre: str | None = Field(default=None)
    segment: str | None = Field(default=None)
    gender: Literal["M", "F"] | None = Field(default=None)
    num_tel: str | None = Field(default=None)
    date_recrutement: str | None = Field(default=None, pattern=r"^\d{4}-\d{2}-\d{2}$")
    anciennete: int | None = Field(default=None, ge=0, le=100)

    @field_validator(
        "matricule",
        "nom",
        "prenom",
        "fonction_sap",
        "centre_cout",
        "groupe",
        "competence",
        "formateur",
        "contre_maitre",
        "segment",
        "num_tel",
        mode="before",
    )
    @classmethod
    def _normalize_text_fields(cls, value: Any) -> str | None:
        return _clean_text(value)

    @field_validator("nom", "prenom", mode="after")
    @classmethod
    def _normalize_name_case(cls, value: str | None) -> str | None:
        return value.title() if value else None

    @field_validator("gender", mode="before")
    @classmethod
    def _normalize_gender(cls, value: Any) -> Literal["M", "F"] | None:
        text = _clean_text(value)
        if not text:
            return None

        normalized = text.casefold()
        if normalized in _GENDER_M_VALUES:
            return "M"
        if normalized in _GENDER_F_VALUES:
            return "F"
        return None

    @field_validator("date_recrutement", mode="before")
    @classmethod
    def _normalize_date_recrutement(cls, value: Any) -> str | None:
        return _parse_date_to_iso(value)

    @field_validator("anciennete", mode="before")
    @classmethod
    def _normalize_anciennete(cls, value: Any) -> int | None:
        parsed = _parse_optional_int(value)
        if parsed is None or parsed < 0:
            return None
        return parsed

    @model_validator(mode="after")
    def _derive_anciennete(self) -> "ExtractedCollaboratorRow":
        if self.anciennete is None and self.date_recrutement:
            recruitment_year = int(self.date_recrutement[:4])
            self.anciennete = max(date.today().year - recruitment_year, 0)
        return self


class ExtractedCollaboratorTable(BaseModel):
    model_config = ConfigDict(
        extra="forbid",
        json_schema_extra={
            "additionalProperties": False,
        },
    )

    rows: list[ExtractedCollaboratorRow] = Field(default_factory=list)


class ExtractedCollaboratorImportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rows: list[ExtractedCollaboratorRow] = Field(default_factory=list)


class CollaboratorConflictField(BaseModel):
    model_config = ConfigDict(extra="forbid")

    field: str
    row_field: str
    existing_value: str | int | None = None
    incoming_value: str | int | None = None


class CollaboratorPreviewConflict(BaseModel):
    model_config = ConfigDict(extra="forbid")

    row_index: int
    matricule: str
    fields: list[CollaboratorConflictField] = Field(default_factory=list)


class ExtractedCollaboratorPreviewResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    columns_detected: list[str] = Field(default_factory=list)
    mapping_used: dict[str, str] = Field(default_factory=dict)
    rows: list[ExtractedCollaboratorRow] = Field(default_factory=list)
    rows_count: int = 0
    file_errors: list[dict[str, str]] = Field(default_factory=list)
    conflicts: list[CollaboratorPreviewConflict] = Field(default_factory=list)


def get_extraction_json_schema() -> dict[str, Any]:
    return ExtractedCollaboratorTable.model_json_schema()
