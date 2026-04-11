from datetime import datetime

from sqlalchemy import Boolean, DateTime, Float, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql import func

from app.db.base import Base


class CollaborateurRisk(Base):
    __tablename__ = "collaborateur_risk"
    __table_args__ = (
        UniqueConstraint("matricule", name="uq_collaborateur_risk_matricule"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    matricule: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("collaborateurs.matricule", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    prob_leave: Mapped[float] = mapped_column(Float, nullable=False)
    risk_bucket: Mapped[str] = mapped_column(String(12), nullable=False)
    model_version: Mapped[str | None] = mapped_column(String(40), nullable=True)
    scored_at: Mapped[datetime] = mapped_column(
        DateTime,
        server_default=func.now(),
        nullable=False,
    )
    drivers: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    feature_snapshot: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    days_since_last_seen: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_recently_active: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
