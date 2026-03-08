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
    "contre_maitre",
    "segment",
    "num_tel",
    "date_recrutement",
    "anciennete",
    "formation_id",
    "formation_label",
    "statut",
    "date_association_systeme",
    "date_completion",
    "etat_qualification",
    "score",
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
    "fonction": ["fonction", "job", "role", "position", "Fonction SAP", "Plugins - Fonction selon PF"],
    "centre_cout": ["centre_cout", "cc", "cost_center", "costcentre"],
    "groupe": ["groupe", "group", "gr", "Plugins - Group"],
    "contre_maitre": ["contre_maitre", "supervisor", "Contre maitre", "team_lead", "Rh seg"],
    "segment": ["segment", "department", "division", "seg", "Plugins - seg"],
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
    "competence": [
        "competence",
        "skill",
        "qualification",
        "competency",
        "Plugins - Name_competence",
    ],
    "statut": ["statut", "status", "Plugins - status", "training_status", "qualification_status"],
    "date_association_systeme": [
        "date_association_systeme",
        "Plugins - date d'association systeme",
        "date_association",
        "assigned_date",
    ],
    "date_completion": ["date_completion", "completion_date", "date_fin", "completed_at"],
    "score": ["score", "resultat", "note", "score_final"],
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

    nomprenom_aliases = aliases_by_field.get("nomprenom", [])
    if nomprenom_aliases:
        alias_set = {normalize_header(alias) for alias in nomprenom_aliases}
        for header, normalized in normalized_headers.items():
            if normalized in alias_set:
                mapping["nomprenom"] = header
                break

    competence_aliases = aliases_by_field.get("competence", [])
    if competence_aliases:
        alias_set = {normalize_header(alias) for alias in competence_aliases}
        for header, normalized in normalized_headers.items():
            if normalized in alias_set:
                mapping["competence"] = header
                break

    return mapping


def _looks_mostly_numeric(series: pd.Series) -> bool:
    sample = [str(value).strip() for value in series.dropna().head(20).tolist() if str(value).strip()]
    if not sample:
        return False
    numeric_like = 0
    for value in sample:
        compact = value.replace(".", "", 1)
        if compact.isdigit():
            numeric_like += 1
    return numeric_like / len(sample) >= 0.6


def _refine_name_mapping(
    dataframe: pd.DataFrame,
    mapping_used: dict[str, str],
    synonyms: dict[str, list[str]],
) -> dict[str, str]:
    current_header = mapping_used.get("nom")
    if not current_header:
        return mapping_used

    if not _looks_mostly_numeric(dataframe[current_header]):
        return mapping_used

    candidate_aliases = {
        normalize_header(alias)
        for alias in synonyms.get("nom", [])
        if normalize_header(alias) != normalize_header(current_header)
    }
    for header in dataframe.columns.tolist():
        normalized = normalize_header(str(header))
        if normalized not in candidate_aliases:
            continue
        if not _looks_mostly_numeric(dataframe[header]):
            mapping_used["nom"] = str(header)
            return mapping_used
    return mapping_used


def _as_clean_string(value: Any) -> str | None:
    if value is None or pd.isna(value):
        return None
    if isinstance(value, pd.Timestamp):
        return value.strftime("%Y-%m-%d")
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


def _as_optional_score(value: Any) -> float | None:
    if value is None or pd.isna(value):
        return None
    try:
        return round(float(str(value).strip().replace(",", ".")), 2)
    except ValueError:
        return None


def _as_iso_date(value: Any) -> str | None:
    if value is None or pd.isna(value):
        return None
    parsed = pd.to_datetime(value, errors="coerce", dayfirst=True)
    if pd.isna(parsed):
        return None
    return parsed.date().isoformat()


def _split_prenom_nom(full_name: str | None) -> tuple[str | None, str | None]:
    if not full_name:
        return None, None
    parts = [part for part in full_name.strip().split() if part]
    if len(parts) < 2:
        return None, None
    return parts[0].title(), " ".join(parts[1:]).title()


def _parse_formation(value: Any) -> tuple[int | None, str | None]:
    text = _as_clean_string(value)
    if not text:
        return None, None

    match = re.match(r"^\s*(\d+)\s*[-:]\s*(.+?)\s*$", text)
    if match:
        return int(match.group(1)), match.group(2).strip()

    match = re.search(r"\b(\d{2,})\b", text)
    if match:
        return int(match.group(1)), text
    return None, text


