"""make qualification statut nullable

Revision ID: 20260326_0005
Revises: 20260326_0004
Create Date: 2026-03-26 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260326_0005"
down_revision: Union[str, None] = "20260326_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "qualification",
        "statut",
        existing_type=sa.String(length=20),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "qualification",
        "statut",
        existing_type=sa.String(length=20),
        nullable=False,
    )
