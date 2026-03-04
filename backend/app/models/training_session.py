from datetime import date

from sqlalchemy import Date, Enum, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import SessionStatus


class TrainingSession(Base):
    __tablename__ = "sessions"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    formation_id: Mapped[int] = mapped_column(ForeignKey("formations.id", ondelete="CASCADE"), nullable=False)
    formateur_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"), nullable=False)
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    location: Mapped[str] = mapped_column(String(150), nullable=False)
    status: Mapped[SessionStatus] = mapped_column(
        Enum(SessionStatus, name="session_status", native_enum=False), nullable=False
    )

    formation: Mapped["Formation"] = relationship(back_populates="sessions")
    formateur: Mapped["User"] = relationship(back_populates="trainer_sessions")
    enrollments: Mapped[list["Enrollment"]] = relationship(back_populates="session")
    evaluations: Mapped[list["Evaluation"]] = relationship(back_populates="session")
