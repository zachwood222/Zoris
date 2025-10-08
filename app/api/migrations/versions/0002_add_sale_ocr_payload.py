"""Add OCR payload storage to sales."""

from alembic import op
import sqlalchemy as sa

revision = "0002_add_sale_ocr_payload"
down_revision = "0001_initial"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("sale", sa.Column("ocr_payload", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("sale", "ocr_payload")
