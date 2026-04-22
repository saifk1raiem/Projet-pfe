from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base
from app.models.enums import UserRole


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    first_name: Mapped[str] = mapped_column(String(100), nullable=False)
    last_name: Mapped[str] = mapped_column(String(100), nullable=False)
    username: Mapped[str | None] = mapped_column(String(100), unique=True, index=True, nullable=True)
    email: Mapped[str] = mapped_column(String(150), unique=True, index=True, nullable=False)
    avatar_url: Mapped[str | None] = mapped_column(Text, nullable=True)
    password_hash: Mapped[str] = mapped_column(String, nullable=False)
    role: Mapped[UserRole] = mapped_column(
        Enum(UserRole, name="user_role", native_enum=False), nullable=False
    )
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True, server_default="true")
    password_reset_code_hash: Mapped[str | None] = mapped_column(String, nullable=True)
    password_reset_code_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
    )

    trainer_sessions: Mapped[list["TrainingSession"]] = relationship(
        back_populates="formateur", foreign_keys="TrainingSession.formateur_id"
    )
    enrollments: Mapped[list["Enrollment"]] = relationship(back_populates="collaborateur")
    evaluations_as_formateur: Mapped[list["Evaluation"]] = relationship(
        back_populates="formateur", foreign_keys="Evaluation.formateur_id"
    )
    evaluations_as_collaborateur: Mapped[list["Evaluation"]] = relationship(
        back_populates="collaborateur", foreign_keys="Evaluation.collaborateur_id"
    )
    planning_reservations: Mapped[list["PlanningReservation"]] = relationship(
        back_populates="created_by", foreign_keys="PlanningReservation.created_by_id"
    )
