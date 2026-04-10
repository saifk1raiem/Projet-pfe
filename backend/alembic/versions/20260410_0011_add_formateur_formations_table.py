"""add formateur formations table

Revision ID: 20260410_0011
Revises: 20260406_0010
Create Date: 2026-04-10 14:20:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260410_0011"
down_revision: Union[str, None] = "20260406_0010"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "formateur_formations",
        sa.Column("formateur_id", sa.Integer(), nullable=False),
        sa.Column("formation_id", sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(["formateur_id"], ["formateurs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["formation_id"], ["formations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("formateur_id", "formation_id"),
    )
    op.create_index(
        "ix_formateur_formations_formation_id",
        "formateur_formations",
        ["formation_id"],
        unique=False,
    )

    op.execute(
        """
        INSERT INTO formateur_formations (formateur_id, formation_id)
        SELECT DISTINCT formateur_id, formation_id
        FROM qualification
        WHERE formateur_id IS NOT NULL
          AND formation_id IS NOT NULL
        """
    )


def downgrade() -> None:
    op.drop_index("ix_formateur_formations_formation_id", table_name="formateur_formations")
    op.drop_table("formateur_formations")
