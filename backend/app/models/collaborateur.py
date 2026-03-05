from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Collaborateur(Base):
    __tablename__ = "collaborateurs"

    matricule: Mapped[str] = mapped_column(String(20), primary_key=True)
    nom: Mapped[str] = mapped_column(String(150), nullable=False)
    prenom: Mapped[str] = mapped_column(String(150), nullable=False)
    fonction: Mapped[str | None] = mapped_column(String(100), nullable=True)
    centre_cout: Mapped[str | None] = mapped_column(String(50), nullable=True)
    groupe: Mapped[str | None] = mapped_column(String(50), nullable=True)
    competence: Mapped[str | None] = mapped_column(String(50), nullable=True)
    contre_maitre: Mapped[str | None] = mapped_column(String(100), nullable=True)
    segment: Mapped[str | None] = mapped_column(String(50), nullable=True)
    gender: Mapped[str | None] = mapped_column(String(10), nullable=True)
    num_tel: Mapped[str | None] = mapped_column(String(20), nullable=True)
    date_recrutement: Mapped[str | None] = mapped_column(String(20), nullable=True)
    anciennete: Mapped[int | None] = mapped_column(Integer, nullable=True)
