from __future__ import annotations

from collections.abc import Iterable
from datetime import date
import re
import unicodedata
from io import BytesIO, StringIO
from typing import Any

import pandas as pd


PREVIEW_FIELDS = [
    "matricule",
    "nom",
    "prenom",
    "fonction",
    "centre_cout",
    "groupe",
    "formateur",
    "motif",
    "contre_maitre",
    "segment",
    "num_tel",
    "formation_id",
    "formation_label",
    "statut",
    "etat",
    "date_association_systeme",
    "score",
    "date_recrutement",
    "anciennete",
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
    ],
    "anciennete": ["anciennete", "seniority", "years", "years_of_service"],
    "competence": [
        "competence",
        "skill",
        "qualification",
        "competency",
        "Plugins - Name_competence",
    ],
    "formateur": ["formateur", "trainer", "instructor", "Plugins - Formateur"],
    "motif": ["motif", "reason", "cause", "remarque", "commentaire", "comment"],
    "statut": ["statut", "status", "Plugins - status", "training_status", "qualification_status", "etat"],
    "etat": ["etat", "status", "Niveau de formation", "qualification_status", "etat_qualifie", "etatqualifies"],
    "date_association_systeme": [
        "date_association_systeme",
        "Plugins - date d'association systeme",
        "date_association",
        "date d'association",
        "assigned_date",
    ],
    "date_association_day": [
        "jour",
        "day",
        "jour_association",
        "date_association_jour",
        "association_day",
    ],
    "date_association_month": [
        "mois",
        "month",
        "mois_association",
        "date_association_mois",
        "association_month",
    ],
    "date_association_year": [
        "annee",
        "année",
        "year",
        "annee_association",
        "date_association_annee",
        "association_year",
    ],
    "score": ["score", "resultat", "note", "score_final"],
}

SUPPORTED_UPLOAD_EXTENSIONS = (".xlsx", ".xls", ".csv")
CSV_ENCODINGS = ("utf-8-sig", "utf-8", "cp1252", "latin-1")
MONTH_NAME_TO_NUMBER = {
    "janvier": 1,
    "january": 1,
    "fevrier": 2,
    "february": 2,
    "mars": 3,
    "march": 3,
    "avril": 4,
    "april": 4,
    "mai": 5,
    "may": 5,
    "juin": 6,
    "june": 6,
    "juillet": 7,
    "july": 7,
    "aout": 8,
    "august": 8,
    "septembre": 9,
    "september": 9,
    "octobre": 10,
    "october": 10,
    "novembre": 11,
    "november": 11,
    "decembre": 12,
    "december": 12,
}


def _dedupe_aliases(values: Iterable[str]) -> list[str]:
    deduped: list[str] = []
    seen: set[str] = set()

    for value in values:
        if not isinstance(value, str):
            continue
        clean = value.strip()
        if not clean:
            continue
        token = clean.casefold()
        if token in seen:
            continue
        seen.add(token)
        deduped.append(clean)

    return deduped


def _merge_synonyms(overrides: dict[str, list[str]] | None) -> dict[str, list[str]]:
    merged = {field: list(aliases) for field, aliases in SYNONYMS.items()}
    if not isinstance(overrides, dict):
        return merged

    for field, aliases in overrides.items():
        if not isinstance(aliases, list):
            continue
        merged[field] = _dedupe_aliases([*merged.get(field, []), *aliases])

    # Keep "etat" aliases in sync with qualification status matching.
    etat_aliases = merged.get("etat", [])
    if etat_aliases:
        merged["statut"] = _dedupe_aliases([*merged.get("statut", []), *etat_aliases])
    return merged


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

    for date_part_field in ("date_association_day", "date_association_month", "date_association_year"):
        part_aliases = aliases_by_field.get(date_part_field, [])
        if not part_aliases:
            continue
        alias_set = {normalize_header(alias) for alias in part_aliases}
        for header, normalized in normalized_headers.items():
            if normalized in alias_set:
                mapping[date_part_field] = header
                break

    # Fallback for trainer columns with unexpected naming variants.
    if "formateur" not in mapping:
        for header, normalized in normalized_headers.items():
            if "formateur" in normalized or "trainer" in normalized:
                mapping["formateur"] = header
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


