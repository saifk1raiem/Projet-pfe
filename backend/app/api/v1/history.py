from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.models.enums import UserRole
from app.schemas.history import HistoryImportRequest
from app.services.history_import_service import (
    build_history_features,
    build_history_preview_from_upload,
    import_history_rows,
)


router = APIRouter(prefix="/history", tags=["history"])


@router.post("/preview")
async def preview_history_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin)),
):
    return await build_history_preview_from_upload(file, db)


@router.post("/import")
def import_history_preview_rows(
    payload: HistoryImportRequest,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin)),
):
    return import_history_rows(db, payload.rows)


@router.post("/upload")
async def upload_history_file(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin)),
):
    preview = await build_history_preview_from_upload(file, db)
    valid_rows = [item.row for item in preview.rows if item.is_valid]
    if not valid_rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "No valid history rows to import",
                "preview": preview.model_dump(),
            },
        )

    summary = import_history_rows(db, valid_rows)
    return {
        "preview": preview,
        "import_summary": summary,
    }


@router.get("/features/{matricule}")
def get_history_features(
    matricule: str,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin, UserRole.observer)),
):
    return build_history_features(db, matricule)
