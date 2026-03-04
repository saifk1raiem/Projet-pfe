"""initial schema

Revision ID: 20260304_0001
Revises:
Create Date: 2026-03-04 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260304_0001"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "users",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("first_name", sa.String(length=100), nullable=False),
        sa.Column("last_name", sa.String(length=100), nullable=False),
        sa.Column("email", sa.String(length=150), nullable=False),
        sa.Column("password_hash", sa.String(), nullable=False),
        sa.Column(
            "role",
            sa.Enum(
                "admin",
                "observer",
                name="user_role",
                native_enum=False,
            ),
            nullable=False,
        ),
        sa.Column("is_active", sa.Boolean(), server_default="true", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_users_email"), "users", ["email"], unique=True)
    op.create_index(op.f("ix_users_id"), "users", ["id"], unique=False)

    op.create_table(
        "formations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("code", sa.String(length=50), nullable=False),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("field", sa.String(length=100), nullable=False),
        sa.Column("duration_days", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_formations_code"), "formations", ["code"], unique=True)
    op.create_index(op.f("ix_formations_id"), "formations", ["id"], unique=False)

    op.create_table(
        "sessions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("formation_id", sa.Integer(), nullable=False),
        sa.Column("formateur_id", sa.Integer(), nullable=False),
        sa.Column("start_date", sa.Date(), nullable=False),
        sa.Column("end_date", sa.Date(), nullable=False),
        sa.Column("location", sa.String(length=150), nullable=False),
        sa.Column(
            "status",
            sa.Enum("planned", "ongoing", "done", "canceled", name="session_status", native_enum=False),
            nullable=False,
        ),
        sa.ForeignKeyConstraint(["formation_id"], ["formations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["formateur_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_sessions_id"), "sessions", ["id"], unique=False)

    op.create_table(
        "enrollments",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("collaborateur_id", sa.Integer(), nullable=False),
        sa.Column(
            "etat_qualifies",
            sa.Enum(
                "en_cours",
                "non_associee",
                "depassement",
                "qualifie",
                name="etat_qualifies",
                native_enum=False,
            ),
            server_default="en_cours",
            nullable=False,
        ),
        sa.Column("assigned_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(["collaborateur_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_id", "collaborateur_id", name="uq_enrollment_session_collab"),
    )
    op.create_index(op.f("ix_enrollments_id"), "enrollments", ["id"], unique=False)

    op.create_table(
        "evaluations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("session_id", sa.Integer(), nullable=False),
        sa.Column("collaborateur_id", sa.Integer(), nullable=False),
        sa.Column("formateur_id", sa.Integer(), nullable=False),
        sa.Column("score_100", sa.Integer(), nullable=False),
        sa.Column("stars", sa.Integer(), nullable=False),
        sa.Column("comment", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.CheckConstraint("score_100 >= 0 AND score_100 <= 100", name="ck_score_100"),
        sa.CheckConstraint("stars >= 1 AND stars <= 5", name="ck_stars"),
        sa.ForeignKeyConstraint(["collaborateur_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["formateur_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["session_id"], ["sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("session_id", "collaborateur_id", name="uq_eval_session_collab"),
    )
    op.create_index(op.f("ix_evaluations_id"), "evaluations", ["id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_evaluations_id"), table_name="evaluations")
    op.drop_table("evaluations")
    op.drop_index(op.f("ix_enrollments_id"), table_name="enrollments")
    op.drop_table("enrollments")
    op.drop_index(op.f("ix_sessions_id"), table_name="sessions")
    op.drop_table("sessions")
    op.drop_index(op.f("ix_formations_id"), table_name="formations")
    op.drop_index(op.f("ix_formations_code"), table_name="formations")
    op.drop_table("formations")
    op.drop_index(op.f("ix_users_id"), table_name="users")
    op.drop_index(op.f("ix_users_email"), table_name="users")
    op.drop_table("users")
