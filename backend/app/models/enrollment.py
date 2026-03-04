from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import EtatQualifies


class Enrollment(Base):
    __tablename__ = "enrollments"
    __table_args__ = (UniqueConstraint("session_id", "collaborateur_id", name="uq_enrollment_session_collab"),)

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    collaborateur_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    etat_qualifies: Mapped[EtatQualifies] = mapped_column(
        Enum(EtatQualifies, name="etat_qualifies", native_enum=False),
        nullable=False,
        default=EtatQualifies.en_cours,
        server_default=EtatQualifies.en_cours.value,
    )
    assigned_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    session: Mapped["TrainingSession"] = relationship(back_populates="enrollments")
    collaborateur: Mapped["User"] = relationship(back_populates="enrollments")
