from __future__ import annotations

from collections.abc import Iterable, Sequence
from io import BytesIO, StringIO
import re
import unicodedata
from typing import Any

import pandas as pd
from pydantic import BaseModel, ConfigDict, Field

from app.schemas.extraction_contract import (
    ExtractedCollaboratorRow,
    TARGET_SCHEMA_COLUMNS,
)


DEFAULT_EXTRACTION_SYNONYMS: dict[str, list[str]] = {
    "matricule": [
        "matricule",
        "mat",
        "matr",
        "id",
        "id employe",
        "employee id",
        "emp id",
        "code employe",
        "code",
    ],
    "nom": [
        "nom",
        "surname",
        "last name",
        "family name",
    ],
    "prenom": [
        "prenom",
        "first name",
        "given name",
    ],
    "full_name": [
        "nom & prenom",
        "nom et prenom",
        "nom prenom",
        "full name",
        "employee name",
        "collaborateur",
        "collaborator",
    ],
    "fonction_sap": [
        "fonction sap",
        "fonction",
        "poste",
        "job",
        "role",
        "position",
        "sap function",
        "job title",
    ],
    "centre_cout": [
        "centre cout",
        "centre de cout",
        "cc",
        "cost center",
        "cost centre",
    ],
    "groupe": [
        "groupe",
        "group",
        "gr",
        "team",
    ],
    "competence": [
        "competence",
        "formation",
        "qualification",
        "skill",
        "competency",
    ],
    "formateur": [
        "formateur",
        "formatrice",
        "formatrice rh",
        "trainer",
        "instructor",
    ],
    "contre_maitre": [
        "contre maitre",
        "contre_maitre",
        "supervisor",
        "team lead",
        "chef d equipe",
    ],
    "segment": [
        "segment",
        "department",
        "departement",
        "division",
        "service",
    ],
    "gender": [
        "gender",
        "genre",
        "sexe",
        "sex",
    ],
    "num_tel": [
        "num tel",
        "num_tel",
        "telephone",
        "phone",
        "mobile",
        "gsm",
        "tel",
    ],
    "date_recrutement": [
        "date recrutement",
        "date de recrutement",
        "date embauche",
        "date d embauche",
        "hire date",
        "recruitment date",
        "joining date",
        "date entree",
        "date d entree",
    ],
    "anciennete": [
        "anciennete",
        "seniority",
        "years of service",
        "tenure",
        "years",
    ],
}

SUPPORTED_UPLOAD_EXTENSIONS = (".xlsx", ".xls", ".csv")
CSV_ENCODINGS = ("utf-8-sig", "utf-8", "cp1252", "latin-1")
_TEXT_FIELDS = {
    "matricule",
    "nom",
    "prenom",
    "full_name",
    "fonction_sap",
    "centre_cout",
    "groupe",
    "competence",
    "formateur",
    "contre_maitre",
    "segment",
}
_GENDER_VALUES = {"m", "male", "homme", "masculin", "f", "female", "femme", "feminin"}
_PHONE_RE = re.compile(r"^\+?[0-9][0-9\s().-]{5,}$")


class ParsedSheet(BaseModel):
    model_config = ConfigDict(extra="forbid")

    name: str | None = None
    columns: list[str] = Field(default_factory=list)
    rows: list[dict[str, Any]] = Field(default_factory=list)


class ExtractionMappingResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    sheet_name: str | None = None
    columns_detected: list[str] = Field(default_factory=list)
    mapping_used: dict[str, str] = Field(default_factory=dict)
    rows: list[ExtractedCollaboratorRow] = Field(default_factory=list)


def _is_missing(value: Any) -> bool:
    return value is None or bool(pd.isna(value))


def normalize_header(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value))
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = text.casefold().strip()
    text = re.sub(r"[^a-z0-9\s_]", " ", text)
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def _tokenize(value: str) -> set[str]:
    return {token for token in re.split(r"[\s_]+", value) if token}


def _iter_non_empty_values(rows: Sequence[dict[str, Any]], header: str, limit: int = 25) -> list[str]:
    values: list[str] = []
    for row in rows:
        value = row.get(header)
        if _is_missing(value):
            continue
        text = str(value).strip()
        if not text or text.casefold() in {"null", "nan"}:
            continue
        values.append(text)
        if len(values) >= limit:
            break
    return values


def _header_similarity_score(header: str, aliases: Iterable[str]) -> float:
    normalized_header = normalize_header(header)
    if not normalized_header:
        return 0.0

    header_tokens = _tokenize(normalized_header)
    best_score = 0.0

    for alias in aliases:
        normalized_alias = normalize_header(alias)
        if not normalized_alias:
            continue

        if normalized_header == normalized_alias:
            return 100.0

        score = 0.0
        if normalized_alias in normalized_header or normalized_header in normalized_alias:
            score = max(score, 84.0)

        alias_tokens = _tokenize(normalized_alias)
        union = header_tokens | alias_tokens
        if union:
            overlap = len(header_tokens & alias_tokens) / len(union)
            score = max(score, overlap * 72.0)

        if score > best_score:
            best_score = score

    return best_score


