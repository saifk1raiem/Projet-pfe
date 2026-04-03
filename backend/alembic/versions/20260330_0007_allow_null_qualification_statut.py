"""allow null statut in qualification

Revision ID: 20260330_0007
Revises: 20260330_0006
Create Date: 2026-03-30 00:45:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260330_0007"
down_revision: Union[str, None] = "20260330_0006"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "qualification",
        "statut",
        existing_type=sa.String(length=20),
        nullable=True,
    )
    op.execute(
        """
        UPDATE qualification
        SET statut = NULL
        WHERE formation_id IS NULL
          AND statut IN ('Non associee', 'Non associe')
        """
    )


def downgrade() -> None:
    op.execute("UPDATE qualification SET statut = 'Non associee' WHERE statut IS NULL")
    op.alter_column(
        "qualification",
        "statut",
        existing_type=sa.String(length=20),
        nullable=False,
    )
