"""add motif column to qualification

Revision ID: 20260326_0004
Revises: 20260322_0003
Create Date: 2026-03-26 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260326_0004"
down_revision: Union[str, None] = "20260322_0003"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("qualification", sa.Column("motif", sa.Text(), nullable=True))


def downgrade() -> None:
    op.drop_column("qualification", "motif")
