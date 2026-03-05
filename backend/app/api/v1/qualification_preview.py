from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from app.api.deps import require_roles
from app.models.enums import UserRole
from app.utils.qualification_preview import parse_excel_to_rows


router = APIRouter(prefix="/qualification", tags=["qualification"])


@router.post("/preview")
async def preview_qualification_file(
    files: list[UploadFile] = File(...),
    _: object = Depends(require_roles(UserRole.admin)),
):
    if not files:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="No files uploaded")

    merged_rows = []
    merged_columns: list[str] = []
    merged_mapping: dict[str, str] = {}
    file_errors: list[dict[str, str]] = []

    for upload in files:
        filename = (upload.filename or "").lower()
        if not (filename.endswith(".xlsx") or filename.endswith(".xls")):
            file_errors.append({"file": upload.filename or "", "error": "Only .xlsx and .xls files are accepted"})
            continue

        content = await upload.read()
        if not content:
            file_errors.append({"file": upload.filename or "", "error": "Uploaded file is empty"})
            continue

        try:
            columns_detected, mapping_used, rows = parse_excel_to_rows(content, filename)
        except ImportError as exc:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Excel support dependencies are missing (openpyxl/xlrd)",
            ) from exc
        except Exception as exc:
            file_errors.append({"file": upload.filename or "", "error": f"Invalid Excel file: {exc}"})
            continue

        has_matricule = "matricule" in mapping_used
        has_name_info = "nom" in mapping_used or "prenom" in mapping_used or "nomprenom" in mapping_used
        if not (has_matricule or has_name_info):
            file_errors.append(
                {
                    "file": upload.filename or "",
                    "error": "Missing required columns: need matricule or a name column",
                }
            )
            continue

        merged_rows.extend(rows)
        for column in columns_detected:
            if column not in merged_columns:
                merged_columns.append(column)
        for field, header in mapping_used.items():
            if field not in merged_mapping:
                merged_mapping[field] = header

    if file_errors and not merged_rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail={"message": "No valid files to preview", "file_errors": file_errors},
        )

    return {
        "columns_detected": merged_columns,
        "mapping_used": merged_mapping,
        "rows": merged_rows,
        "rows_count": len(merged_rows),
        "file_errors": file_errors,
    }
