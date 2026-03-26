from __future__ import annotations

from typing import Any

from fastapi import HTTPException, UploadFile, status
from sqlalchemy import MetaData, Table, inspect as sqlalchemy_inspect, select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.models.collaborateur import Collaborateur
from app.schemas.extraction_contract import (
    CollaboratorConflictField,
    CollaboratorPreviewConflict,
    ExtractedCollaboratorRow,
)
from app.services.excel_synonyms import get_excel_synonyms
from app.services.extraction_mapper import (
    SUPPORTED_UPLOAD_EXTENSIONS,
    read_uploaded_sheets,
    transform_parsed_workbook,
)


def serialize_extracted_row(row: ExtractedCollaboratorRow) -> dict:
    return row.model_dump()


def to_collaborateur_values(row: ExtractedCollaboratorRow) -> dict[str, str | int | None]:
    return {
        "matricule": row.matricule,
        "nom": row.nom,
        "prenom": row.prenom,
        "fonction": row.fonction_sap,
        "centre_cout": row.centre_cout,
        "groupe": row.groupe,
        "competence": row.competence,
        "formateur": row.formateur,
        "contre_maitre": row.contre_maitre,
        "segment": row.segment,
        "gender": row.gender,
        "num_tel": row.num_tel,
        "date_recrutement": row.date_recrutement,
        "anciennete": row.anciennete,
    }


_CONFLICT_FIELD_CANDIDATES: list[tuple[str, list[str]]] = [
    ("nom", ["nom"]),
    ("prenom", ["prenom"]),
    ("fonction", ["fonction_sap", "fonction"]),
    ("centre_cout", ["centre_cout"]),
    ("groupe", ["groupe"]),
    ("competence", ["competence"]),
    ("formateur", ["formateur"]),
    ("contre_maitre", ["contre_maitre"]),
    ("segment", ["segment"]),
    ("gender", ["gender"]),
    ("num_tel", ["num_tel"]),
    ("date_recrutement", ["date_recrutement"]),
    ("anciennete", ["anciennete"]),
]


def _normalize_conflict_value(value: Any) -> str | int | float | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value) if value.is_integer() else value

    text = str(value).strip()
    if not text or text.casefold() in {"null", "nan"}:
        return None
    return " ".join(text.split()).casefold()


def _display_conflict_value(value: Any) -> str | int | float | None:
    if value is None:
        return None
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float):
        return int(value) if value.is_integer() else value

    text = str(value).strip()
    return " ".join(text.split()) or None


def _get_existing_collaborateur_columns(db: Session) -> set[str]:
    bind = db.get_bind()
    inspector = sqlalchemy_inspect(bind)
    return {column["name"] for column in inspector.get_columns(Collaborateur.__tablename__)}


def _get_reflected_collaborateur_table(db: Session) -> Table:
    metadata = MetaData()
    return Table(Collaborateur.__tablename__, metadata, autoload_with=db.get_bind())


def _filter_payload_for_existing_columns(
    rows: list[ExtractedCollaboratorRow],
    existing_columns: set[str],
) -> tuple[list[dict[str, str | int | None]], set[str]]:
    filtered_payloads: list[dict[str, str | int | None]] = []
    missing_columns_with_data: set[str] = set()

    for row in rows:
        payload = to_collaborateur_values(row)
        for field, value in payload.items():
            if field not in existing_columns and value not in (None, ""):
                missing_columns_with_data.add(field)

        filtered_payloads.append({field: value for field, value in payload.items() if field in existing_columns})

    return filtered_payloads, missing_columns_with_data