def _normalize_motif(value: Any) -> str | None:
    text = _as_clean_string(value)
    if not text:
        return None

    separators = [r"\r?\n", r"\s*;\s*", r"\s*\|\s*", r"\s*,\s*", r"\s*/\s*"]
    parts = [text]
    for separator in separators:
        next_parts: list[str] = []
        for part in parts:
            next_parts.extend(re.split(separator, part))
        parts = next_parts

    cleaned_parts = [part.strip() for part in parts if part and part.strip()]
    return cleaned_parts[-1] if cleaned_parts else text


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
    if isinstance(value, pd.Timestamp):
        return value.date().isoformat()
    text = str(value).strip()
    if re.fullmatch(r"\d{4}-\d{2}-\d{2}", text):
        return text
    short_match = re.fullmatch(r"(\d{1,2})[/-](\d{1,2})", text)
    if short_match:
        day_value = int(short_match.group(1))
        month_value = int(short_match.group(2))
        return _compose_partial_association_date(day_value, month_value, None)

    parsed = pd.to_datetime(value, errors="coerce", dayfirst=True)
    if pd.isna(parsed):
        return None
    return parsed.date().isoformat()


def _as_optional_date_part(value: Any) -> int | None:
    if value is None or pd.isna(value):
        return None
    text = str(value).strip()
    if not text:
        return None

    match = re.search(r"\d{1,4}", text)
    if match:
        try:
            return int(match.group(0))
        except ValueError:
            return None

    normalized = normalize_header(text)
    return MONTH_NAME_TO_NUMBER.get(normalized)


def _normalize_year(value: int | None) -> int | None:
    if value is None:
        return None
    if value < 100:
        return 2000 + value
    return value


def _compose_partial_association_date(
    day_value: int | None,
    month_value: int | None,
    year_value: int | None,
) -> str | None:
    if day_value is None or month_value is None:
        return None

    today = date.today()
    resolved_year = _normalize_year(year_value) or today.year

    try:
        candidate = date(resolved_year, month_value, day_value)
    except ValueError:
        return None

    if year_value is None and candidate > today:
        try:
            candidate = date(resolved_year - 1, month_value, day_value)
        except ValueError:
            return None

    return candidate.isoformat()


def _resolve_association_date(source_row: dict[str, Any], mapping_used: dict[str, str]) -> str | None:
    direct_header = mapping_used.get("date_association_systeme")
    direct_value = source_row.get(direct_header) if direct_header else None
    direct_date = _as_iso_date(direct_value)
    if direct_date:
        return direct_date

    day_value = _as_optional_date_part(source_row.get(mapping_used.get("date_association_day")))
    month_value = _as_optional_date_part(source_row.get(mapping_used.get("date_association_month")))
    year_value = _as_optional_date_part(source_row.get(mapping_used.get("date_association_year")))
    return _compose_partial_association_date(day_value, month_value, year_value)


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


def _normalize_etat(value: Any) -> str | None:
    normalized = normalize_header(str(value)) if value is not None and not pd.isna(value) else ""
    if not normalized:
        return None
    if normalized in {"qualifie", "qualifiee", "completee", "complete", "completed"}:
        return "Qualifie"
    if normalized in {"en_cours", "encours", "in_progress", "ongoing"}:
        return "En cours"
    if normalized in {"depassement", "overdue"}:
        return "Depassement"
    if normalized in {"non_associe", "non_associee"}:
        return "Non associee"
    return None


def _derive_etat(statut: str | None) -> str | None:
    if statut == "Completee":
        return "Qualifie"
    if statut == "En cours":
        return "En cours"
    return None


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


