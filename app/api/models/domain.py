"""Domain models for the Zoris system."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    Enum,
    Float,
    ForeignKey,
    Index,
    Integer,
    JSON,
    Numeric,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from .base import Base, TimestampMixin


sale_status_enum = Enum(
    "draft",
    "open",
    "fulfilled",
    "void",
    name="sale_status_enum",
    create_constraint=True,
)
po_status_enum = Enum(
    "draft",
    "open",
    "partial",
    "received",
    "closed",
    name="po_status_enum",
    create_constraint=True,
)
inventory_reason_enum = Enum(
    "receive",
    "sale",
    "adjust",
    "count",
    "transfer",
    name="inventory_reason_enum",
    create_constraint=True,
)
delivery_status_enum = Enum(
    "queued",
    "scheduled",
    "out_for_delivery",
    "delivered",
    "failed",
    name="delivery_status_enum",
    create_constraint=True,
)
location_type_enum = Enum("floor", "backroom", "warehouse", name="location_type_enum")
barcode_type_enum = Enum("item", "variant", "lot", "serial", name="barcode_type_enum")
attachment_ref_enum = Enum("sale", "po", "bill", "receiving", name="attachment_ref_enum")
attachment_kind_enum = Enum(
    "photo_ticket",
    "signature",
    "delivery_photo",
    "vendor_invoice",
    "packing_slip",
    name="attachment_kind_enum",
)
label_target_enum = Enum("item", "bin", "delivery", name="label_target_enum")


class Vendor(Base, TimestampMixin):
    __tablename__ = "vendor"

    vendor_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str]
    terms: Mapped[Optional[str]]
    phone: Mapped[Optional[str]]
    email: Mapped[Optional[str]]
    address_json: Mapped[dict | None] = mapped_column(JSON)
    active: Mapped[bool] = mapped_column(Boolean, default=True)

    purchase_orders: Mapped[list["PurchaseOrder"]] = relationship(back_populates="vendor")


class Item(Base, TimestampMixin):
    __tablename__ = "item"
    __table_args__ = (UniqueConstraint("sku"), UniqueConstraint("upc"),)

    item_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sku: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    upc: Mapped[Optional[str]] = mapped_column(String(32), unique=True)
    description: Mapped[str] = mapped_column(String(255))
    category: Mapped[Optional[str]]
    subcategory: Mapped[Optional[str]]
    unit_cost: Mapped[float] = mapped_column(Numeric(10, 2))
    price: Mapped[float] = mapped_column(Numeric(10, 2))
    tax_code: Mapped[Optional[str]]
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    short_code: Mapped[str] = mapped_column(String(4), unique=True, index=True)

    barcodes: Mapped[list["Barcode"]] = relationship(back_populates="item")


class Location(Base, TimestampMixin):
    __tablename__ = "location"

    location_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str]
    type: Mapped[str] = mapped_column(location_type_enum)

    inventory: Mapped[list["Inventory"]] = relationship(back_populates="location")


class Inventory(Base, TimestampMixin):
    __tablename__ = "inventory"
    __table_args__ = (
        Index("idx_inventory_item_loc", "item_id", "location_id", unique=True),
    )

    inv_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("item.item_id"))
    location_id: Mapped[int] = mapped_column(ForeignKey("location.location_id"))
    qty_on_hand: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    qty_reserved: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    avg_cost: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    last_counted_at: Mapped[Optional[datetime]] = mapped_column(DateTime)

    item: Mapped[Item] = relationship()
    location: Mapped[Location] = relationship(back_populates="inventory")


class InventoryTxn(Base):
    __tablename__ = "inventory_txn"
    __table_args__ = (
        Index("idx_inv_txn_item_created", "item_id", "created_at"),
    )

    txn_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("item.item_id"))
    location_id: Mapped[int] = mapped_column(ForeignKey("location.location_id"))
    qty_delta: Mapped[float] = mapped_column(Numeric(10, 2))
    reason: Mapped[str] = mapped_column(inventory_reason_enum)
    ref_type: Mapped[Optional[str]]
    ref_id: Mapped[Optional[int]]
    unit_cost: Mapped[Optional[float]] = mapped_column(Numeric(10, 2))
    created_by: Mapped[Optional[str]]
    created_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)


class PurchaseOrder(Base, TimestampMixin):
    __tablename__ = "po"

    po_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendor.vendor_id"))
    status: Mapped[str] = mapped_column(po_status_enum, default="draft")
    expected_date: Mapped[Optional[datetime]] = mapped_column(DateTime)
    terms: Mapped[Optional[str]]
    notes: Mapped[Optional[str]]
    created_by: Mapped[str]

    vendor: Mapped[Vendor] = relationship(back_populates="purchase_orders")
    lines: Mapped[list["POLine"]] = relationship(back_populates="po", cascade="all, delete-orphan")
    receivings: Mapped[list["Receiving"]] = relationship(back_populates="po")


class POLine(Base, TimestampMixin):
    __tablename__ = "po_line"

    po_line_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    po_id: Mapped[int] = mapped_column(ForeignKey("po.po_id"))
    item_id: Mapped[int] = mapped_column(ForeignKey("item.item_id"))
    description: Mapped[str]
    qty_ordered: Mapped[float] = mapped_column(Numeric(10, 2))
    qty_received: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    unit_cost: Mapped[float] = mapped_column(Numeric(10, 2))
    discount: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    tax: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    landed_cost_alloc: Mapped[float] = mapped_column(Numeric(10, 2), default=0)

    po: Mapped[PurchaseOrder] = relationship(back_populates="lines")
    item: Mapped[Item] = relationship()


class Receiving(Base, TimestampMixin):
    __tablename__ = "receiving"

    receipt_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    po_id: Mapped[int] = mapped_column(ForeignKey("po.po_id"))
    received_at: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    received_by: Mapped[str]
    doc_url: Mapped[Optional[str]]

    po: Mapped[PurchaseOrder] = relationship(back_populates="receivings")
    lines: Mapped[list["ReceivingLine"]] = relationship(back_populates="receiving", cascade="all, delete-orphan")


class ReceivingLine(Base, TimestampMixin):
    __tablename__ = "receiving_line"

    receipt_line_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    receipt_id: Mapped[int] = mapped_column(ForeignKey("receiving.receipt_id"))
    po_line_id: Mapped[int] = mapped_column(ForeignKey("po_line.po_line_id"))
    item_id: Mapped[int] = mapped_column(ForeignKey("item.item_id"))
    qty_received: Mapped[float] = mapped_column(Numeric(10, 2))
    unit_cost: Mapped[float] = mapped_column(Numeric(10, 2))

    receiving: Mapped[Receiving] = relationship(back_populates="lines")
    item: Mapped[Item] = relationship()


class Customer(Base, TimestampMixin):
    __tablename__ = "customer"

    customer_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str]
    phone: Mapped[Optional[str]]
    email: Mapped[Optional[str]]
    addr_json: Mapped[Optional[dict]] = mapped_column(JSON)


class Sale(Base, TimestampMixin):
    __tablename__ = "sale"

    sale_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    customer_id: Mapped[Optional[int]] = mapped_column(ForeignKey("customer.customer_id"))
    status: Mapped[str] = mapped_column(sale_status_enum, default="draft")
    sale_date: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
    subtotal: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    tax: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    total: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    deposit_amt: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    created_by: Mapped[Optional[str]]
    source: Mapped[Optional[str]]
    ocr_confidence: Mapped[Optional[float]] = mapped_column(Numeric(5, 4))
    delivery_requested: Mapped[bool] = mapped_column(Boolean, default=False)
    delivery_status: Mapped[Optional[str]] = mapped_column(delivery_status_enum)

    customer: Mapped[Optional[Customer]] = relationship()
    lines: Mapped[list["SaleLine"]] = relationship(back_populates="sale", cascade="all, delete-orphan")


class SaleLine(Base, TimestampMixin):
    __tablename__ = "sale_line"

    sale_line_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    sale_id: Mapped[int] = mapped_column(ForeignKey("sale.sale_id"))
    item_id: Mapped[int] = mapped_column(ForeignKey("item.item_id"))
    location_id: Mapped[int] = mapped_column(ForeignKey("location.location_id"))
    qty: Mapped[float] = mapped_column(Numeric(10, 2))
    unit_price: Mapped[float] = mapped_column(Numeric(10, 2))
    discount: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    tax: Mapped[float] = mapped_column(Numeric(10, 2), default=0)

    sale: Mapped[Sale] = relationship(back_populates="lines")
    item: Mapped[Item] = relationship()
    location: Mapped[Location] = relationship()


class Bill(Base, TimestampMixin):
    __tablename__ = "bill"

    bill_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    vendor_id: Mapped[int] = mapped_column(ForeignKey("vendor.vendor_id"))
    po_id: Mapped[Optional[int]] = mapped_column(ForeignKey("po.po_id"))
    qb_bill_id: Mapped[Optional[str]]
    invoice_no: Mapped[Optional[str]]
    bill_date: Mapped[Optional[datetime]] = mapped_column(Date)
    due_date: Mapped[Optional[datetime]] = mapped_column(Date)
    subtotal: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    tax: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    freight: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    total: Mapped[float] = mapped_column(Numeric(10, 2), default=0)
    status: Mapped[str] = mapped_column(Enum("draft", "exported", "paid", name="bill_status_enum"), default="draft")
    doc_url: Mapped[Optional[str]]


class Barcode(Base):
    __tablename__ = "barcode"

    barcode: Mapped[str] = mapped_column(String(64), primary_key=True)
    item_id: Mapped[int] = mapped_column(ForeignKey("item.item_id"))
    type: Mapped[str] = mapped_column(barcode_type_enum, default="item")

    item: Mapped[Item] = relationship(back_populates="barcodes")


class Attachment(Base, TimestampMixin):
    __tablename__ = "attachment"

    attachment_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ref_type: Mapped[str] = mapped_column(attachment_ref_enum)
    ref_id: Mapped[int] = mapped_column(Integer)
    file_url: Mapped[str]
    kind: Mapped[str] = mapped_column(attachment_kind_enum)


class LabelTemplate(Base, TimestampMixin):
    __tablename__ = "label_template"

    template_id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    target: Mapped[str] = mapped_column(label_target_enum)
    dymo_label_xml: Mapped[str] = mapped_column(Text)


__all__ = [
    "Vendor",
    "Item",
    "Location",
    "Inventory",
    "InventoryTxn",
    "PurchaseOrder",
    "POLine",
    "Receiving",
    "ReceivingLine",
    "Customer",
    "Sale",
    "SaleLine",
    "Bill",
    "Barcode",
    "Attachment",
    "LabelTemplate",
]
