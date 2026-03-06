from __future__ import annotations

from datetime import datetime
import re
import unicodedata
from typing import Any

import pandas as pd

DB_FIELDS = [
    "matricule",
    "nom",
    "prenom",
    "fonction",
    "centre_cout",
    "groupe",
    "competence",
    "contre_maitre",
    "segment",
    "num_tel",
    "date_recrutement",
    "anciennete",
]

REQUIRED_FIELDS = ["matricule", "nom", "prenom"]

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


def normalize_header(header: str) -> str:
    text = unicodedata.normalize("NFKD", str(header))
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = text.strip().lower()
    text = re.sub(r"\s+", "_", text)
    text = re.sub(r"[^a-z0-9_]", "", text)
    return text


def infer_mapping(headers: list[str], synonyms: dict[str, list[str]] | None = None) -> tuple[dict[str, str], list[str]]:
    aliases_by_field = synonyms or SYNONYMS
    normalized_headers = {header: normalize_header(header) for header in headers}
    used_headers: set[str] = set()
    mapping: dict[str, str] = {}

    # First pass: exact alias matches to reduce ambiguity.
    for field, aliases in aliases_by_field.items():
        alias_set = {normalize_header(field), *(normalize_header(alias) for alias in aliases)}
        for original, normalized in normalized_headers.items():
            if original in used_headers:
                continue
            if normalized in alias_set:
                mapping[field] = original
                used_headers.add(original)
                break

    # Second pass: best-effort fuzzy match by containment and token overlap.
    for field, aliases in aliases_by_field.items():
        if field in mapping:
            continue

        alias_set = [normalize_header(field), *(normalize_header(alias) for alias in aliases)]
        best_header: str | None = None
        best_score = 0.0

        for original, normalized in normalized_headers.items():
            if original in used_headers or not normalized:
                continue

            score = 0.0
            for alias in alias_set:
                if not alias:
                    continue
                if normalized == alias:
                    score = max(score, 100.0)
                    continue
                if alias in normalized or normalized in alias:
                    score = max(score, 80.0)

                header_tokens = set(normalized.split("_"))
                alias_tokens = set(alias.split("_"))
                union = header_tokens | alias_tokens
                if union:
                    overlap = len(header_tokens & alias_tokens) / len(union)
                    score = max(score, overlap * 70.0)

            if score > best_score:
                best_score = score
                best_header = original

        if best_header and best_score >= 55.0:
            mapping[field] = best_header
            used_headers.add(best_header)

    unmapped_headers = [header for header in headers if header not in used_headers]
    return mapping, unmapped_headers


def _none_if_nan(value: Any) -> Any:
    if value is None:
        return None
    if pd.isna(value):
        return None
    return value


def _as_clean_string(value: Any) -> str | None:
    value = _none_if_nan(value)
    if value is None:
        return None
    cleaned = str(value).strip()
    return cleaned or None


def _parse_anciennete(value: Any) -> int | None:
    value = _none_if_nan(value)
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None

    try:
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


def _infer_anciennete_from_date(date_text: str | None) -> int | None:
    if not date_text:
        return None

    parsed = pd.to_datetime(date_text, errors="coerce", dayfirst=True)
    if pd.isna(parsed):
        return None

    delta_days = (datetime.now() - parsed.to_pydatetime()).days
    if delta_days < 0:
        return 0
    return int(delta_days // 365)


def clean_row(row: dict[str, Any], mapping: dict[str, str]) -> dict[str, Any]:
    cleaned: dict[str, Any] = {field: None for field in DB_FIELDS}

    for field in DB_FIELDS:
        source_header = mapping.get(field)
        raw_value = row.get(source_header) if source_header else None
        raw_value = _none_if_nan(raw_value)

        if field == "matricule":
            value = _as_clean_string(raw_value)
            cleaned[field] = value
            continue

        if field in {"nom", "prenom"}:
            value = _as_clean_string(raw_value)
            cleaned[field] = value.title() if value else None
            continue

        if field == "num_tel":
            value = _as_clean_string(raw_value)
            cleaned[field] = re.sub(r"\s+", "", value) if value else None
            continue

        if field == "date_recrutement":
            cleaned[field] = _as_clean_string(raw_value)
            continue

        if field == "anciennete":
            cleaned[field] = _parse_anciennete(raw_value)
            continue

        cleaned[field] = _as_clean_string(raw_value)

    if cleaned["anciennete"] is None:
        cleaned["anciennete"] = _infer_anciennete_from_date(cleaned["date_recrutement"])

    # Some files provide a single "prenom nom" value; split when one side is missing.
    if not cleaned["prenom"] or not cleaned["nom"]:
        candidate = cleaned["nom"] or cleaned["prenom"]
        split_prenom, split_nom = _split_prenom_nom(candidate)
        if split_prenom and split_nom:
            cleaned["prenom"] = cleaned["prenom"] or split_prenom
            cleaned["nom"] = cleaned["nom"] or split_nom

    return cleaned

