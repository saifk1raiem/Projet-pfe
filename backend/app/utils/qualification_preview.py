from __future__ import annotations

import re
import unicodedata
from io import BytesIO
from typing import Any

import pandas as pd


PREVIEW_FIELDS = [
    "matricule",
    "nom",
    "prenom",
    "fonction",
    "centre_cout",
    "groupe",
    "competence",
    "contre_maitre",
    "segment",
    "gender",
    "num_tel",
    "date_recrutement",
    "anciennete",
    "etat",
]

SYNONYMS: dict[str, list[str]] = {
    "matricule": ["matricule", "mat", "id", "code", "Plugins - matricule", "emp_id"],
    "nom": ["nom", "Plugins - name", "surname", "family_name"],
    "prenom": ["prenom", "first_name", "Plugins - first name"],
    "nomprenom": [
        "nom_prenom",
        "nom_&_prenom",
        "nom_prenom2",
        "collaborateur_nom_&_prenom",
        "collaborateur_nom_prenom",
    ],
    "fonction": ["fonction", "job", "role", "position", "Fonction SAP"],
    "centre_cout": ["centre_cout", "cc", "cost_center", "costcentre"],
    "groupe": ["groupe", "group", "gr"],
    "competence": ["competence", "skill", "qualification", "competency"],
    "contre_maitre": ["contre_maitre", "supervisor", "Contre maitre", "team_lead", "Rh seg"],
    "segment": ["segment", "department", "division", "seg"],
    "gender": ["gender", "sexe", "sex"],
    "num_tel": ["num_tel", "telephone", "phone", "tel", "num tel"],
    "date_recrutement": [
        "date_recrutement",
        "Date recrutement",
        "date_embauche",
        "recruitment_date",
        "date_entree",
        "date_dentree",
        "date_d'association",
        "date_association",
    ],
    "anciennete": ["anciennete", "seniority", "years", "years_of_service"],
    "etat": ["etat", "status", "Niveau de formation", "qualification_status", "etat_qualifie", "etatqualifies"],
}


def normalize_header(value: str) -> str:
    text = unicodedata.normalize("NFKD", str(value))
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = text.strip().lower()
    text = re.sub(r"[^a-z0-9\s_]", "", text)
    text = re.sub(r"\s+", "_", text)
    return text


def infer_mapping(headers: list[str], synonyms: dict[str, list[str]] | None = None) -> dict[str, str]:
    aliases_by_field = synonyms or SYNONYMS
    normalized_headers = {header: normalize_header(header) for header in headers}
    mapping: dict[str, str] = {}
    used_headers: set[str] = set()

    for field in PREVIEW_FIELDS:
        aliases = aliases_by_field.get(field, [])
        alias_set = {normalize_header(field), *(normalize_header(alias) for alias in aliases)}
        for header, normalized in normalized_headers.items():
            if header in used_headers:
                continue
            if normalized in alias_set:
                mapping[field] = header
                used_headers.add(header)
                break

    # Optional combined full-name column; split later into prenom + nom.
    nomprenom_aliases = aliases_by_field.get("nomprenom", [])
    if nomprenom_aliases:
        alias_set = {normalize_header(alias) for alias in nomprenom_aliases}
        for header, normalized in normalized_headers.items():
            if normalized in alias_set:
                mapping["nomprenom"] = header
                break

    return mapping


def normalize_status(value: Any) -> str | None:
    if value is None or pd.isna(value):
        return None
    normalized = normalize_header(str(value))
    if not normalized:
        return None

    if normalized in {"en_cours", "encours", "in_progress", "ongoing"}:
        return "En cours"
    if normalized in {"non_associee", "non_associe", "non_assoce", "non_associated", "non_assigned"}:
        return "Non associe"
    if normalized in {"depassement", "depasse", "overdue", "expired"}:
        return "Depassement"
    if normalized in {"qualifie", "qualified"}:
        return "Qualifie"
    return None


