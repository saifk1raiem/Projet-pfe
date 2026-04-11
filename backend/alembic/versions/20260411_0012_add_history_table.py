"""add history table

Revision ID: 20260411_0012
Revises: 20260410_0011
Create Date: 2026-04-11 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260411_0012"
down_revision: Union[str, None] = "20260410_0011"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "history",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("matricule", sa.String(length=50), nullable=False),
        sa.Column("nature", sa.String(length=50), nullable=True),
        sa.Column("entree_sorie", sa.String(length=50), nullable=True),
        sa.Column("heures_de_présences", sa.Integer(), nullable=True),
        sa.Column("motif", sa.String(length=50), nullable=True),
        sa.Column("eff_actif", sa.Integer(), nullable=True),
        sa.Column("eff_présente", sa.Integer(), nullable=True),
        sa.Column("eff_mr", sa.Integer(), nullable=True),
        sa.Column("abs_p_par_per", sa.Integer(), nullable=True),
        sa.Column("abs_np_par", sa.Integer(), nullable=True),
        sa.Column("nbr_de_retard", sa.Integer(), nullable=True),
        sa.Column("heurs_sup", sa.Integer(), nullable=True),
        sa.Column("moin", sa.String(length=50), nullable=False),
        sa.Column("jour", sa.String(length=50), nullable=False),
        sa.ForeignKeyConstraint(["matricule"], ["collaborateurs.matricule"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("matricule", "moin", "jour", name="uq_history_matricule_moin_jour"),
    )
    op.create_index(op.f("ix_history_matricule"), "history", ["matricule"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_history_matricule"), table_name="history")
    op.drop_table("history")
