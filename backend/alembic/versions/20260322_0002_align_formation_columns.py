"""align formation columns with current model

Revision ID: 20260322_0002
Revises: 20260304_0001
Create Date: 2026-03-22 00:00:00
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260322_0002"
down_revision: Union[str, None] = "20260304_0001"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column("formations", "code", new_column_name="code_formation")
    op.alter_column("formations", "name", new_column_name="nom_formation", type_=sa.String(length=150))
    op.alter_column("formations", "field", new_column_name="domaine", existing_type=sa.String(length=100), nullable=True)
    op.alter_column("formations", "duration_days", new_column_name="duree_jours", existing_type=sa.Integer(), nullable=True)

    op.drop_index(op.f("ix_formations_code"), table_name="formations")
    op.create_index(op.f("ix_formations_code_formation"), "formations", ["code_formation"], unique=True)


def downgrade() -> None:
    op.drop_index(op.f("ix_formations_code_formation"), table_name="formations")
    op.create_index(op.f("ix_formations_code"), "formations", ["code"], unique=True)

    op.alter_column("formations", "duree_jours", new_column_name="duration_days", existing_type=sa.Integer(), nullable=False)
    op.alter_column("formations", "domaine", new_column_name="field", existing_type=sa.String(length=100), nullable=False)
    op.alter_column("formations", "nom_formation", new_column_name="name", type_=sa.String(length=200))
    op.alter_column("formations", "code_formation", new_column_name="code")
