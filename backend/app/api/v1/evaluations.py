from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.enrollment import Enrollment
from app.models.enums import UserRole, normalize_user_role
from app.models.evaluation import Evaluation
from app.models.training_session import TrainingSession
from app.models.user import User
from app.schemas.evaluation import EvaluationCreate, EvaluationRead, EvaluationUpdate


router = APIRouter(tags=["evaluations"])


@router.post(
    "/sessions/{session_id}/evaluations",
    response_model=EvaluationRead,
    status_code=status.HTTP_201_CREATED,
)
def create_evaluation(
    session_id: int,
    payload: EvaluationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_roles(UserRole.admin)),
):
    session_obj = db.get(TrainingSession, session_id)
    if not session_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    enrollment = db.scalar(
        select(Enrollment).where(
            Enrollment.session_id == session_id,
            Enrollment.collaborateur_id == payload.collaborateur_id,
        )
    )
    if not enrollment:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Collaborateur is not enrolled in this session",
        )

    evaluation = Evaluation(
        session_id=session_id,
        collaborateur_id=payload.collaborateur_id,
        formateur_id=session_obj.formateur_id,
        score_100=payload.score_100,
        stars=payload.stars,
        comment=payload.comment,
    )
    db.add(evaluation)
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Evaluation already exists for this collaborator/session",
        ) from exc
    db.refresh(evaluation)
    return evaluation


@router.get("/sessions/{session_id}/evaluations", response_model=list[EvaluationRead])
def list_session_evaluations(
    session_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(
        require_roles(UserRole.admin, UserRole.observer)
    ),
):
    session_obj = db.get(TrainingSession, session_id)
    if not session_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")

    stmt = select(Evaluation).where(Evaluation.session_id == session_id).order_by(Evaluation.id.asc())
    if normalize_user_role(current_user.role) == UserRole.observer:
        stmt = stmt.where(Evaluation.collaborateur_id == current_user.id)
    return list(db.scalars(stmt).all())


@router.patch("/evaluations/{evaluation_id}", response_model=EvaluationRead)
def update_evaluation(
    evaluation_id: int,
    payload: EvaluationUpdate,
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin)),
):
    evaluation = db.get(Evaluation, evaluation_id)
    if not evaluation:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Evaluation not found")

    for key, value in payload.model_dump(exclude_unset=True).items():
        setattr(evaluation, key, value)
    db.commit()
    db.refresh(evaluation)
    return evaluation
