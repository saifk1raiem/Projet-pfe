from __future__ import annotations

from collections import defaultdict
from datetime import date
from typing import Any

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.collaborateur import Collaborateur
from app.models.history import History
from app.schemas.extraction_contract import ExtractedCollaboratorRow
from app.schemas.history import HistoryImportRow, HistoryPreviewResponse, HistoryPreviewRow, row_has_absence_indicator
from app.services.collaborateur_import_service import upsert_collaborateur_rows
from app.services.excel_synonyms import get_excel_synonyms
from app.services.extraction_mapper import normalize_header, read_uploaded_sheets


SUPPORTED_HISTORY_UPLOAD_EXTENSIONS = (".xlsx",)
DEFAULT_HISTORY_SYNONYMS: dict[str, list[str]] = {
    "matricule": ["matricule", "mat", "code employe", "employee id", "emp id"],
    "nature": ["nature", "absence type", "type absence", "type", "motif absence"],
    "entree_sorie": ["entree sortie", "entree_sorie", "entree-sortie", "in out", "flux"],
    "heures_de_presences": [
        "heures de presences",
        "heures de presence",
        "heure presence",
        "heure_presence",
        "hours presence",
        "presence hours",
    ],
    "motif": ["motif", "reason", "cause", "commentaire", "comment"],
    "eff_actif": ["eff actif", "effectif actif", "eff_actif"],
    "eff_presente": ["eff presente", "effectif presente", "eff_presente"],
    "eff_mr": ["eff mr", "mr", "effectif mr", "eff_mr"],
    "abs_p_par_per": ["abs p par per", "abs_p_par_per", "absence payee", "abs p"],
    "abs_np_par": ["abs np par", "abs_np_par", "absence non payee", "abs np"],
    "nbr_de_retard": ["nbr de retard", "retard", "nombre de retard", "late count"],
    "heurs_sup": ["heurs sup", "heures sup", "heures supp", "heures supplementaires", "overtime"],
    "moin": ["moin", "mois", "month"],
    "jour": ["jour", "day"],
    "full_name": [
        "nom & prenom",
        "nom & prenom2",
        "nom et prenom",
        "nom prenom",
        "full name",
        "employee name",
        "collaborateur",
    ],
    "groupe": ["groupe", "group", "team"],
    "num_tel": ["num tel", "telephone", "phone", "mobile", "gsm"],
    "centre_cout": ["cc", "centre cout", "centre de cout", "cost center"],
    "fonction_sap": ["fonction sap", "fonction", "poste", "job", "role"],
    "date_recrutement": ["date embauche", "date d embauche", "date recrutement", "hire date"],
    "anciennete": ["anciennete", "seniority", "tenure"],
    "contre_maitre": ["contre maitre", "contre_maitre", "supervisor", "team lead"],
    "segment": ["seg", "segment", "department", "division"],
    "gender": ["gender", "genre", "sexe"],
}
REQUIRED_HISTORY_FIELDS = ("matricule", "heures_de_presences", "moin", "jour")
_HISTORY_MODEL_FIELDS = (
    "matricule",
    "nature",
    "entree_sorie",
    "heures_de_presences",
    "motif",
    "eff_actif",
    "eff_presente",
    "eff_mr",
    "abs_p_par_per",
    "abs_np_par",
    "nbr_de_retard",
    "heurs_sup",
    "moin",
    "jour",
)


def _build_history_synonyms() -> dict[str, list[str]]:
    configured_synonyms = get_excel_synonyms()
    merged = {field: list(aliases) for field, aliases in DEFAULT_HISTORY_SYNONYMS.items()}
    for field in merged:
        extra_aliases = configured_synonyms.get(field, [])
        for alias in extra_aliases:
            if alias not in merged[field]:
                merged[field].append(alias)
    return merged


