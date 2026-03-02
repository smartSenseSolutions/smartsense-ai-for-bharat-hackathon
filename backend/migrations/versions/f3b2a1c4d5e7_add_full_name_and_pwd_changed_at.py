"""Add full_name and password_last_changed_at to users table

Revision ID: f3b2a1c4d5e7
Revises: e2a1b3c4d5f6
Create Date: 2026-03-02 14:30:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f3b2a1c4d5e7"
down_revision: Union[str, Sequence[str], None] = "b2c3d4e5f6a7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("full_name", sa.String(), nullable=True),
    )
    op.add_column(
        "users",
        sa.Column("password_last_changed_at", sa.DateTime(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "password_last_changed_at")
    op.drop_column("users", "full_name")