def _content_score(field: str, rows: Sequence[dict[str, Any]], header: str) -> float:
    values = _iter_non_empty_values(rows, header)
    if not values:
        return 0.0

    if field == "anciennete":
        valid = 0
        for value in values:
            try:
                years = int(float(value))
            except ValueError:
                continue
            if 0 <= years <= 100:
                valid += 1
        return (valid / len(values)) * 20.0

    if field == "date_recrutement":
        valid = 0
        for value in values:
            if re.fullmatch(r"\d{4}-\d{2}-\d{2}", value) or re.fullmatch(r"\d{1,2}[/-]\d{1,2}[/-]\d{2,4}", value):
                valid += 1
        return (valid / len(values)) * 20.0

    if field == "gender":
        valid = sum(1 for value in values if normalize_header(value) in _GENDER_VALUES)
        return (valid / len(values)) * 20.0

    if field == "num_tel":
        valid = sum(1 for value in values if _PHONE_RE.fullmatch(value.replace("  ", " ")))
        return (valid / len(values)) * 18.0

    if field == "matricule":
        valid = 0
        for value in values:
            compact = re.sub(r"\s+", "", value)
            if 2 <= len(compact) <= 20 and re.fullmatch(r"[A-Za-z0-9._/-]+", compact):
                valid += 1
        return (valid / len(values)) * 16.0

    if field == "full_name":
        multi_word = sum(1 for value in values if len(value.split()) >= 2)
        return (multi_word / len(values)) * 14.0

    if field in _TEXT_FIELDS:
        non_numeric = sum(1 for value in values if not re.fullmatch(r"[0-9.\-_/ ]+", value))
        return (non_numeric / len(values)) * 8.0

    return 0.0