def _header_score(header: str, aliases: list[str]) -> float:
    normalized_header = normalize_header(header)
    if not normalized_header:
        return 0.0

    best_score = 0.0
    header_tokens = set(normalized_header.split())
    for alias in aliases:
        normalized_alias = normalize_header(alias)
        if not normalized_alias:
            continue
        if normalized_alias == normalized_header:
            return 100.0
        if normalized_alias in normalized_header or normalized_header in normalized_alias:
            best_score = max(best_score, 84.0)

        alias_tokens = set(normalized_alias.split())
        union = header_tokens | alias_tokens
        if union:
            overlap = len(header_tokens & alias_tokens) / len(union)
            best_score = max(best_score, overlap * 72.0)

    return best_score


def _infer_history_mapping(columns: list[str], synonyms: dict[str, list[str]]) -> dict[str, str]:
    mapping: dict[str, str] = {}
    used_headers: set[str] = set()

    for field, aliases in synonyms.items():
        best_header: str | None = None
        best_score = 0.0
        for header in columns:
            if header in used_headers:
                continue
            score = _header_score(header, [field, *aliases])
            if score > best_score:
                best_score = score
                best_header = header

        minimum = 74.0 if field in REQUIRED_HISTORY_FIELDS else 68.0
        if best_header and best_score >= minimum:
            mapping[field] = best_header
            used_headers.add(best_header)

    return mapping


def _is_relevant_history_sheet(columns: list[str], mapping: dict[str, str], rows: list[dict[str, Any]]) -> bool:
    return bool(rows) and bool(columns) and "matricule" in mapping and ("moin" in mapping or "jour" in mapping)


def _extract_history_rows(
    file_content: bytes,
    filename: str,
) -> tuple[list[str], dict[str, str], list[HistoryImportRow]]:
    sheets = read_uploaded_sheets(file_content, filename)
    synonyms = _build_history_synonyms()

    columns_detected: list[str] = []
    mapping_used: dict[str, str] = {}
    parsed_rows: list[HistoryImportRow] = []

    for sheet in sheets:
        mapping = _infer_history_mapping(sheet.columns, synonyms)
        if not _is_relevant_history_sheet(sheet.columns, mapping, sheet.rows):
            continue

        for column in sheet.columns:
            if column not in columns_detected:
                columns_detected.append(column)

        for field, header in mapping.items():
            if field not in mapping_used:
                mapping_used[field] = header

        for source_row in sheet.rows:
            normalized = {
                field: source_row.get(header)
                for field, header in mapping.items()
            }
            parsed_rows.append(HistoryImportRow.model_validate(normalized))

    if not parsed_rows and sheets:
        for sheet in sheets:
            for column in sheet.columns:
                if column not in columns_detected:
                    columns_detected.append(column)
        if sheets[0].columns:
            mapping_used = _infer_history_mapping(sheets[0].columns, synonyms)

    return columns_detected, mapping_used, parsed_rows


def _display_history_date(row: HistoryImportRow) -> str | None:
    if not row.jour or not row.moin:
        return None
    return f"{row.jour}/{row.moin}"


def _history_model_payload(row: HistoryImportRow) -> dict[str, Any]:
    payload = row.model_dump()
    return {field: payload.get(field) for field in _HISTORY_MODEL_FIELDS}


def _history_row_key(row: HistoryImportRow) -> tuple[str, str, str] | None:
    if not row.matricule or not row.moin or not row.jour:
        return None
    return (row.matricule, row.moin, row.jour)


def _split_history_full_name(full_name: str | None) -> tuple[str | None, str | None]:
    if not full_name:
        return None, None

    parts = [part for part in full_name.split() if part]
    if not parts:
        return None, None
    if len(parts) == 1:
        return parts[0], None
    return parts[0], " ".join(parts[1:])


