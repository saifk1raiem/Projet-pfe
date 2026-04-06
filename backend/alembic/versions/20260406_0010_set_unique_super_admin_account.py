"""set aymen account as unique super admin

Revision ID: 20260406_0010
Revises: 20260406_0009
Create Date: 2026-04-06 12:55:00
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "20260406_0010"
down_revision: Union[str, None] = "20260406_0009"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


SUPER_ADMIN_EMAIL = "aymen.horchani@leoni.com"


def upgrade() -> None:
    op.execute(
        f"""
        UPDATE users
        SET role = 'admin'
        WHERE role = 'super_admin'
          AND lower(email) <> lower('{SUPER_ADMIN_EMAIL}')
        """
    )
    op.execute(
        f"""
        UPDATE users
        SET role = 'super_admin'
        WHERE lower(email) = lower('{SUPER_ADMIN_EMAIL}')
        """
    )


def downgrade() -> None:
    op.execute(
        f"""
        UPDATE users
        SET role = 'admin'
        WHERE lower(email) = lower('{SUPER_ADMIN_EMAIL}')
        """
    )
