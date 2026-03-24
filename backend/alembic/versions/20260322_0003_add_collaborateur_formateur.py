"""add formateur column to collaborateurs

Revision ID: 20260322_0003
Revises: 20260322_0002
Create Date: 2026-03-22 00:30:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260322_0003"
down_revision: Union[str, None] = "20260322_0002"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("collaborateurs", sa.Column("formateur", sa.String(length=150), nullable=True))


def downgrade() -> None:
    op.drop_column("collaborateurs", "formateur")