def infer_mapping(
    columns: Sequence[str],
    rows: Sequence[dict[str, Any]],
    synonyms: dict[str, list[str]] | None = None,
) -> dict[str, str]:
    aliases_by_field = synonyms or DEFAULT_EXTRACTION_SYNONYMS
    mapping: dict[str, str] = {}
    used_headers: set[str] = set()

    candidate_fields = [
        "matricule",
        "nom",
        "prenom",
        "full_name",
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

    for field in candidate_fields:
        best_header: str | None = None
        best_score = 0.0
        aliases = [field, *aliases_by_field.get(field, [])]

        for header in columns:
            if header in used_headers:
                continue
            score = _header_similarity_score(header, aliases) + _content_score(field, rows, header)
            if score > best_score:
                best_score = score
                best_header = header

        minimum_score = 74.0 if field in {"matricule", "full_name", "date_recrutement", "anciennete", "gender"} else 68.0
        if best_header and best_score >= minimum_score:
            mapping[field] = best_header
            used_headers.add(best_header)

    return mapping


def _clean_source_value(value: Any) -> str | None:
    if _is_missing(value):
        return None
    text = str(value).strip()
    if not text or text.casefold() in {"null", "nan"}:
        return None
    return re.sub(r"\s+", " ", text)


def _split_full_name(full_name: str | None) -> tuple[str | None, str | None]:
    if not full_name:
        return None, None

    parts = [part for part in full_name.split() if part]
    if not parts:
        return None, None
    if len(parts) == 1:
        return parts[0], None
    return parts[0], " ".join(parts[1:])


def _build_row(source_row: dict[str, Any], mapping: dict[str, str]) -> ExtractedCollaboratorRow:
    cleaned: dict[str, Any] = {field: None for field in TARGET_SCHEMA_COLUMNS}

    direct_fields = {
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
    }
    for field in direct_fields:
        header = mapping.get(field)
        cleaned[field] = _clean_source_value(source_row.get(header)) if header else None

    full_name_header = mapping.get("full_name")
    full_name_value = _clean_source_value(source_row.get(full_name_header)) if full_name_header else None

    if not cleaned["nom"] and full_name_value:
        split_nom, split_prenom = _split_full_name(full_name_value)
        cleaned["nom"] = split_nom
        cleaned["prenom"] = split_prenom
    elif cleaned["nom"] and not cleaned["prenom"]:
        split_nom, split_prenom = _split_full_name(cleaned["nom"])
        cleaned["nom"] = split_nom
        cleaned["prenom"] = split_prenom
    elif cleaned["prenom"] and not cleaned["nom"]:
        split_nom, split_prenom = _split_full_name(cleaned["prenom"])
        cleaned["nom"] = split_nom
        cleaned["prenom"] = split_prenom

    return ExtractedCollaboratorRow.model_validate(cleaned)


def _sheet_relevance_score(sheet: ParsedSheet, synonyms: dict[str, list[str]] | None = None) -> tuple[int, int, int]:
    mapping = infer_mapping(sheet.columns, sheet.rows, synonyms=synonyms)
    has_identity = int(bool(mapping.get("matricule") or mapping.get("full_name") or mapping.get("nom")))
    matched_targets = sum(1 for field in TARGET_SCHEMA_COLUMNS if field in mapping)
    return (matched_targets, has_identity, len(sheet.rows))


def _sheet_has_relevant_data(sheet: ParsedSheet, synonyms: dict[str, list[str]] | None = None) -> bool:
    matched_targets, has_identity, row_count = _sheet_relevance_score(sheet, synonyms=synonyms)
    return row_count > 0 and matched_targets > 0 and has_identity > 0


def select_best_sheet(
    sheets: Sequence[ParsedSheet | dict[str, Any]],
    synonyms: dict[str, list[str]] | None = None,
) -> ParsedSheet:
    normalized_sheets = [sheet if isinstance(sheet, ParsedSheet) else ParsedSheet.model_validate(sheet) for sheet in sheets]
    if not normalized_sheets:
        return ParsedSheet()

    best_sheet = max(normalized_sheets, key=lambda item: _sheet_relevance_score(item, synonyms=synonyms))
    return best_sheet


def transform_parsed_sheet(
    columns: Sequence[str],
    rows: Sequence[dict[str, Any]],
    *,
    sheet_name: str | None = None,
    synonyms: dict[str, list[str]] | None = None,
) -> ExtractionMappingResult:
    columns_detected = [str(column) for column in columns]
    mapping = infer_mapping(columns_detected, rows, synonyms=synonyms)
    normalized_rows = [_build_row(row, mapping) for row in rows]
    return ExtractionMappingResult(
        sheet_name=sheet_name,
        columns_detected=columns_detected,
        mapping_used=mapping,
        rows=normalized_rows,
    )


def transform_parsed_workbook(
    sheets: Sequence[ParsedSheet | dict[str, Any]],
    *,
    synonyms: dict[str, list[str]] | None = None,
) -> ExtractionMappingResult:
    normalized_sheets = [sheet if isinstance(sheet, ParsedSheet) else ParsedSheet.model_validate(sheet) for sheet in sheets]
    if not normalized_sheets:
        return ExtractionMappingResult()

    combined_columns: list[str] = []
    combined_mapping: dict[str, str] = {}
    combined_rows: list[ExtractedCollaboratorRow] = []
    used_sheet_names: list[str] = []

    for sheet in normalized_sheets:
        if not _sheet_has_relevant_data(sheet, synonyms=synonyms):
            continue

        result = transform_parsed_sheet(
            sheet.columns,
            sheet.rows,
            sheet_name=sheet.name,
            synonyms=synonyms,
        )

        if not result.rows and not result.mapping_used:
            continue

        if sheet.name:
            used_sheet_names.append(sheet.name)

        for column in result.columns_detected:
            if column not in combined_columns:
                combined_columns.append(column)

        for field, header in result.mapping_used.items():
            if field not in combined_mapping:
                combined_mapping[field] = header

        combined_rows.extend(result.rows)

    if combined_rows or combined_mapping:
        sheet_name = ", ".join(used_sheet_names) if used_sheet_names else None
        return ExtractionMappingResult(
            sheet_name=sheet_name,
            columns_detected=combined_columns,
            mapping_used=combined_mapping,
            rows=combined_rows,
        )

    best_sheet = select_best_sheet(normalized_sheets, synonyms=synonyms)
    return transform_parsed_sheet(
        best_sheet.columns,
        best_sheet.rows,
        sheet_name=best_sheet.name,
        synonyms=synonyms,
    )


def _read_csv_dataframe(file_content: bytes) -> pd.DataFrame:
    decoded_content: str | None = None
    last_error: Exception | None = None

    for encoding in CSV_ENCODINGS:
        try:
            decoded_content = file_content.decode(encoding)
            break
        except UnicodeDecodeError as exc:
            last_error = exc

    if decoded_content is None:
        raise last_error or ValueError("Unable to decode CSV file")

    for separator in (None, ";", ",", "\t"):
        options = {
            "dtype": object,
            "engine": "python",
            "skipinitialspace": True,
        }
        if separator is None:
            options["sep"] = None
        else:
            options["sep"] = separator

        try:
            return pd.read_csv(StringIO(decoded_content), **options)
        except (pd.errors.ParserError, ValueError) as exc:
            last_error = exc

    raise last_error or ValueError("Invalid CSV file")


def read_uploaded_sheets(file_content: bytes, filename: str) -> list[ParsedSheet]:
    file_name = (filename or "").lower()

    if file_name.endswith(".csv"):
        dataframe = _read_csv_dataframe(file_content)
        return [
            ParsedSheet(
                name="Sheet1",
                columns=[str(column) for column in dataframe.columns.tolist()],
                rows=dataframe.to_dict(orient="records"),
            )
        ]

    engine = "openpyxl" if file_name.endswith(".xlsx") else "xlrd"
    workbook = pd.read_excel(BytesIO(file_content), dtype=object, engine=engine, sheet_name=None)
    if isinstance(workbook, pd.DataFrame):
        workbook = {"Sheet1": workbook}

    sheets: list[ParsedSheet] = []
    for sheet_name, dataframe in workbook.items():
        sheets.append(
            ParsedSheet(
                name=str(sheet_name),
                columns=[str(column) for column in dataframe.columns.tolist()],
                rows=dataframe.to_dict(orient="records"),
            )
        )
    return sheets
