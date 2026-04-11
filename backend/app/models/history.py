from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class History(Base):
    __tablename__ = "history"
    __table_args__ = (
        UniqueConstraint("matricule", "moin", "jour", name="uq_history_matricule_moin_jour"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    matricule: Mapped[str] = mapped_column(
        String(50),
        ForeignKey("collaborateurs.matricule", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    nature: Mapped[str | None] = mapped_column("nature", String(50), nullable=True)
    entree_sorie: Mapped[str | None] = mapped_column("entree_sorie", String(50), nullable=True)
    heures_de_presences: Mapped[int | None] = mapped_column("heures_de_présences", Integer, nullable=True)
    motif: Mapped[str | None] = mapped_column("motif", String(50), nullable=True)
    eff_actif: Mapped[int | None] = mapped_column("eff_actif", Integer, nullable=True)
    eff_presente: Mapped[int | None] = mapped_column("eff_présente", Integer, nullable=True)
    eff_mr: Mapped[int | None] = mapped_column("eff_mr", Integer, nullable=True)
    abs_p_par_per: Mapped[int | None] = mapped_column("abs_p_par_per", Integer, nullable=True)
    abs_np_par: Mapped[int | None] = mapped_column("abs_np_par", Integer, nullable=True)
    nbr_de_retard: Mapped[int | None] = mapped_column("nbr_de_retard", Integer, nullable=True)
    heurs_sup: Mapped[int | None] = mapped_column("heurs_sup", Integer, nullable=True)
    moin: Mapped[str] = mapped_column("moin", String(50), nullable=False)
    jour: Mapped[str] = mapped_column("jour", String(50), nullable=False)
