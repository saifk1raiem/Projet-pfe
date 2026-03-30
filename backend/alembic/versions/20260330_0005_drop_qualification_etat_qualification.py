"""drop etat_qualification from qualification

Revision ID: 20260330_0005
Revises: 20260326_0004
Create Date: 2026-03-30 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260330_0005"
down_revision: Union[str, None] = "20260326_0004"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.drop_column("qualification", "etat_qualification")


def downgrade() -> None:
    op.add_column("qualification", sa.Column("etat_qualification", sa.String(length=30), nullable=True))