def _as_clean_string(value: Any) -> str | None:
    if value is None or pd.isna(value):
        return None
    if isinstance(value, pd.Timestamp):
        return value.strftime("%Y-%m-%d")
    text = str(value).strip()
    return text or None


def _as_optional_duration(value: Any) -> str | int | float | None:
    if value is None or pd.isna(value):
        return None
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, (int, float)):
        return value
    text = str(value).strip()
    return text or None


def _as_optional_int(value: Any) -> int | None:
    if value is None or pd.isna(value):
        return None
    try:
        text = str(value).strip()
        if not text:
            return None
        if "." in text:
            return int(float(text))
        return int(text)
    except ValueError:
        return None


def _split_prenom_nom(full_name: str | None) -> tuple[str | None, str | None]:
    if not full_name:
        return None, None
    parts = [part for part in full_name.strip().split() if part]
    if len(parts) < 2:
        return None, None
    prenom = parts[0].title()
    nom = " ".join(parts[1:]).title()
    return prenom, nom


def _compute_etat(date_recrutement: str | None, provided_status: Any) -> str | None:
    parsed = pd.to_datetime(date_recrutement, errors="coerce", dayfirst=True) if date_recrutement else pd.NaT
    if not pd.isna(parsed):
        days = (pd.Timestamp.now() - parsed).days
        if days > 30:
            return "Depassement"

    explicit = normalize_status(provided_status)
    if explicit in {"En cours", "Qualifie", "Non associe"}:
        return explicit
    if not pd.isna(parsed):
        return "En cours"
    return explicit


def parse_excel_to_rows(file_content: bytes, filename: str) -> tuple[list[str], dict[str, str], list[dict[str, Any]]]:
    file_name = (filename or "").lower()
    engine = "openpyxl" if file_name.endswith(".xlsx") else "xlrd"
    dataframe = pd.read_excel(BytesIO(file_content), dtype=object, engine=engine)
    columns_detected = [str(column) for column in dataframe.columns.tolist()]
    mapping_used = infer_mapping(columns_detected, SYNONYMS)

    rows: list[dict[str, Any]] = []
    for source_row in dataframe.to_dict(orient="records"):
        normalized_row: dict[str, Any] = {field: None for field in PREVIEW_FIELDS}
        source_status = None
        status_header = mapping_used.get("etat")

        for field in PREVIEW_FIELDS:
            source_header = mapping_used.get(field)
            raw_value = source_row.get(source_header) if source_header else None
            if field == "etat":
                source_status = raw_value

            if field == "etat":
                normalized_row[field] = None
            elif field == "anciennete":
                normalized_row[field] = _as_optional_int(raw_value)
            else:
                normalized_row[field] = _as_clean_string(raw_value)

        if status_header and source_status is None:
            source_status = source_row.get(status_header)

        # Handle files where "prenom nom" is present in a single name column.
        if not normalized_row.get("prenom") or not normalized_row.get("nom"):
            combined_header = mapping_used.get("nomprenom")
            combined_value = _as_clean_string(source_row.get(combined_header)) if combined_header else None
            candidate = normalized_row.get("nom") or normalized_row.get("prenom") or combined_value
            split_prenom, split_nom = _split_prenom_nom(candidate)
            if split_prenom and split_nom:
                normalized_row["prenom"] = normalized_row.get("prenom") or split_prenom
                normalized_row["nom"] = normalized_row.get("nom") or split_nom

        normalized_row["etat"] = _compute_etat(normalized_row.get("date_recrutement"), source_status)

        has_identity = bool(normalized_row.get("matricule")) or bool(
            normalized_row.get("prenom") and normalized_row.get("nom")
        )
        if not has_identity:
            continue
        if not any(value is not None for value in normalized_row.values()):
            continue
        rows.append(normalized_row)

    return columns_detected, mapping_used, rows
