from io import BytesIO

import pandas as pd
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy import select
from sqlalchemy.dialects.postgresql import insert
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.collaborateur import Collaborateur
from app.models.enums import UserRole
from app.utils.collaborateur_import import REQUIRED_FIELDS, SYNONYMS, clean_row, infer_mapping


router = APIRouter(prefix="/admin/collaborateurs", tags=["admin"])


@router.post("/import")
async def import_collaborateurs(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin)),
):
    filename = (file.filename or "").lower()
    if not (filename.endswith(".xlsx") or filename.endswith(".xls")):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only .xlsx and .xls files are accepted",
        )

    engine = "openpyxl" if filename.endswith(".xlsx") else "xlrd"

    try:
        content = await file.read()
        if not content:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Uploaded file is empty")

        dataframe = pd.read_excel(BytesIO(content), dtype=object, engine=engine)
    except HTTPException:
        raise
    except ImportError as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Excel support dependencies are missing (openpyxl/xlrd)",
        ) from exc
    except Exception as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Invalid Excel file: {exc}") from exc

    headers = [str(column) for column in dataframe.columns.tolist()]
    mapping, unmapped_headers = infer_mapping(headers, SYNONYMS)
    has_name_fields = ("nom" in mapping and "prenom" in mapping) or ("nomprenom" in mapping)
    missing_required_fields = []
    if "matricule" not in mapping:
        missing_required_fields.append("matricule")
    if not has_name_fields:
        missing_required_fields.extend(["nom", "prenom"])

    if missing_required_fields:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={
                "message": "Missing required columns in Excel file",
                "missing_required_fields": missing_required_fields,
                "unmapped_headers": unmapped_headers,
            },
        )

    rows = dataframe.to_dict(orient="records")
    cleaned_rows = []
    skipped = 0

    for row in rows:
        cleaned = clean_row(row, mapping)
        if not all(cleaned.get(field) for field in REQUIRED_FIELDS):
            skipped += 1
            continue
        cleaned_rows.append(cleaned)

    existing_matricules = set()
    if cleaned_rows:
        matricules = {row["matricule"] for row in cleaned_rows}
        existing_matricules = set(
            db.scalars(
                select(Collaborateur.matricule).where(Collaborateur.matricule.in_(matricules))
            ).all()
        )

    inserted = 0
    updated = 0
    seen_matricules: set[str] = set()

    try:
        for cleaned in cleaned_rows:
            matricule = cleaned["matricule"]
            if matricule in existing_matricules or matricule in seen_matricules:
                updated += 1
            else:
                inserted += 1

            seen_matricules.add(matricule)
            stmt = insert(Collaborateur).values(**cleaned)
            update_values = {key: value for key, value in cleaned.items() if key != "matricule"}
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
        "rows_processed": len(rows),
        "rows_inserted": inserted,
        "rows_updated": updated,
        "rows_skipped": skipped,
        "missing_required_fields": missing_required_fields,
        "unmapped_headers": unmapped_headers,
    }
