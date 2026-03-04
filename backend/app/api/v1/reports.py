from datetime import date

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.api.deps import require_roles
from app.db.session import get_db
from app.models.enrollment import Enrollment
from app.models.enums import UserRole
from app.models.evaluation import Evaluation
from app.models.formation import Formation
from app.models.training_session import TrainingSession
from app.schemas.report import DailyEtatCount, DailyFormationScore, DailyReportResponse


router = APIRouter(prefix="/reports", tags=["reports"])


@router.get("/daily", response_model=DailyReportResponse)
def daily_report(
    db: Session = Depends(get_db),
    _: object = Depends(require_roles(UserRole.admin)),
):
    today = date.today()

    etat_stmt = (
        select(
            Formation.id.label("formation_id"),
            Formation.code.label("formation_code"),
            Formation.name.label("formation_name"),
            Enrollment.etat_qualifies,
            func.count(Enrollment.id).label("total"),
        )
        .join(TrainingSession, TrainingSession.id == Enrollment.session_id)
        .join(Formation, Formation.id == TrainingSession.formation_id)
        .where(func.date(Enrollment.assigned_at) == today)
        .group_by(Formation.id, Formation.code, Formation.name, Enrollment.etat_qualifies)
    )

    score_stmt = (
        select(
            Formation.id.label("formation_id"),
            Formation.code.label("formation_code"),
            Formation.name.label("formation_name"),
            func.avg(Evaluation.score_100).label("avg_score_100"),
        )
        .join(TrainingSession, TrainingSession.id == Evaluation.session_id)
        .join(Formation, Formation.id == TrainingSession.formation_id)
        .where(func.date(Evaluation.created_at) == today)
        .group_by(Formation.id, Formation.code, Formation.name)
    )

    counts = [DailyEtatCount.model_validate(row._asdict()) for row in db.execute(etat_stmt).all()]
    scores = [
        DailyFormationScore.model_validate(
            {**row._asdict(), "avg_score_100": float(row.avg_score_100 or 0)}
        )
        for row in db.execute(score_stmt).all()
    ]

    return DailyReportResponse(counts_by_etat=counts, avg_scores_by_formation=scores)