def _score_dataframe_relevance(dataframe: pd.DataFrame, synonyms: dict[str, list[str]]) -> tuple[int, int, int]:
    columns_detected = [str(column) for column in dataframe.columns.tolist()]
    if not columns_detected:
        return (0, 0, 0)

    mapping_used = infer_mapping(columns_detected, synonyms)
    identity_score = int(
        "matricule" in mapping_used or "nom" in mapping_used or "prenom" in mapping_used or "nomprenom" in mapping_used
    )
    qualification_score = int(
        "competence" in mapping_used or "statut" in mapping_used or "etat" in mapping_used
    )
    non_empty_rows = int(len(dataframe.index))
    return (len(mapping_used), identity_score + qualification_score, non_empty_rows)


def read_tabular_dataframe(
    file_content: bytes,
    filename: str,
    synonyms: dict[str, list[str]] | None = None,
) -> pd.DataFrame:
    file_name = (filename or "").lower()
    if file_name.endswith(".csv"):
        return _read_csv_dataframe(file_content)

    engine = "openpyxl" if file_name.endswith(".xlsx") else "xlrd"
    workbook = pd.read_excel(BytesIO(file_content), dtype=object, engine=engine, sheet_name=None)
    if isinstance(workbook, pd.DataFrame):
        return workbook

    active_synonyms = synonyms or SYNONYMS
    ranked_sheets = sorted(
        workbook.values(),
        key=lambda dataframe: _score_dataframe_relevance(dataframe, active_synonyms),
        reverse=True,
    )
    return ranked_sheets[0] if ranked_sheets else pd.DataFrame()


def parse_excel_to_rows(
    file_content: bytes,
    filename: str,
    synonyms: dict[str, list[str]] | None = None,
    *,
    require_formation: bool = True,
) -> tuple[list[str], dict[str, str], list[dict[str, Any]]]:
    active_synonyms = _merge_synonyms(synonyms)
    dataframe = read_tabular_dataframe(file_content, filename, synonyms=active_synonyms)
    columns_detected = [str(column) for column in dataframe.columns.tolist()]
    mapping_used = infer_mapping(columns_detected, active_synonyms)
    mapping_used = _refine_name_mapping(dataframe, mapping_used, active_synonyms)

    rows: list[dict[str, Any]] = []
    for source_row_number, source_row in enumerate(dataframe.to_dict(orient="records"), start=2):
        normalized_row: dict[str, Any] = {field: None for field in PREVIEW_FIELDS}
        normalized_row["__source_row_number"] = source_row_number

        for field in [
            "matricule",
            "nom",
            "prenom",
            "fonction",
            "centre_cout",
            "groupe",
            "formateur",
            "motif",
            "contre_maitre",
            "segment",
            "num_tel",
            "date_recrutement",
        ]:
            header = mapping_used.get(field)
            if not header:
                normalized_row[field] = None
            elif field == "motif":
                normalized_row[field] = _normalize_motif(source_row.get(header))
            else:
                normalized_row[field] = _as_clean_string(source_row.get(header))

        anciennete_header = mapping_used.get("anciennete")
        normalized_row["anciennete"] = _as_optional_int(source_row.get(anciennete_header)) if anciennete_header else None

        formation_header = mapping_used.get("competence")
        formation_id, formation_label = _parse_formation(source_row.get(formation_header) if formation_header else None)
        normalized_row["formation_id"] = formation_id
        normalized_row["formation_label"] = formation_label
        normalized_row["competence"] = formation_label

        statut_header = mapping_used.get("statut")
        statut_value = source_row.get(statut_header) if statut_header else None
        if not _as_clean_string(statut_value):
            etat_header = mapping_used.get("etat")
            statut_value = source_row.get(etat_header) if etat_header else None
        normalized_row["statut"] = _normalize_statut(statut_value)

        normalized_row["date_association_systeme"] = _resolve_association_date(source_row, mapping_used)

        etat_header = mapping_used.get("etat") or mapping_used.get("statut")
        normalized_row["etat"] = _normalize_etat(source_row.get(etat_header) if etat_header else None)
        if normalized_row["etat"] is None:
            normalized_row["etat"] = _derive_etat(normalized_row["statut"])

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
        if require_formation and normalized_row.get("formation_id") is None:
            continue

        rows.append(normalized_row)

    return columns_detected, mapping_used, rows
