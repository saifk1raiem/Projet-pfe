from pydantic import BaseModel

from app.models.enums import EtatQualifies


class DailyEtatCount(BaseModel):
    formation_id: int
    formation_code: str
    formation_name: str
    etat_qualifies: EtatQualifies
    total: int


class DailyFormationScore(BaseModel):
    formation_id: int
    formation_code: str
    formation_name: str
    avg_score_100: float


class DailyReportResponse(BaseModel):
    counts_by_etat: list[DailyEtatCount]
    avg_scores_by_formation: list[DailyFormationScore]
