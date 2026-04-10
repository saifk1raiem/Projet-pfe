from datetime import date

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import Date as SqlDate, MetaData, Table, select, update
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.collaborateur import Collaborateur
from app.models.enums import UserRole
from app.schemas.collaborateur import CollaborateurUpdateRequest
from app.schemas.extraction_contract import ExtractedCollaboratorImportRequest, ExtractedCollaboratorRow
from app.services.collaborateur_import_service import (
    detect_collaborateur_conflicts,
    extract_rows_from_uploads,
    serialize_extracted_row,
    upsert_collaborateur_rows,
)


router = APIRouter(prefix="/admin/collaborateurs", tags=["admin"])


def _get_collaborateur_table(db: Session) -> Table:
    return Table(Collaborateur.__tablename__, MetaData(), autoload_with=db.get_bind())


def _serialize_date_value(value):
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _serialize_collaborateur_row(record: dict) -> dict:
    return {
        "matricule": record.get("matricule"),
        "nom": record.get("nom"),
        "prenom": record.get("prenom"),
        "fonction": record.get("fonction"),
        "centre_cout": record.get("centre_cout"),
        "groupe": record.get("groupe"),
        "competence": record.get("competence"),
        "formateur": record.get("formateur"),
        "contre_maitre": record.get("contre_maitre"),
        "segment": record.get("segment"),
        "gender": record.get("gender"),
        "num_tel": record.get("num_tel"),
        "date_recrutement": _serialize_date_value(record.get("date_recrutement")),
        "anciennete": record.get("anciennete"),
    }


def _clean_optional_text(value):
    if value is None:
        return None
    text = " ".join(str(value).split()).strip()
    return text or None


def _clean_required_text(value, field_label: str) -> str:
    cleaned_value = _clean_optional_text(value)
    if not cleaned_value:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"{field_label} is required",
        )
    return cleaned_value


def _normalize_date_for_column(value, column):
    cleaned_value = _clean_optional_text(value)
    if cleaned_value is None:
        return None

    try:
        parsed_date = date.fromisoformat(cleaned_value)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="date_recrutement must use YYYY-MM-DD format",
        ) from exc

    if isinstance(column.type, SqlDate):
        return parsed_date
    return parsed_date.isoformat()


@router.get("")
def list_collaborateurs(
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin, UserRole.observer)),
):
    collaborateur_table = _get_collaborateur_table(db)
    records = db.execute(select(collaborateur_table).order_by(collaborateur_table.c.matricule.asc())).mappings().all()
    return [
        {
            **_serialize_collaborateur_row(record),
            "fonction_sap": record.get("fonction"),
        }
        for record in records
    ]


@router.patch("/{matricule}")
def update_collaborateur(
    matricule: str,
    payload: CollaborateurUpdateRequest,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin)),
):
    collaborateur_table = _get_collaborateur_table(db)
    existing_record = db.execute(
        select(collaborateur_table).where(collaborateur_table.c.matricule == matricule)
    ).mappings().first()
    if not existing_record:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Collaborateur not found")

    changes = payload.model_dump(exclude_unset=True)
    if not changes:
        return _serialize_collaborateur_row(existing_record)

    update_values = {}
    if "nom" in changes:
        update_values["nom"] = _clean_required_text(changes.get("nom"), "nom")
    if "prenom" in changes:
        update_values["prenom"] = _clean_required_text(changes.get("prenom"), "prenom")

    for field in ("fonction", "centre_cout", "groupe", "contre_maitre", "segment", "gender", "num_tel"):
        if field in changes:
            update_values[field] = _clean_optional_text(changes.get(field))

    if "date_recrutement" in changes:
        update_values["date_recrutement"] = _normalize_date_for_column(
            changes.get("date_recrutement"),
            collaborateur_table.c.date_recrutement,
        )

    if "anciennete" in changes:
        update_values["anciennete"] = changes.get("anciennete")

    if not update_values:
        return _serialize_collaborateur_row(existing_record)

    db.execute(
        update(collaborateur_table)
        .where(collaborateur_table.c.matricule == matricule)
        .values(**update_values)
    )
    db.commit()

    updated_record = db.execute(
        select(collaborateur_table).where(collaborateur_table.c.matricule == matricule)
    ).mappings().first()
    return _serialize_collaborateur_row(updated_record)


@router.post("/preview")
async def preview_collaborateurs(
    files: list[UploadFile] = File(...),
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin)),
):
    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files uploaded")

    columns_detected, mapping_used, rows, file_errors = await extract_rows_from_uploads(files)
    if file_errors and not rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "No valid files to preview", "file_errors": file_errors},
        )

    serialized_rows = [serialize_extracted_row(row) for row in rows]
    conflicts = detect_collaborateur_conflicts(db, serialized_rows)

    return {
        "columns_detected": columns_detected,
        "mapping_used": mapping_used,
        "rows": serialized_rows,
        "rows_count": len(rows),
        "file_errors": file_errors,
        "conflicts": [conflict.model_dump() for conflict in conflicts],
    }


@router.post("/import-rows")
def import_collaborateur_rows(
    payload: ExtractedCollaboratorImportRequest,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin)),
):
    summary = upsert_collaborateur_rows(db, payload.rows)
    return summary


@router.post("/import")
async def import_collaborateurs(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin)),
):
    columns_detected, mapping_used, rows, file_errors = await extract_rows_from_uploads([file])
    if file_errors and not rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "No valid files to import", "file_errors": file_errors},
        )

    summary = upsert_collaborateur_rows(db, rows)
    return {
        **summary,
        "columns_detected": columns_detected,
        "mapping_used": mapping_used,
        "file_errors": file_errors,
    }
