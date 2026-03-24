from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import MetaData, Table, select
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.collaborateur import Collaborateur
from app.models.enums import UserRole
from app.schemas.extraction_contract import ExtractedCollaboratorImportRequest, ExtractedCollaboratorRow
from app.services.collaborateur_import_service import (
    detect_collaborateur_conflicts,
    extract_rows_from_uploads,
    serialize_extracted_row,
    upsert_collaborateur_rows,
)


router = APIRouter(prefix="/admin/collaborateurs", tags=["admin"])


@router.get("")
def list_collaborateurs(
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin, UserRole.observer)),
):
    collaborateur_table = Table(Collaborateur.__tablename__, MetaData(), autoload_with=db.get_bind())
    records = db.execute(select(collaborateur_table).order_by(collaborateur_table.c.matricule.asc())).mappings().all()
    return [
        {
            "matricule": record.get("matricule"),
            "nom": record.get("nom"),
            "prenom": record.get("prenom"),
            "fonction_sap": record.get("fonction"),
            "centre_cout": record.get("centre_cout"),
            "groupe": record.get("groupe"),
            "competence": record.get("competence"),
            "formateur": record.get("formateur"),
            "contre_maitre": record.get("contre_maitre"),
            "segment": record.get("segment"),
            "gender": record.get("gender"),
            "num_tel": record.get("num_tel"),
            "date_recrutement": record.get("date_recrutement"),
            "anciennete": record.get("anciennete"),
        }
        for record in records
    ]


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
