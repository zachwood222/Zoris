"""Add editing fields to sale"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "0006_sale_editing_fields"
down_revision: Union[str, None] = "0005_add_vendor_model_to_items"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("sale", sa.Column("payment_method", sa.String(length=50), nullable=True))
    op.add_column("sale", sa.Column("fulfillment_type", sa.String(length=20), nullable=True))
    op.add_column("sale", sa.Column("delivery_fee", sa.Numeric(10, 2), nullable=False, server_default="0"))
    op.execute("UPDATE sale SET delivery_fee = 0 WHERE delivery_fee IS NULL")
    op.alter_column("sale", "delivery_fee", server_default=None)


def downgrade() -> None:
    op.drop_column("sale", "delivery_fee")
    op.drop_column("sale", "fulfillment_type")
    op.drop_column("sale", "payment_method")
