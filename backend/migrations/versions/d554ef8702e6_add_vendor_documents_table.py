"""add_vendor_documents_table

Revision ID: d554ef8702e6
Revises: a2c4e6f8b1d3
Create Date: 2026-02-26 12:44:19.545452

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "d554ef8702e6"
down_revision: Union[str, Sequence[str], None] = "a2c4e6f8b1d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Drop old vendor_documents table if it exists from a previous schema
    op.execute("DROP TABLE IF EXISTS vendor_documents CASCADE")
    # Also drop leftover tables from a previous schema version
    for tbl in (
        "vendor_capabilities_profiles",
        "vendor_performance_metrics",
        "vendor_services",
        "vendor_contacts",
        "vendor_products",
        "vendor_locations",
        "vendor_certifications",
    ):
        op.execute(f"DROP TABLE IF EXISTS {tbl} CASCADE")

    op.create_table(
        "vendor_documents",
        sa.Column("id", sa.String(), nullable=False),
        sa.Column("vendor_id", sa.String(), nullable=False),
        sa.Column("document_url", sa.String(), nullable=False),
        sa.Column("document_name", sa.String(), nullable=True),
        sa.Column("issued_to", sa.String(), nullable=True),
        sa.Column("issuing_authority", sa.String(), nullable=True),
        sa.Column("issue_date", sa.String(), nullable=True),
        sa.Column("expiry_date", sa.String(), nullable=True),
        sa.Column("document_summary", sa.Text(), nullable=True),
        sa.Column("document_type", sa.String(), nullable=True),
        sa.Column("processing_status", sa.String(), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=True),
        sa.ForeignKeyConstraint(["vendor_id"], ["vendors.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_vendor_documents_id", "vendor_documents", ["id"])
    op.create_index("ix_vendor_documents_vendor_id", "vendor_documents", ["vendor_id"])


def downgrade() -> None:
    op.drop_index("ix_vendor_documents_vendor_id", table_name="vendor_documents")
    op.drop_index("ix_vendor_documents_id", table_name="vendor_documents")
    op.drop_table("vendor_documents")
