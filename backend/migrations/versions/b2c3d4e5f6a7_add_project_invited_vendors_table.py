"""Add project_invited_vendors table

Revision ID: b2c3d4e5f6a7
Revises: 187d5a4fbf91
Create Date: 2026-03-02 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "b2c3d4e5f6a7"
down_revision: Union[str, None] = "e2a1b3c4d5f6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "project_invited_vendors",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("project_id", sa.String(), nullable=False),
        sa.Column("vendor_id", sa.String(), nullable=True),
        sa.Column("vendor_name", sa.String(), nullable=False),
        sa.Column("contact_email", sa.String(), nullable=True),
        sa.Column("products", sa.String(), nullable=True),
        sa.Column("invited_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["project_id"], ["projects.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        op.f("ix_project_invited_vendors_id"),
        "project_invited_vendors",
        ["id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_project_invited_vendors_project_id"),
        "project_invited_vendors",
        ["project_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_project_invited_vendors_project_id"),
        table_name="project_invited_vendors",
    )
    op.drop_index(
        op.f("ix_project_invited_vendors_id"),
        table_name="project_invited_vendors",
    )
    op.drop_table("project_invited_vendors")
