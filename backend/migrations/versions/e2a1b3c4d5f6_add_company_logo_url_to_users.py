"""Add company_logo_url to users table

Revision ID: e2a1b3c4d5f6
Revises: 187d5a4fbf91
Create Date: 2026-02-27 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e2a1b3c4d5f6"
down_revision: Union[str, Sequence[str], None] = "187d5a4fbf91"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column(
        "users",
        sa.Column("company_logo_url", sa.String(), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("users", "company_logo_url")
