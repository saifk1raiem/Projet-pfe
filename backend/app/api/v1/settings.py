from fastapi import APIRouter, Depends
from pydantic import BaseModel

from app.api.deps import require_roles
from app.models.enums import UserRole
from app.services.excel_synonyms import get_excel_synonyms, save_excel_synonyms


router = APIRouter(prefix="/settings", tags=["settings"])


class ExcelSynonymsPayload(BaseModel):
    synonyms: dict[str, list[str]]


@router.get("/excel-synonyms")
def get_excel_synonyms_settings(
    _: object = Depends(require_roles(UserRole.admin)),
):
    return {"synonyms": get_excel_synonyms()}


@router.put("/excel-synonyms")
def update_excel_synonyms_settings(
    payload: ExcelSynonymsPayload,
    _: object = Depends(require_roles(UserRole.admin)),
):
    saved = save_excel_synonyms(payload.synonyms)
    return {"synonyms": saved}
