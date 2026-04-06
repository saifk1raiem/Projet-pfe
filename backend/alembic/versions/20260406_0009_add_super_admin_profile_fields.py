"""add super admin role and profile fields

Revision ID: 20260406_0009
Revises: 20260406_0008
Create Date: 2026-04-06 12:20:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260406_0009"
down_revision: Union[str, None] = "20260406_0008"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("users", sa.Column("username", sa.String(length=100), nullable=True))
    op.add_column("users", sa.Column("avatar_url", sa.Text(), nullable=True))
    op.create_index(op.f("ix_users_username"), "users", ["username"], unique=True)

    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS user_role")
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_role")
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(11)")
    op.execute(
        """
        UPDATE users
        SET role = 'super_admin'
        WHERE id = (
            SELECT id
            FROM users
            WHERE role = 'admin'
            ORDER BY id
            LIMIT 1
        )
        """
    )
    op.create_check_constraint(
        "ck_users_role",
        "users",
        "role IN ('super_admin', 'admin', 'observer')",
    )
    op.execute(
        """
        CREATE UNIQUE INDEX IF NOT EXISTS uq_users_single_super_admin
        ON users (role)
        WHERE role = 'super_admin'
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS uq_users_single_super_admin")
    op.execute("ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_role")
    op.execute("UPDATE users SET role = 'admin' WHERE role = 'super_admin'")
    op.execute("ALTER TABLE users ALTER COLUMN role TYPE VARCHAR(8)")
    op.create_check_constraint(
        "user_role",
        "users",
        "role IN ('admin', 'observer')",
    )
    op.drop_index(op.f("ix_users_username"), table_name="users")
    op.drop_column("users", "avatar_url")
    op.drop_column("users", "username")
