"""add_unique_constraint_to_vendor_name

Revision ID: c3f9a1b2e4d7
Revises: 68e395a9695b
Create Date: 2026-02-27 00:00:00.000000

"""

from typing import Sequence, Union

from alembic import op

# revision identifiers, used by Alembic.
revision: str = "c3f9a1b2e4d7"
down_revision: Union[str, Sequence[str], None] = "68e395a9695b"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Delete duplicate vendor rows, keeping only the most recently created one per name.
    op.execute(
        """
        DELETE FROM vendors
        WHERE id NOT IN (
            SELECT DISTINCT ON (name) id
            FROM vendors
            ORDER BY name, created_at DESC NULLS LAST
        )
        """
    )
    op.create_unique_constraint("uq_vendors_name", "vendors", ["name"])


def downgrade() -> None:
    op.drop_constraint("uq_vendors_name", "vendors", type_="unique")