def _build_upload_collaborator(row: HistoryImportRow) -> ExtractedCollaboratorRow | None:
    if not row.matricule:
        return None

    nom = row.nom
    prenom = row.prenom
    if (not nom or not prenom) and row.full_name:
        split_nom, split_prenom = _split_history_full_name(row.full_name)
        nom = nom or split_nom
        prenom = prenom or split_prenom

    if not nom or not prenom:
        return None

    return ExtractedCollaboratorRow.model_validate(
        {
            "matricule": row.matricule,
            "nom": nom,
            "prenom": prenom,
            "fonction_sap": row.fonction_sap,
            "centre_cout": row.centre_cout,
            "groupe": row.groupe,
            "contre_maitre": row.contre_maitre,
            "segment": row.segment,
            "gender": row.gender,
            "num_tel": row.num_tel,
            "date_recrutement": row.date_recrutement,
            "anciennete": row.anciennete,
        }
    )


def _merge_collaborator_candidates(
    existing: ExtractedCollaboratorRow,
    incoming: ExtractedCollaboratorRow,
) -> ExtractedCollaboratorRow:
    merged = existing.model_dump()
    for field, value in incoming.model_dump().items():
        if merged.get(field) in (None, "") and value not in (None, ""):
            merged[field] = value
    return ExtractedCollaboratorRow.model_validate(merged)


def _collect_upload_collaborators(rows: list[HistoryImportRow]) -> dict[str, ExtractedCollaboratorRow]:
    collaborators: dict[str, ExtractedCollaboratorRow] = {}
    for row in rows:
        candidate = _build_upload_collaborator(row)
        if candidate is None or not candidate.matricule:
            continue

        existing = collaborators.get(candidate.matricule)
        collaborators[candidate.matricule] = (
            _merge_collaborator_candidates(existing, candidate) if existing is not None else candidate
        )
    return collaborators


def resolve_history_date(row: HistoryImportRow, reference_date: date | None = None) -> date | None:
    if not row.moin or not row.jour:
        return None

    today = reference_date or date.today()
    month = int(row.moin)
    day = int(row.jour)

    for year_offset in (0, -1):
        try:
            candidate = date(today.year + year_offset, month, day)
        except ValueError:
            continue
        if candidate <= today:
            return candidate

    try:
        return date(today.year, month, day)
    except ValueError:
        return None


def _collect_preview_errors(
    row: HistoryImportRow,
    collaborators_by_matricule: dict[str, Any],
) -> list[str]:
    errors: list[str] = []

    if not row.matricule:
        errors.append("matricule is required")
    elif row.matricule not in collaborators_by_matricule:
        errors.append("matricule not found")

    if row.heures_de_presences is None:
        errors.append("Heures_de_présences is required")

    if not row.moin:
        errors.append("Moin is required")
    if not row.jour:
        errors.append("Jour is required")
    if row.moin and row.jour and resolve_history_date(row) is None:
        errors.append("Invalid Moin/Jour combination")

    return errors


