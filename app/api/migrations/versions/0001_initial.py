"""Initial schema."""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa

revision = "0001_initial"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "vendor",
        sa.Column("vendor_id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("terms", sa.String(length=255)),
        sa.Column("phone", sa.String(length=50)),
        sa.Column("email", sa.String(length=255)),
        sa.Column("address_json", sa.JSON),
        sa.Column("active", sa.Boolean, nullable=False, server_default=sa.text("true")),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_table(
        "item",
        sa.Column("item_id", sa.Integer, primary_key=True),
        sa.Column("sku", sa.String(length=64), nullable=False, unique=True),
        sa.Column("upc", sa.String(length=32), unique=True),
        sa.Column("description", sa.String(length=255), nullable=False),
        sa.Column("category", sa.String(length=100)),
        sa.Column("subcategory", sa.String(length=100)),
        sa.Column("unit_cost", sa.Numeric(10, 2), nullable=False),
        sa.Column("price", sa.Numeric(10, 2), nullable=False),
        sa.Column("tax_code", sa.String(length=50)),
        sa.Column("active", sa.Boolean, server_default=sa.text("true")),
        sa.Column("short_code", sa.String(length=4), unique=True, nullable=False),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_table(
        "location",
        sa.Column("location_id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("type", sa.Enum("floor", "backroom", "warehouse", name="location_type_enum")),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_table(
        "inventory",
        sa.Column("inv_id", sa.Integer, primary_key=True),
        sa.Column("item_id", sa.Integer, sa.ForeignKey("item.item_id")),
        sa.Column("location_id", sa.Integer, sa.ForeignKey("location.location_id")),
        sa.Column("qty_on_hand", sa.Numeric(10, 2), server_default="0"),
        sa.Column("qty_reserved", sa.Numeric(10, 2), server_default="0"),
        sa.Column("avg_cost", sa.Numeric(10, 2), server_default="0"),
        sa.Column("last_counted_at", sa.DateTime),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("idx_inventory_item_loc", "inventory", ["item_id", "location_id"], unique=True)
    op.create_table(
        "inventory_txn",
        sa.Column("txn_id", sa.Integer, primary_key=True),
        sa.Column("item_id", sa.Integer, sa.ForeignKey("item.item_id")),
        sa.Column("location_id", sa.Integer, sa.ForeignKey("location.location_id")),
        sa.Column("qty_delta", sa.Numeric(10, 2), nullable=False),
        sa.Column("reason", sa.Enum("receive", "sale", "adjust", "count", "transfer", name="inventory_reason_enum")),
        sa.Column("ref_type", sa.String(length=50)),
        sa.Column("ref_id", sa.Integer),
        sa.Column("unit_cost", sa.Numeric(10, 2)),
        sa.Column("created_by", sa.String(length=100)),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("idx_inv_txn_item_created", "inventory_txn", ["item_id", "created_at"])
    op.create_table(
        "po",
        sa.Column("po_id", sa.Integer, primary_key=True),
        sa.Column("vendor_id", sa.Integer, sa.ForeignKey("vendor.vendor_id")),
        sa.Column("status", sa.Enum("draft", "open", "partial", "received", "closed", name="po_status_enum"), server_default="draft"),
        sa.Column("expected_date", sa.DateTime),
        sa.Column("terms", sa.String(length=100)),
        sa.Column("notes", sa.Text),
        sa.Column("created_by", sa.String(length=100)),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_table(
        "po_line",
        sa.Column("po_line_id", sa.Integer, primary_key=True),
        sa.Column("po_id", sa.Integer, sa.ForeignKey("po.po_id")),
        sa.Column("item_id", sa.Integer, sa.ForeignKey("item.item_id")),
        sa.Column("description", sa.Text),
        sa.Column("qty_ordered", sa.Numeric(10, 2)),
        sa.Column("qty_received", sa.Numeric(10, 2), server_default="0"),
        sa.Column("unit_cost", sa.Numeric(10, 2)),
        sa.Column("discount", sa.Numeric(10, 2), server_default="0"),
        sa.Column("tax", sa.Numeric(10, 2), server_default="0"),
        sa.Column("landed_cost_alloc", sa.Numeric(10, 2), server_default="0"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_table(
        "receiving",
        sa.Column("receipt_id", sa.Integer, primary_key=True),
        sa.Column("po_id", sa.Integer, sa.ForeignKey("po.po_id")),
        sa.Column("received_at", sa.DateTime, server_default=sa.func.now()),
        sa.Column("received_by", sa.String(length=100)),
        sa.Column("doc_url", sa.Text),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_table(
        "receiving_line",
        sa.Column("receipt_line_id", sa.Integer, primary_key=True),
        sa.Column("receipt_id", sa.Integer, sa.ForeignKey("receiving.receipt_id")),
        sa.Column("po_line_id", sa.Integer, sa.ForeignKey("po_line.po_line_id")),
        sa.Column("item_id", sa.Integer, sa.ForeignKey("item.item_id")),
        sa.Column("qty_received", sa.Numeric(10, 2)),
        sa.Column("unit_cost", sa.Numeric(10, 2)),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_table(
        "customer",
        sa.Column("customer_id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(length=255)),
        sa.Column("phone", sa.String(length=50)),
        sa.Column("email", sa.String(length=255)),
        sa.Column("addr_json", sa.JSON),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_table(
        "sale",
        sa.Column("sale_id", sa.Integer, primary_key=True),
        sa.Column("customer_id", sa.Integer, sa.ForeignKey("customer.customer_id")),
        sa.Column("status", sa.Enum("draft", "open", "fulfilled", "void", name="sale_status_enum"), server_default="draft"),
        sa.Column("sale_date", sa.DateTime, server_default=sa.func.now()),
        sa.Column("subtotal", sa.Numeric(10, 2), server_default="0"),
        sa.Column("tax", sa.Numeric(10, 2), server_default="0"),
        sa.Column("total", sa.Numeric(10, 2), server_default="0"),
        sa.Column("deposit_amt", sa.Numeric(10, 2), server_default="0"),
        sa.Column("created_by", sa.String(length=100)),
        sa.Column("source", sa.String(length=50)),
        sa.Column("ocr_confidence", sa.Numeric(5, 4)),
        sa.Column("delivery_requested", sa.Boolean, server_default=sa.text("false")),
        sa.Column("delivery_status", sa.Enum("queued", "scheduled", "out_for_delivery", "delivered", "failed", name="delivery_status_enum")),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_table(
        "sale_line",
        sa.Column("sale_line_id", sa.Integer, primary_key=True),
        sa.Column("sale_id", sa.Integer, sa.ForeignKey("sale.sale_id")),
        sa.Column("item_id", sa.Integer, sa.ForeignKey("item.item_id")),
        sa.Column("location_id", sa.Integer, sa.ForeignKey("location.location_id")),
        sa.Column("qty", sa.Numeric(10, 2)),
        sa.Column("unit_price", sa.Numeric(10, 2)),
        sa.Column("discount", sa.Numeric(10, 2), server_default="0"),
        sa.Column("tax", sa.Numeric(10, 2), server_default="0"),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_table(
        "bill",
        sa.Column("bill_id", sa.Integer, primary_key=True),
        sa.Column("vendor_id", sa.Integer, sa.ForeignKey("vendor.vendor_id")),
        sa.Column("po_id", sa.Integer, sa.ForeignKey("po.po_id")),
        sa.Column("qb_bill_id", sa.String(length=100)),
        sa.Column("invoice_no", sa.String(length=100)),
        sa.Column("bill_date", sa.Date()),
        sa.Column("due_date", sa.Date()),
        sa.Column("subtotal", sa.Numeric(10, 2), server_default="0"),
        sa.Column("tax", sa.Numeric(10, 2), server_default="0"),
        sa.Column("freight", sa.Numeric(10, 2), server_default="0"),
        sa.Column("total", sa.Numeric(10, 2), server_default="0"),
        sa.Column("status", sa.Enum("draft", "exported", "paid", name="bill_status_enum"), server_default="draft"),
        sa.Column("doc_url", sa.Text),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_table(
        "barcode",
        sa.Column("barcode", sa.String(length=64), primary_key=True),
        sa.Column("item_id", sa.Integer, sa.ForeignKey("item.item_id")),
        sa.Column("type", sa.Enum("item", "variant", "lot", "serial", name="barcode_type_enum"), server_default="item"),
    )
    op.create_table(
        "attachment",
        sa.Column("attachment_id", sa.Integer, primary_key=True),
        sa.Column("ref_type", sa.Enum("sale", "po", "bill", "receiving", name="attachment_ref_enum")),
        sa.Column("ref_id", sa.Integer),
        sa.Column("file_url", sa.Text),
        sa.Column("kind", sa.Enum("photo_ticket", "signature", "delivery_photo", "vendor_invoice", "packing_slip", name="attachment_kind_enum")),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_table(
        "label_template",
        sa.Column("template_id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String(length=100), unique=True),
        sa.Column("target", sa.Enum("item", "bin", "delivery", name="label_target_enum")),
        sa.Column("dymo_label_xml", sa.Text),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table("label_template")
    op.drop_table("attachment")
    op.drop_table("barcode")
    op.drop_table("bill")
    op.drop_table("sale_line")
    op.drop_table("sale")
    op.drop_table("customer")
    op.drop_table("receiving_line")
    op.drop_table("receiving")
    op.drop_table("po_line")
    op.drop_table("po")
    op.drop_index("idx_inv_txn_item_created", table_name="inventory_txn")
    op.drop_table("inventory_txn")
    op.drop_index("idx_inventory_item_loc", table_name="inventory")
    op.drop_table("inventory")
    op.drop_table("location")
    op.drop_table("item")
    op.drop_table("vendor")
