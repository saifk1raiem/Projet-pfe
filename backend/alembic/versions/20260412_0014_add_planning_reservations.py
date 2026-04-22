"""add planning reservations

Revision ID: 20260412_0014
Revises: 20260411_0013
Create Date: 2026-04-12 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "20260412_0014"
down_revision: Union[str, None] = "20260411_0013"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


planning_period_enum = sa.Enum("morning", "evening", name="planning_period", native_enum=False)
planning_classroom_enum = sa.Enum(
    "class_1",
    "class_2",
    "intermediate",
    name="planning_classroom",
    native_enum=False,
)


def upgrade() -> None:
    planning_period_enum.create(op.get_bind(), checkfirst=True)
    planning_classroom_enum.create(op.get_bind(), checkfirst=True)

    op.create_table(
        "planning_reservations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("reservation_date", sa.Date(), nullable=False),
        sa.Column("period", planning_period_enum, nullable=False),
        sa.Column("effectif", sa.Integer(), nullable=False),
        sa.Column("practical_days", sa.Float(), server_default="2.5", nullable=False),
        sa.Column("theoretical_days", sa.Float(), server_default="2.5", nullable=False),
        sa.Column("created_by_id", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["created_by_id"], ["users.id"], ondelete="RESTRICT"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_planning_reservations_reservation_date",
        "planning_reservations",
        ["reservation_date"],
    )
    op.create_index("ix_planning_reservations_period", "planning_reservations", ["period"])
    op.create_index("ix_planning_reservations_id", "planning_reservations", ["id"])

    op.create_table(
        "planning_reservation_allocations",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("reservation_id", sa.Integer(), nullable=False),
        sa.Column("reservation_date", sa.Date(), nullable=False),
        sa.Column("period", planning_period_enum, nullable=False),
        sa.Column("classroom", planning_classroom_enum, nullable=False),
        sa.Column("assigned_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("CURRENT_TIMESTAMP"), nullable=False),
        sa.ForeignKeyConstraint(["reservation_id"], ["planning_reservations.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint(
            "reservation_date",
            "period",
            "classroom",
            name="uq_planning_reservation_allocation_slot",
        ),
    )
    op.create_index(
        "ix_planning_reservation_allocations_reservation_id",
        "planning_reservation_allocations",
        ["reservation_id"],
    )
    op.create_index(
        "ix_planning_reservation_allocations_reservation_date",
        "planning_reservation_allocations",
        ["reservation_date"],
    )
    op.create_index(
        "ix_planning_reservation_allocations_period",
        "planning_reservation_allocations",
        ["period"],
    )
    op.create_index("ix_planning_reservation_allocations_id", "planning_reservation_allocations", ["id"])


def downgrade() -> None:
    op.drop_index("ix_planning_reservation_allocations_id", table_name="planning_reservation_allocations")
    op.drop_index("ix_planning_reservation_allocations_period", table_name="planning_reservation_allocations")
    op.drop_index(
        "ix_planning_reservation_allocations_reservation_date",
        table_name="planning_reservation_allocations",
    )
    op.drop_index(
        "ix_planning_reservation_allocations_reservation_id",
        table_name="planning_reservation_allocations",
    )
    op.drop_table("planning_reservation_allocations")

    op.drop_index("ix_planning_reservations_id", table_name="planning_reservations")
    op.drop_index("ix_planning_reservations_period", table_name="planning_reservations")
    op.drop_index("ix_planning_reservations_reservation_date", table_name="planning_reservations")
    op.drop_table("planning_reservations")

    planning_classroom_enum.drop(op.get_bind(), checkfirst=True)
    planning_period_enum.drop(op.get_bind(), checkfirst=True)