def _normalize_statut(value: Any) -> str | None:
    normalized = normalize_header(str(value)) if value is not None and not pd.isna(value) else ""
    if not normalized:
        return None
    if normalized in {"completee", "complete", "completed", "terminee", "termine"}:
        return "Completee"
    if normalized in {"en_cours", "encours", "in_progress", "ongoing"}:
        return "En cours"
    return None


def _derive_etat_qualification(statut: str | None) -> str | None:
    if statut == "Completee":
        return "Qualifie"
    if statut == "En cours":
        return "En cours"
    return None


def parse_excel_to_rows(
    file_content: bytes,
    filename: str,
    synonyms: dict[str, list[str]] | None = None,
) -> tuple[list[str], dict[str, str], list[dict[str, Any]]]:
    file_name = (filename or "").lower()
    engine = "openpyxl" if file_name.endswith(".xlsx") else "xlrd"
    dataframe = pd.read_excel(BytesIO(file_content), dtype=object, engine=engine)
    columns_detected = [str(column) for column in dataframe.columns.tolist()]
    active_synonyms = synonyms or SYNONYMS
    mapping_used = infer_mapping(columns_detected, active_synonyms)
    mapping_used = _refine_name_mapping(dataframe, mapping_used, active_synonyms)

    rows: list[dict[str, Any]] = []
    for source_row in dataframe.to_dict(orient="records"):
        normalized_row: dict[str, Any] = {field: None for field in PREVIEW_FIELDS}

        for field in [
            "matricule",
            "nom",
            "prenom",
            "fonction",
            "centre_cout",
            "groupe",
            "contre_maitre",
            "segment",
            "num_tel",
            "date_recrutement",
        ]:
            header = mapping_used.get(field)
            normalized_row[field] = _as_clean_string(source_row.get(header)) if header else None

        anciennete_header = mapping_used.get("anciennete")
        normalized_row["anciennete"] = _as_optional_int(source_row.get(anciennete_header)) if anciennete_header else None

        formation_header = mapping_used.get("competence")
        formation_id, formation_label = _parse_formation(source_row.get(formation_header) if formation_header else None)
        normalized_row["formation_id"] = formation_id
        normalized_row["formation_label"] = formation_label
        normalized_row["competence"] = formation_label

        statut_header = mapping_used.get("statut")
        normalized_row["statut"] = _normalize_statut(source_row.get(statut_header)) if statut_header else None

        date_association_header = mapping_used.get("date_association_systeme")
        normalized_row["date_association_systeme"] = (
            _as_iso_date(source_row.get(date_association_header)) if date_association_header else None
        )

        date_completion_header = mapping_used.get("date_completion")
        normalized_row["date_completion"] = (
            _as_iso_date(source_row.get(date_completion_header)) if date_completion_header else None
        )

        if normalized_row["statut"] == "Completee" and not normalized_row["date_completion"]:
            normalized_row["date_completion"] = normalized_row["date_association_systeme"]

        normalized_row["etat_qualification"] = _derive_etat_qualification(normalized_row["statut"])
        normalized_row["etat"] = normalized_row["etat_qualification"]

        score_header = mapping_used.get("score")
        normalized_row["score"] = _as_optional_score(source_row.get(score_header)) if score_header else None

        if not normalized_row.get("prenom") or not normalized_row.get("nom"):
            combined_header = mapping_used.get("nomprenom")
            combined_value = _as_clean_string(source_row.get(combined_header)) if combined_header else None
            candidate = normalized_row.get("nom") or normalized_row.get("prenom") or combined_value
            split_prenom, split_nom = _split_prenom_nom(candidate)
            if split_prenom and split_nom:
                normalized_row["prenom"] = normalized_row.get("prenom") or split_prenom
                normalized_row["nom"] = normalized_row.get("nom") or split_nom

        has_identity = bool(normalized_row.get("matricule")) or bool(
            normalized_row.get("prenom") and normalized_row.get("nom")
        )
        if not has_identity:
            continue
        if normalized_row.get("formation_id") is None:
            continue

        rows.append(normalized_row)

    return columns_detected, mapping_used, rows
