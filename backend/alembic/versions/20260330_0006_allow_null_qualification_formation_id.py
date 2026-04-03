"""allow null formation_id in qualification

Revision ID: 20260330_0006
Revises: 20260330_0005
Create Date: 2026-03-30 00:30:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260330_0006"
down_revision: Union[str, None] = "20260330_0005"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        "qualification",
        "formation_id",
        existing_type=sa.Integer(),
        nullable=True,
    )


def downgrade() -> None:
    op.execute("DELETE FROM qualification WHERE formation_id IS NULL")
    op.alter_column(
        "qualification",
        "formation_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
