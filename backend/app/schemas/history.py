from __future__ import annotations

import math
from typing import Any, Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator


_MONTH_ALIASES = {
    "1": "01",
    "01": "01",
    "jan": "01",
    "january": "01",
    "janvier": "01",
    "2": "02",
    "02": "02",
    "feb": "02",
    "february": "02",
    "fev": "02",
    "fevr": "02",
    "fevrier": "02",
    "fvr": "02",
    "3": "03",
    "03": "03",
    "mar": "03",
    "march": "03",
    "mars": "03",
    "4": "04",
    "04": "04",
    "apr": "04",
    "april": "04",
    "avr": "04",
    "avril": "04",
    "5": "05",
    "05": "05",
    "may": "05",
    "mai": "05",
    "6": "06",
    "06": "06",
    "jun": "06",
    "june": "06",
    "juin": "06",
    "7": "07",
    "07": "07",
    "jul": "07",
    "july": "07",
    "juil": "07",
    "juillet": "07",
    "8": "08",
    "08": "08",
    "aug": "08",
    "august": "08",
    "aout": "08",
    "sept": "09",
    "sep": "09",
    "september": "09",
    "septembre": "09",
    "9": "09",
    "09": "09",
    "oct": "10",
    "october": "10",
    "octobre": "10",
    "10": "10",
    "nov": "11",
    "november": "11",
    "novembre": "11",
    "11": "11",
    "dec": "12",
    "december": "12",
    "decembre": "12",
    "12": "12",
}

_ABSENCE_NATURES = {
    "absence",
    "absent",
    "abs",
    "mr",
    "mise en demeure",
    "sans questionnaire",
    "conge sans solde",
    "absence autorise",
    "maladie prolongee",
    "absence continue",
    "conge annuel",
    "congé annuel",
}


def _clean_text(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, float) and not math.isfinite(value):
        return None
    text = " ".join(str(value).split()).strip()
    if not text:
        return None
    if text.casefold() in {"nan", "null", "none"}:
        return None
    return text


def _parse_optional_int(value: Any) -> int | None:
    if value in (None, ""):
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        if not math.isfinite(value):
            return None
        return int(value)

    text = _clean_text(value)
    if text is None:
        return None

    try:
        return int(float(text.replace(",", ".")))
    except ValueError:
        return None


def _normalize_day(value: Any) -> str | None:
    parsed = _parse_optional_int(value)
    if parsed is None or parsed < 1 or parsed > 31:
        return None
    return f"{parsed:02d}"


def _normalize_month(value: Any) -> str | None:
    text = _clean_text(value)
    if text is None:
        return None
    token = text.casefold().replace(".", "")
    token = token.replace("é", "e").replace("è", "e").replace("ê", "e").replace("û", "u")
    return _MONTH_ALIASES.get(token)


def row_has_absence_indicator(values: dict[str, Any]) -> bool:
    nature = _clean_text(values.get("nature"))
    nature_token = nature.casefold() if nature else ""
    if nature_token in _ABSENCE_NATURES:
        return True

    motif = _clean_text(values.get("motif"))
    if motif:
        return True

    for field in ("eff_mr", "abs_p_par_per", "abs_np_par"):
        field_value = _parse_optional_int(values.get(field))
        if field_value is not None and field_value > 0:
            return True

    return False


class HistoryImportRow(BaseModel):
    model_config = ConfigDict(extra="forbid")

    matricule: str | None = None
    nature: str | None = None
    entree_sorie: str | None = None
    heures_de_presences: int | None = Field(default=None, ge=0)
    motif: str | None = None
    eff_actif: int | None = Field(default=None, ge=0)
    eff_presente: int | None = Field(default=None, ge=0)
    eff_mr: int | None = Field(default=None, ge=0)
    abs_p_par_per: int | None = Field(default=None, ge=0)
    abs_np_par: int | None = Field(default=None, ge=0)
    nbr_de_retard: int | None = Field(default=None, ge=0)
    heurs_sup: int | None = Field(default=None, ge=0)
    moin: str | None = None
    jour: str | None = None
    full_name: str | None = None
    nom: str | None = None
    prenom: str | None = None
    fonction_sap: str | None = None
    centre_cout: str | None = None
    groupe: str | None = None
    contre_maitre: str | None = None
    segment: str | None = None
    gender: str | None = None
    num_tel: str | None = None
    date_recrutement: str | None = None
    anciennete: int | None = Field(default=None, ge=0)

    @field_validator(
        "matricule",
        "nature",
        "entree_sorie",
        "motif",
        "full_name",
        "nom",
        "prenom",
        "fonction_sap",
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
    def _normalize_text_fields(cls, value: Any) -> str | None:
        return _clean_text(value)

    @field_validator(
        "heures_de_presences",
        "eff_actif",
        "eff_presente",
        "eff_mr",
        "abs_p_par_per",
        "abs_np_par",
        "nbr_de_retard",
        "heurs_sup",
        "anciennete",
        mode="before",
    )
    @classmethod
    def _normalize_integer_fields(cls, value: Any) -> int | None:
        return _parse_optional_int(value)

    @field_validator("moin", mode="before")
    @classmethod
    def _normalize_month_field(cls, value: Any) -> str | None:
        return _normalize_month(value)

    @field_validator("jour", mode="before")
    @classmethod
    def _normalize_day_field(cls, value: Any) -> str | None:
        return _normalize_day(value)


class HistoryPreviewRow(BaseModel):
    model_config = ConfigDict(extra="forbid")

    row_index: int
    source_row_number: int
    is_valid: bool
    import_action: Literal["insert", "update", "invalid"]
    display_date: str | None = None
    collaborateur_nom: str | None = None
    errors: list[str] = Field(default_factory=list)
    row: HistoryImportRow


class HistoryPreviewResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    file_name: str | None = None
    columns_detected: list[str] = Field(default_factory=list)
    mapping_used: dict[str, str] = Field(default_factory=dict)
    rows: list[HistoryPreviewRow] = Field(default_factory=list)
    rows_count: int = 0
    valid_rows_count: int = 0
    invalid_rows_count: int = 0
    insert_rows_count: int = 0
    update_rows_count: int = 0


class HistoryImportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    rows: list[HistoryImportRow] = Field(default_factory=list)
