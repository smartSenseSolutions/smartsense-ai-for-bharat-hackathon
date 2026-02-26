"""add vendor onboarding fields

Revision ID: a2c4e6f8b1d3
Revises: 231f84ca83ec
Create Date: 2026-02-26 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "a2c4e6f8b1d3"
down_revision: Union[str, Sequence[str], None] = "231f84ca83ec"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("vendors", sa.Column("location", sa.String(), nullable=True))
    op.add_column("vendors", sa.Column("estd", sa.Integer(), nullable=True))
    op.add_column("vendors", sa.Column("mobile", sa.String(), nullable=True))
    op.add_column("vendors", sa.Column("website", sa.String(), nullable=True))
    op.add_column("vendors", sa.Column("certificates", sa.JSON(), nullable=True))
    op.add_column("vendors", sa.Column("products", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("vendors", "products")
    op.drop_column("vendors", "certificates")
    op.drop_column("vendors", "website")
    op.drop_column("vendors", "mobile")
    op.drop_column("vendors", "estd")
    op.drop_column("vendors", "location")
