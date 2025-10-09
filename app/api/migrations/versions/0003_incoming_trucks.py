"""Add incoming truck tracking tables."""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "0003_incoming_trucks"
down_revision = "0002_add_sale_ocr_payload"
branch_labels = None
depends_on = None


incoming_truck_status_enum = sa.Enum(
    "scheduled",
    "arrived",
    "unloading",
    "completed",
    "cancelled",
    name="incoming_truck_status_enum",
)
incoming_truck_update_type_enum = sa.Enum(
    "status",
    "note",
    "line_progress",
    name="incoming_truck_update_type_enum",
)


def upgrade() -> None:
    bind = op.get_bind()
    incoming_truck_status_enum.create(bind, checkfirst=True)
    incoming_truck_update_type_enum.create(bind, checkfirst=True)

    op.create_table(
        "incoming_truck",
        sa.Column("truck_id", sa.Integer, primary_key=True),
        sa.Column("po_id", sa.Integer, sa.ForeignKey("po.po_id"), nullable=False),
        sa.Column("reference", sa.String(length=100), nullable=False),
        sa.Column("carrier", sa.String(length=100)),
        sa.Column(
            "status",
            incoming_truck_status_enum,
            nullable=False,
            server_default="scheduled",
        ),
        sa.Column("scheduled_arrival", sa.DateTime),
        sa.Column("arrived_at", sa.DateTime),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("idx_incoming_truck_po", "incoming_truck", ["po_id"])

    op.create_table(
        "incoming_truck_line",
        sa.Column("truck_line_id", sa.Integer, primary_key=True),
        sa.Column(
            "truck_id",
            sa.Integer,
            sa.ForeignKey("incoming_truck.truck_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "po_line_id",
            sa.Integer,
            sa.ForeignKey("po_line.po_line_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "item_id",
            sa.Integer,
            sa.ForeignKey("item.item_id"),
            nullable=False,
        ),
        sa.Column("description", sa.Text),
        sa.Column("qty_expected", sa.Numeric(10, 2)),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index("idx_incoming_truck_line_truck", "incoming_truck_line", ["truck_id"])
    op.create_index("idx_incoming_truck_line_po_line", "incoming_truck_line", ["po_line_id"])

    op.create_table(
        "incoming_truck_update",
        sa.Column("update_id", sa.Integer, primary_key=True),
        sa.Column(
            "truck_id",
            sa.Integer,
            sa.ForeignKey("incoming_truck.truck_id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "update_type",
            incoming_truck_update_type_enum,
            nullable=False,
        ),
        sa.Column("message", sa.Text),
        sa.Column("status", incoming_truck_status_enum.copy(), nullable=True),
        sa.Column(
            "po_line_id",
            sa.Integer,
            sa.ForeignKey("po_line.po_line_id"),
        ),
        sa.Column(
            "item_id",
            sa.Integer,
            sa.ForeignKey("item.item_id"),
        ),
        sa.Column("quantity", sa.Numeric(10, 2)),
        sa.Column("created_by", sa.String(length=100)),
        sa.Column("created_at", sa.DateTime, server_default=sa.func.now()),
    )
    op.create_index(
        "idx_incoming_truck_update_truck_created",
        "incoming_truck_update",
        ["truck_id", "created_at"],
    )
    op.create_index(
        "idx_incoming_truck_update_po_line",
        "incoming_truck_update",
        ["po_line_id"],
    )
    op.create_index(
        "idx_incoming_truck_update_item",
        "incoming_truck_update",
        ["item_id"],
    )


def downgrade() -> None:
    op.drop_index("idx_incoming_truck_update_item", table_name="incoming_truck_update")
    op.drop_index("idx_incoming_truck_update_po_line", table_name="incoming_truck_update")
    op.drop_index("idx_incoming_truck_update_truck_created", table_name="incoming_truck_update")
    op.drop_table("incoming_truck_update")

    op.drop_index("idx_incoming_truck_line_po_line", table_name="incoming_truck_line")
    op.drop_index("idx_incoming_truck_line_truck", table_name="incoming_truck_line")
    op.drop_table("incoming_truck_line")

    op.drop_index("idx_incoming_truck_po", table_name="incoming_truck")
    op.drop_table("incoming_truck")

    bind = op.get_bind()
    incoming_truck_update_type_enum.drop(bind, checkfirst=True)
    incoming_truck_status_enum.drop(bind, checkfirst=True)