def detect_collaborateur_conflicts(
    db: Session,
    rows: list[dict[str, Any]],
) -> list[CollaboratorPreviewConflict]:
    if not rows:
        return []

    collaborator_table = _get_reflected_collaborateur_table(db)
    if "matricule" not in collaborator_table.c:
        return []

    compared_fields = [field for field, _ in _CONFLICT_FIELD_CANDIDATES if field in collaborator_table.c]
    if not compared_fields:
        return []

    matricules = sorted(
        {
            str(row.get("matricule")).strip()
            for row in rows
            if isinstance(row.get("matricule"), str) and str(row.get("matricule")).strip()
        }
    )
    if not matricules:
        return []

    existing_rows = db.execute(
        select(
            collaborator_table.c.matricule,
            *[collaborator_table.c[field] for field in compared_fields],
        ).where(collaborator_table.c.matricule.in_(matricules))
    ).mappings().all()
    existing_by_matricule = {str(item["matricule"]).strip(): item for item in existing_rows}

    conflicts: list[CollaboratorPreviewConflict] = []
    for row_index, row in enumerate(rows):
        matricule = row.get("matricule")
        if not isinstance(matricule, str) or not matricule.strip():
            continue

        existing = existing_by_matricule.get(matricule.strip())
        if not existing:
            continue

        field_conflicts: list[CollaboratorConflictField] = []
        for db_field, candidate_row_fields in _CONFLICT_FIELD_CANDIDATES:
            if db_field not in compared_fields:
                continue

            row_field = next((candidate for candidate in candidate_row_fields if candidate in row), None)
            if row_field is None:
                continue

            existing_value = existing.get(db_field)
            incoming_value = row.get(row_field)
            normalized_existing = _normalize_conflict_value(existing_value)
            normalized_incoming = _normalize_conflict_value(incoming_value)

            if normalized_existing is None or normalized_incoming is None:
                continue
            if normalized_existing == normalized_incoming:
                continue

            field_conflicts.append(
                CollaboratorConflictField(
                    field=db_field,
                    row_field=row_field,
                    existing_value=_display_conflict_value(existing_value),
                    incoming_value=_display_conflict_value(incoming_value),
                )
            )

        if field_conflicts:
            conflicts.append(
                CollaboratorPreviewConflict(
                    row_index=row_index,
                    matricule=matricule.strip(),
                    fields=field_conflicts,
                )
            )

    return conflicts


def _is_blank_merge_value(value: Any) -> bool:
    if value is None:
        return True
    if isinstance(value, str):
        return not value.strip()
    return False


def _normalize_merge_text(value: Any) -> str | None:
    if value is None:
        return None
    text = str(value).strip()
    return text.casefold() or None


def _merge_collaborateur_payload(
    existing: dict[str, str | int | None],
    incoming: dict[str, str | int | None],
) -> dict[str, str | int | None]:
    merged = dict(existing)
    for field, incoming_value in incoming.items():
        if _is_blank_merge_value(merged.get(field)) and not _is_blank_merge_value(incoming_value):
            merged[field] = incoming_value
    return merged


def _collaborateur_row_aliases(row: dict[str, str | int | None]) -> list[tuple[str, ...]]:
    aliases: list[tuple[str, ...]] = []

    matricule = _normalize_merge_text(row.get("matricule"))
    if matricule:
        aliases.append(("matricule", matricule))

    nom = _normalize_merge_text(row.get("nom"))
    prenom = _normalize_merge_text(row.get("prenom"))
    if nom and prenom:
        aliases.append(("name", nom, prenom))

    return aliases


def dedupe_by_matricule(rows: list[ExtractedCollaboratorRow]) -> list[ExtractedCollaboratorRow]:
    merged_rows: list[dict[str, str | int | None] | None] = []
    alias_to_index: dict[tuple[str, ...], int] = {}
    invalid_rows: list[ExtractedCollaboratorRow] = []

    for row in rows:
        row_payload = row.model_dump()
        aliases = _collaborateur_row_aliases(row_payload)
        if not aliases:
            invalid_rows.append(row)
            continue

        matched_indexes = sorted({alias_to_index[alias] for alias in aliases if alias in alias_to_index})
        if not matched_indexes:
            target_index = len(merged_rows)
            merged_rows.append(row_payload)
        else:
            target_index = matched_indexes[0]
            combined_row = merged_rows[target_index] or {}

            for other_index in matched_indexes[1:]:
                other_row = merged_rows[other_index]
                if other_row is None:
                    continue
                combined_row = _merge_collaborateur_payload(combined_row, other_row)
                for alias in _collaborateur_row_aliases(other_row):
                    alias_to_index[alias] = target_index
                merged_rows[other_index] = None

            merged_rows[target_index] = _merge_collaborateur_payload(combined_row, row_payload)

        current_row = merged_rows[target_index]
        if current_row is None:
            continue

        for alias in _collaborateur_row_aliases(current_row):
            alias_to_index[alias] = target_index

    normalized_rows = [ExtractedCollaboratorRow.model_validate(payload) for payload in merged_rows if payload is not None]
    return [*normalized_rows, *invalid_rows]


