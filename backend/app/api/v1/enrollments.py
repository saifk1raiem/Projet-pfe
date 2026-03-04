from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.enrollment import Enrollment
from app.models.enums import EtatQualifies, UserRole
from app.models.formation import Formation
from app.models.training_session import TrainingSession
from app.models.user import User
from app.schemas.enrollment import EnrollmentCreate, EnrollmentEtatUpdate, EnrollmentRead, MyEnrollmentRead


router = APIRouter(tags=["enrollments"])


@router.post("/sessions/{session_id}/enroll", response_model=EnrollmentRead, status_code=status.HTTP_201_CREATED)
def enroll_collaborateur(
    session_id: int,
    payload: EnrollmentCreate,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin)),
):
    session_obj = db.get(TrainingSession, session_id)
    if not session_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    collaborator = db.get(User, payload.collaborateur_id)
    if not collaborator or collaborator.role != UserRole.observer:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid observer user")

    enrollment = Enrollment(
        session_id=session_id,
        collaborateur_id=payload.collaborateur_id,
        etat_qualifies=payload.etat_qualifies,
    )
    db.add(enrollment)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Collaborateur already enrolled") from exc
    db.refresh(enrollment)
    return enrollment


@router.get("/me/enrollments", response_model=list[MyEnrollmentRead])
def my_enrollments(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.observer)),
):
    stmt = (
        select(Enrollment, TrainingSession, Formation)
        .join(TrainingSession, TrainingSession.id == Enrollment.session_id)
        .join(Formation, Formation.id == TrainingSession.formation_id)
        .where(Enrollment.collaborateur_id == current_user.id)
        .order_by(Enrollment.id.asc())
    )
    rows = db.execute(stmt).all()
    return [
        MyEnrollmentRead(
            id=enrollment.id,
            session_id=enrollment.session_id,
            collaborateur_id=enrollment.collaborateur_id,
            etat_qualifies=enrollment.etat_qualifies,
            assigned_at=enrollment.assigned_at,
            session=session_obj,
            formation=formation_obj,
        )
        for enrollment, session_obj, formation_obj in rows
    ]


@router.patch("/enrollments/{enrollment_id}/etat", response_model=EnrollmentRead)
def update_enrollment_etat(
    enrollment_id: int,
    payload: EnrollmentEtatUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin)),
):
    enrollment = db.get(Enrollment, enrollment_id)
    if not enrollment:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Enrollment not found")

    enrollment.etat_qualifies = payload.etat_qualifies
    db.commit()
    db.refresh(enrollment)
    return enrollment
