from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.enums import UserRole
from app.models.training_session import TrainingSession
from app.schemas.training_session import SessionCreate, SessionRead, SessionUpdate


router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("", response_model=list[SessionRead])
def list_sessions(
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin, UserRole.observer)),
):
    stmt = select(TrainingSession).order_by(TrainingSession.id.asc())
    return list(db.scalars(stmt).all())


@router.post("", response_model=SessionRead, status_code=status.HTTP_201_CREATED)
def create_session(
    payload: SessionCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin)),
):
    if payload.end_date < payload.start_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="end_date must be >= start_date")

    session_obj = TrainingSession(**payload.model_dump())
    db.add(session_obj)
    db.commit()
    db.refresh(session_obj)
    return session_obj


@router.patch("/{session_id}", response_model=SessionRead)
def update_session(
    session_id: int,
    payload: SessionUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin)),
):
    session_obj = db.get(TrainingSession, session_id)
    if not session_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    updates = payload.model_dump(exclude_unset=True)
    for key, value in updates.items():
        setattr(session_obj, key, value)
    if session_obj.end_date < session_obj.start_date:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="end_date must be >= start_date")
    db.commit()
    db.refresh(session_obj)
    return session_obj


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_session(
    session_id: int,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin)),
):
    session_obj = db.get(TrainingSession, session_id)
    if not session_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
    db.delete(session_obj)
    db.commit()