def build_history_preview(
    db: Session,
    rows: list[HistoryImportRow],
    *,
    file_name: str | None = None,
    columns_detected: list[str] | None = None,
    mapping_used: dict[str, str] | None = None,
) -> HistoryPreviewResponse:
    columns = columns_detected or []
    mapping = mapping_used or {}
    matricules = sorted({row.matricule for row in rows if row.matricule})
    upload_collaborators = _collect_upload_collaborators(rows)

    collaborator_rows = (
        db.execute(
            select(
                Collaborateur.matricule,
                Collaborateur.nom,
                Collaborateur.prenom,
            ).where(Collaborateur.matricule.in_(matricules))
        ).mappings().all()
        if matricules
        else []
    )
    collaborators_by_matricule = {
        str(item["matricule"]): dict(item)
        for item in collaborator_rows
    }
    for matricule, collaborator in upload_collaborators.items():
        if matricule not in collaborators_by_matricule:
            collaborators_by_matricule[matricule] = collaborator.model_dump()

    keys = [_history_row_key(row) for row in rows]
    existing_records = (
        db.execute(select(History).where(History.matricule.in_(matricules))).scalars().all()
        if matricules
        else []
    )
    existing_keys = {
        (record.matricule, record.moin, record.jour)
        for record in existing_records
    }

    duplicate_indexes_by_key: dict[tuple[str, str, str], list[int]] = defaultdict(list)
    for index, key in enumerate(keys):
        if key is not None:
            duplicate_indexes_by_key[key].append(index)

    preview_rows: list[HistoryPreviewRow] = []
    for index, row in enumerate(rows):
        errors = _collect_preview_errors(row, collaborators_by_matricule)
        key = keys[index]
        if key is not None and len(duplicate_indexes_by_key[key]) > 1:
            errors.append("Duplicate row in upload for the same collaborateur/date")

        collaborator = collaborators_by_matricule.get(row.matricule or "")
        is_valid = len(errors) == 0
        import_action = "invalid"
        if is_valid:
            import_action = "update" if key in existing_keys else "insert"

        preview_rows.append(
            HistoryPreviewRow(
                row_index=index,
                source_row_number=index + 2,
                is_valid=is_valid,
                import_action=import_action,
                display_date=_display_history_date(row),
                collaborateur_nom=(
                    f"{collaborator.get('nom') or ''} {collaborator.get('prenom') or ''}".strip()
                    if collaborator is not None
                    else None
                ),
                errors=errors,
                row=row,
            )
        )

    valid_rows_count = sum(1 for item in preview_rows if item.is_valid)
    insert_rows_count = sum(1 for item in preview_rows if item.import_action == "insert")
    update_rows_count = sum(1 for item in preview_rows if item.import_action == "update")

    return HistoryPreviewResponse(
        file_name=file_name,
        columns_detected=columns,
        mapping_used=mapping,
        rows=preview_rows,
        rows_count=len(preview_rows),
        valid_rows_count=valid_rows_count,
        invalid_rows_count=len(preview_rows) - valid_rows_count,
        insert_rows_count=insert_rows_count,
        update_rows_count=update_rows_count,
    )


async def build_history_preview_from_upload(upload: UploadFile, db: Session) -> HistoryPreviewResponse:
    filename = upload.filename or ""
    lowered_name = filename.lower()
    if not any(lowered_name.endswith(extension) for extension in SUPPORTED_HISTORY_UPLOAD_EXTENSIONS):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Only .xlsx files are accepted")

    content = await upload.read()
    if not content:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

    try:
        columns_detected, mapping_used, rows = _extract_history_rows(content, lowered_name)
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Spreadsheet support dependencies are missing (openpyxl)",
        ) from exc
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid upload file: {exc}",
        ) from exc

    missing_required_headers = [field for field in REQUIRED_HISTORY_FIELDS if field not in mapping_used]
    if missing_required_headers:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Wrong history file format",
                "missing_fields": missing_required_headers,
                "headers_found": columns_detected,
            },
        )

    if not rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "The uploaded file has no readable history rows",
                "headers_found": columns_detected,
            },
        )

    return build_history_preview(
        db,
        rows,
        file_name=filename,
        columns_detected=columns_detected,
        mapping_used=mapping_used,
    )


