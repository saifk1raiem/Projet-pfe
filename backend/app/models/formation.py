from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class Formation(Base):
    __tablename__ = "formations"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)
    code: Mapped[str] = mapped_column("code_formation", String(50), unique=True, nullable=False, index=True)
    name: Mapped[str] = mapped_column("nom_formation", String(150), nullable=False)
    field: Mapped[str | None] = mapped_column("domaine", String(100), nullable=True)
    duration_days: Mapped[int | None] = mapped_column("duree_jours", Integer, nullable=True)

    sessions: Mapped[list["TrainingSession"]] = relationship(back_populates="formation")
