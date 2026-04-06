"""add password reset fields to users

Revision ID: 20260406_0008
Revises: 20260330_0007
Create Date: 2026-04-06 11:10:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260406_0008"
down_revision: Union[str, None] = "20260330_0007"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("password_reset_code_hash", sa.String(), nullable=True))
    op.add_column("users", sa.Column("password_reset_code_expires_at", sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column("users", "password_reset_code_expires_at")
    op.drop_column("users", "password_reset_code_hash")