def import_history_rows(db: Session, rows: list[HistoryImportRow]) -> dict[str, int]:
    preview = build_history_preview(db, rows)
    invalid_rows = [item for item in preview.rows if not item.is_valid]
    if invalid_rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Some history rows are invalid",
                "rows": [item.model_dump() for item in invalid_rows],
            },
        )

    valid_rows = [item.row for item in preview.rows if item.is_valid]
    if not valid_rows:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No valid history rows to import")

    collaborator_summary = {"rows_inserted": 0, "rows_updated": 0}
    upload_collaborators = list(_collect_upload_collaborators(valid_rows).values())
    if upload_collaborators:
        collaborator_summary = upsert_collaborateur_rows(db, upload_collaborators)

    matricules = sorted({row.matricule for row in valid_rows if row.matricule})
    existing_records = (
        db.execute(select(History).where(History.matricule.in_(matricules))).scalars().all()
        if matricules
        else []
    )
    existing_by_key = {
        (record.matricule, record.moin, record.jour): record
        for record in existing_records
    }

    inserted = 0
    updated = 0
    for row in valid_rows:
        key = _history_row_key(row)
        if key is None:
            continue

        payload = _history_model_payload(row)
        record = existing_by_key.get(key)
        if record is None:
            record = History(**payload)
            db.add(record)
            existing_by_key[key] = record
            inserted += 1
            continue

        for field, value in payload.items():
            setattr(record, field, value)
        updated += 1

    db.commit()

    return {
        "rows_processed": len(valid_rows),
        "rows_inserted": inserted,
        "rows_updated": updated,
        "rows_skipped": 0,
        "collaborators_inserted": collaborator_summary.get("rows_inserted", 0),
        "collaborators_updated": collaborator_summary.get("rows_updated", 0),
    }


def build_history_features(db: Session, matricule: str) -> dict[str, Any]:
    collaborator = db.execute(
        select(
            Collaborateur.matricule,
            Collaborateur.nom,
            Collaborateur.prenom,
        ).where(Collaborateur.matricule == matricule)
    ).mappings().first()
    if collaborator is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collaborateur not found")

    rows = db.execute(select(History).where(History.matricule == matricule)).scalars().all()

    today = date.today()
    normalized_rows: list[tuple[date, History]] = []
    for row in rows:
        normalized_date = resolve_history_date(
            HistoryImportRow(
                matricule=row.matricule,
                nature=row.nature,
                entree_sorie=row.entree_sorie,
                heures_de_presences=row.heures_de_presences,
                motif=row.motif,
                eff_actif=row.eff_actif,
                eff_presente=row.eff_presente,
                eff_mr=row.eff_mr,
                abs_p_par_per=row.abs_p_par_per,
                abs_np_par=row.abs_np_par,
                nbr_de_retard=row.nbr_de_retard,
                heurs_sup=row.heurs_sup,
                moin=row.moin,
                jour=row.jour,
            ),
            reference_date=today,
        )
        if normalized_date is not None:
            normalized_rows.append((normalized_date, row))

    normalized_rows.sort(key=lambda item: item[0], reverse=True)
    window_start = today.fromordinal(today.toordinal() - 13)
    recent_rows = [item for item in normalized_rows if window_start <= item[0] <= today]

    hours_values = [item[1].heures_de_presences or 0 for item in recent_rows]
    absence_count = sum(
        1
        for _, row in recent_rows
        if (row.heures_de_presences or 0) == 0
        or row_has_absence_indicator(
            {
                "nature": row.nature,
                "motif": row.motif,
                "eff_mr": row.eff_mr,
                "abs_p_par_per": row.abs_p_par_per,
                "abs_np_par": row.abs_np_par,
            }
        )
    )

    return {
        "matricule": collaborator["matricule"],
        "collaborateur": f"{collaborator.get('nom') or ''} {collaborator.get('prenom') or ''}".strip(),
        "window_start": window_start.isoformat(),
        "window_end": today.isoformat(),
        "history_days": len(normalized_rows),
        "hours_sum_14d": sum(hours_values),
        "hours_mean_14d": round(sum(hours_values) / len(hours_values), 2) if hours_values else 0.0,
        "absence_count_14d": absence_count,
        "delay_count_14d": sum((item[1].nbr_de_retard or 0) for item in recent_rows),
        "zero_hour_days_14d": sum(1 for value in hours_values if value == 0),
        "low_hour_days_14d": sum(1 for value in hours_values if 0 < value < 8),
        "overtime_sum_14d": sum((item[1].heurs_sup or 0) for item in recent_rows),
        "current_month": today.month,
    }
