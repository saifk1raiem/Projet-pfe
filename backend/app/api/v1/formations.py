from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.formation import Formation
from app.schemas.formation import FormationCreate, FormationRead, FormationUpdate


router = APIRouter(prefix="/formations", tags=["formations"])


@router.get("", response_model=list[FormationRead])
def list_formations(
    db: Session = Depends(get_db),
    _: object = Depends(
        require_roles(UserRole.admin, UserRole.observer)
    ),
):
    return list(db.scalars(select(Formation).order_by(Formation.id.asc())).all())


@router.post("", response_model=FormationRead, status_code=status.HTTP_201_CREATED)
def create_formation(
    payload: FormationCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin)),
):
    formation = Formation(**payload.model_dump())
    db.add(formation)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Formation code already exists") from exc
    db.refresh(formation)
    return formation


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


@router.delete("/{formation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_formation(
    formation_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin)),
):
    formation = db.get(Formation, formation_id)
    if not formation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Formation not found")
    db.delete(formation)
    db.commit()
