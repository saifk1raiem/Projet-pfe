from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Evaluation(Base):
    __tablename__ = "evaluations"
    __table_args__ = (
        CheckConstraint("score_100 >= 0 AND score_100 <= 100", name="ck_score_100"),
        CheckConstraint("stars >= 1 AND stars <= 5", name="ck_stars"),
        UniqueConstraint("session_id", "collaborateur_id", name="uq_eval_session_collab"),
    )

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    session_id: Mapped[int] = mapped_column(ForeignKey("sessions.id", ondelete="CASCADE"), nullable=False)
    collaborateur_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    formateur_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    score_100: Mapped[int] = mapped_column(Integer, nullable=False)
    stars: Mapped[int] = mapped_column(Integer, nullable=False)
    comment: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

    session: Mapped["TrainingSession"] = relationship(back_populates="evaluations")
    collaborateur: Mapped["User"] = relationship(
        back_populates="evaluations_as_collaborateur", foreign_keys=[collaborateur_id]
    )
    formateur: Mapped["User"] = relationship(
        back_populates="evaluations_as_formateur", foreign_keys=[formateur_id]
    )
