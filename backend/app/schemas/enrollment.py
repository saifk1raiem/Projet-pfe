from datetime import datetime

from pydantic import BaseModel

from app.models.enums import EtatQualifies
from app.schemas.formation import FormationRead
from app.schemas.training_session import SessionRead


class EnrollmentCreate(BaseModel):
    collaborateur_id: int
    etat_qualifies: EtatQualifies = EtatQualifies.en_cours


class EnrollmentEtatUpdate(BaseModel):
    etat_qualifies: EtatQualifies


class EnrollmentRead(BaseModel):
    id: int
    session_id: int
    collaborateur_id: int
    etat_qualifies: EtatQualifies
    assigned_at: datetime

    model_config = {"from_attributes": True}


class MyEnrollmentRead(EnrollmentRead):
    session: SessionRead
    formation: FormationRead
