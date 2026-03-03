"""Add rfp_expiry column to projects table

Revision ID: a1b2c3d4e5f6
Revises: f3b2a1c4d5e7
Create Date: 2026-03-02 17:50:00.000000

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "a1b2c3d4e5f6"
down_revision: Union[str, Sequence[str], None] = "f3b2a1c4d5e7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("projects", sa.Column("rfp_expiry", sa.String(), nullable=True))


def downgrade() -> None:
    op.drop_column("projects", "rfp_expiry")
