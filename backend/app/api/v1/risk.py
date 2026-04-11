from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from app.api.deps import get_db, require_roles
from app.models.enums import UserRole
from app.schemas.risk import CollaborateurRiskRow, RiskScoreSummary
from app.services.quit_risk_service import get_risk_for_matricule, list_risks, score_all_risks


router = APIRouter(prefix="/risk", tags=["risk"])


@router.post("/score", response_model=RiskScoreSummary)
def score_risk_table(
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin)),
):
    return score_all_risks(db)


@router.get("", response_model=list[CollaborateurRiskRow])
def list_risk_scores(
    limit: int = Query(15, ge=1, le=200),
    bucket: str | None = Query(None),
    recent: bool | None = Query(None),
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin, UserRole.observer)),
):
    return list_risks(db, limit=limit, bucket=bucket, recent_only=recent)


@router.get("/{matricule}", response_model=CollaborateurRiskRow)
def get_risk_score(
    matricule: str,
    refresh: bool = Query(False),
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin, UserRole.observer)),
):
    risk = get_risk_for_matricule(db, matricule, refresh=refresh)
    if risk is None:
        raise HTTPException(status_code=404, detail="Risk score not found")
    return risk