def upsert_collaborateur_rows(db: Session, rows: list[ExtractedCollaboratorRow]) -> dict[str, int]:
    prepared_rows = dedupe_by_matricule(rows)
    valid_rows = [row for row in prepared_rows if row.matricule]
    existing_columns = _get_existing_collaborateur_columns(db)
    filtered_payloads, missing_columns_with_data = _filter_payload_for_existing_columns(prepared_rows, existing_columns)

    if missing_columns_with_data:
        missing_list = ", ".join(sorted(missing_columns_with_data))
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database table 'collaborateurs' is missing required columns: {missing_list}",
        )

    existing_matricules = set()
    if valid_rows:
        existing_matricules = set(
            db.scalars(
                select(Collaborateur.matricule).where(
                    Collaborateur.matricule.in_([row.matricule for row in valid_rows if row.matricule])
                )
            ).all()
        )

    inserted = 0
    updated = 0
    skipped = 0

    try:
        for payload in filtered_payloads:
            if not payload.get("matricule") or not payload.get("nom") or not payload.get("prenom"):
                skipped += 1
                continue

            matricule = str(payload["matricule"])
            if matricule in existing_matricules:
                updated += 1
            else:
                inserted += 1
                existing_matricules.add(matricule)

            stmt = insert(Collaborateur).values(**payload)
            update_values = {key: value for key, value in payload.items() if key != "matricule"}
            stmt = stmt.on_conflict_do_update(
                index_elements=[Collaborateur.matricule],
                set_=update_values,
            )
            db.execute(stmt)

        db.commit()
    except SQLAlchemyError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to import collaborators",
        ) from exc

    return {
        "rows_processed": len(prepared_rows),
        "rows_inserted": inserted,
        "rows_updated": updated,
        "rows_skipped": skipped,
    }


async def extract_rows_from_uploads(
    files: list[UploadFile],
) -> tuple[list[str], dict[str, str], list[ExtractedCollaboratorRow], list[dict[str, str]]]:
    merged_rows: list[ExtractedCollaboratorRow] = []
    merged_columns: list[str] = []
    merged_mapping: dict[str, str] = {}
    file_errors: list[dict[str, str]] = []
    synonyms = get_excel_synonyms()

    for upload in files:
        filename = (upload.filename or "").lower()
        if not any(filename.endswith(extension) for extension in SUPPORTED_UPLOAD_EXTENSIONS):
            file_errors.append(
                {"file": upload.filename or "", "error": "Only .xlsx, .xls, and .csv files are accepted"}
            )
            continue

        content = await upload.read()
        if not content:
            file_errors.append({"file": upload.filename or "", "error": "Uploaded file is empty"})
            continue

        try:
            sheets = read_uploaded_sheets(content, filename)
            result = transform_parsed_workbook(sheets, synonyms=synonyms)
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Spreadsheet support dependencies are missing (openpyxl/xlrd)",
            ) from exc
        except Exception as exc:
            file_errors.append({"file": upload.filename or "", "error": f"Invalid upload file: {exc}"})
            continue

        merged_rows.extend(result.rows)
        for column in result.columns_detected:
            if column not in merged_columns:
                merged_columns.append(column)
        for field, header in result.mapping_used.items():
            if field not in merged_mapping:
                merged_mapping[field] = header

    return merged_columns, merged_mapping, dedupe_by_matricule(merged_rows), file_errors
