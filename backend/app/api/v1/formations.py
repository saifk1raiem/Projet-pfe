from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.formation import Formation
from app.schemas.formation import FormationRead, FormationUpdate


router = APIRouter(prefix="/formations", tags=["formations"])


@router.get("", response_model=list[FormationRead])
def list_formations(
    db: Session = Depends(get_db),
    _: object = Depends(
        require_roles(UserRole.admin, UserRole.observer)
    ),
):
    return list(db.scalars(select(Formation).order_by(Formation.id.asc())).all())


@router.patch("/{formation_id}", response_model=FormationRead)
def update_formation(
    formation_id: int,
    payload: FormationUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin)),
):
    formation = db.get(Formation, formation_id)
    if not formation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formation not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(formation, key, value)
    db.commit()
    db.refresh(formation)
    return formation
