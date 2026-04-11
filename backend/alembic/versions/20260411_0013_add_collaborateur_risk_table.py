"""add collaborateur risk table

Revision ID: 20260411_0013
Revises: 20260411_0012
Create Date: 2026-04-11 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260411_0013"
down_revision: Union[str, None] = "20260411_0012"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "collaborateur_risk",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("matricule", sa.String(length=50), nullable=False),
        sa.Column("prob_leave", sa.Float(), nullable=False),
        sa.Column("risk_bucket", sa.String(length=12), nullable=False),
        sa.Column("model_version", sa.String(length=40), nullable=True),
        sa.Column("scored_at", sa.DateTime(), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("drivers", sa.JSON(), nullable=True),
        sa.Column("feature_snapshot", sa.JSON(), nullable=True),
        sa.Column("days_since_last_seen", sa.Integer(), nullable=True),
        sa.Column("is_recently_active", sa.Boolean(), nullable=True),
        sa.ForeignKeyConstraint(["matricule"], ["collaborateurs.matricule"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("matricule", name="uq_collaborateur_risk_matricule"),
    )
    op.create_index("ix_collaborateur_risk_matricule", "collaborateur_risk", ["matricule"])


def downgrade() -> None:
    op.drop_index("ix_collaborateur_risk_matricule", table_name="collaborateur_risk")
    op.drop_table("collaborateur_risk")
