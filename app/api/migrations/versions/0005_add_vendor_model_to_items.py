"""Add vendor model number to items."""

from alembic import op
import sqlalchemy as sa


revision = "0005_add_vendor_model_to_items"
down_revision = "0004_add_external_refs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "item",
        sa.Column("vendor_model", sa.String(length=100), nullable=True),
    )


def downgrade() -> None:
    op.drop_column("item", "vendor_model")
