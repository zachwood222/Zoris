"""Utility helpers for inserting demo data."""
from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Any

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from .db import SessionLocal, engine
from .models import domain
from .utils.datetime import utc_now


@dataclass
class SampleDataSummary:
    """Summary returned after ensuring the sample dataset exists."""

    created: bool
    totals: dict[str, int]

    def model_dump(self) -> dict[str, Any]:
        """Return a serializable representation for Pydantic compatibility."""

        return {"created": self.created, "totals": self.totals}


SAMPLE_ITEMS = [
    {
        "sku": "DEMO-SOFA",
        "description": "Demo Upholstered Sofa",
        "category": "Living Room",
        "subcategory": "Seating",
        "unit_cost": 450.00,
        "price": 899.00,
        "short_code": "D001",
        "barcode": "DEMOBARCODE01",
    },
    {
        "sku": "DEMO-CHAIR",
        "description": "Demo Accent Chair",
        "category": "Living Room",
        "subcategory": "Seating",
        "unit_cost": 150.00,
        "price": 299.00,
        "short_code": "D002",
        "barcode": "DEMOBARCODE02",
    },
    {
        "sku": "DEMO-TABLE",
        "description": "Demo Coffee Table",
        "category": "Living Room",
        "subcategory": "Tables",
        "unit_cost": 95.00,
        "price": 189.00,
        "short_code": "D003",
        "barcode": "DEMOBARCODE03",
    },
    {
        "sku": "DEMO-SECTIONAL",
        "description": "Demo Modular Sectional",
        "category": "Living Room",
        "subcategory": "Seating",
        "unit_cost": 650.00,
        "price": 1299.00,
        "short_code": "D004",
        "barcode": "DEMOBARCODE04",
    },
    {
        "sku": "DEMO-OTTOMAN",
        "description": "Demo Tufted Ottoman",
        "category": "Living Room",
        "subcategory": "Accent",
        "unit_cost": 120.00,
        "price": 249.00,
        "short_code": "D005",
        "barcode": "DEMOBARCODE05",
    },
    {
        "sku": "DEMO-LAMP",
        "description": "Demo Brass Floor Lamp",
        "category": "Lighting",
        "subcategory": "Floor",
        "unit_cost": 60.00,
        "price": 129.00,
        "short_code": "D006",
        "barcode": "DEMOBARCODE06",
    },
    {
        "sku": "DEMO-RUG",
        "description": "Demo Handwoven Area Rug",
        "category": "Decor",
        "subcategory": "Rugs",
        "unit_cost": 200.00,
        "price": 429.00,
        "short_code": "D007",
        "barcode": "DEMOBARCODE07",
    },
    {
        "sku": "DEMO-DINING",
        "description": "Demo Six-Piece Dining Set",
        "category": "Dining",
        "subcategory": "Tables",
        "unit_cost": 540.00,
        "price": 1099.00,
        "short_code": "D008",
        "barcode": "DEMOBARCODE08",
    },
    {
        "sku": "DEMO-BED",
        "description": "Demo Queen Storage Bed",
        "category": "Bedroom",
        "subcategory": "Beds",
        "unit_cost": 480.00,
        "price": 999.00,
        "short_code": "D009",
        "barcode": "DEMOBARCODE09",
    },
    {
        "sku": "DEMO-DRESSER",
        "description": "Demo Eight-Drawer Dresser",
        "category": "Bedroom",
        "subcategory": "Storage",
        "unit_cost": 350.00,
        "price": 729.00,
        "short_code": "D010",
        "barcode": "DEMOBARCODE10",
    },
]

SAMPLE_CUSTOMERS = [
    {"name": "Jordan Alvarez", "phone": "555-0100", "email": "jordan@example.com"},
    {"name": "Sasha Patel", "phone": "555-0110", "email": "sasha@example.com"},
]

LABEL_XML = """<label><text>Sample</text></label>"""


async def ensure_sample_data(session: AsyncSession) -> SampleDataSummary:
    """Create a deterministic demo dataset when the database is empty."""

    async with engine.begin() as conn:
        await conn.run_sync(domain.Base.metadata.create_all)

    created = False

    vendor = await session.scalar(
        select(domain.Vendor).where(domain.Vendor.name == "Demo Furnishings")
    )
    if vendor is None:
        vendor = domain.Vendor(name="Demo Furnishings", terms="Net 30")
        session.add(vendor)
        await session.flush()
        created = True

    location = await session.scalar(
        select(domain.Location).where(domain.Location.name == "Main Showroom")
    )
    if location is None:
        location = domain.Location(name="Main Showroom", type="floor")
        session.add(location)
        await session.flush()
        created = True

    item_map: dict[str, domain.Item] = {}
    existing_items = await session.scalars(
        select(domain.Item).where(domain.Item.sku.in_([item["sku"] for item in SAMPLE_ITEMS]))
    )
    for item in existing_items:
        item_map[item.sku] = item

    for item_data in SAMPLE_ITEMS:
        item = item_map.get(item_data["sku"])
        if item is None:
            item_kwargs = {key: value for key, value in item_data.items() if key != "barcode"}
            item = domain.Item(**item_kwargs, tax_code="STANDARD")
            session.add(item)
            await session.flush()
            created = True
        item_map[item_data["sku"]] = item

        barcode = await session.scalar(
            select(domain.Barcode).where(
                domain.Barcode.item_id == item.item_id,
                domain.Barcode.barcode == item_data["barcode"],
            )
        )
        if barcode is None:
            session.add(domain.Barcode(item_id=item.item_id, barcode=item_data["barcode"]))
            created = True

        inventory = await session.scalar(
            select(domain.Inventory).where(
                domain.Inventory.item_id == item.item_id,
                domain.Inventory.location_id == location.location_id,
            )
        )
        if inventory is None:
            session.add(
                domain.Inventory(
                    item_id=item.item_id,
                    location_id=location.location_id,
                    qty_on_hand=5,
                    qty_reserved=0,
                    avg_cost=item.unit_cost,
                )
            )
            created = True

    customer_map: dict[str, domain.Customer] = {}
    existing_customers = await session.scalars(
        select(domain.Customer).where(
            domain.Customer.email.in_([customer["email"] for customer in SAMPLE_CUSTOMERS])
        )
    )
    for customer in existing_customers:
        customer_map[customer.email] = customer

    for customer_data in SAMPLE_CUSTOMERS:
        customer = customer_map.get(customer_data["email"])
        if customer is None:
            customer = domain.Customer(**customer_data)
            session.add(customer)
            await session.flush()
            created = True
        customer_map[customer_data["email"]] = customer

    sale = await session.scalar(select(domain.Sale).where(domain.Sale.source == "sample_data"))
    if sale is None:
        sale = domain.Sale(
            customer_id=next(iter(customer_map.values())).customer_id,
            status="open",
            sale_date=utc_now(),
            created_at=utc_now(),
            subtotal=0,
            tax=0,
            total=0,
            deposit_amt=0,
            created_by="sample.loader",
            source="sample_data",
        )
        session.add(sale)
        await session.flush()
        created = True

        subtotal = 0.0
        for item in item_map.values():
            subtotal += float(item.price)
            session.add(
                domain.SaleLine(
                    sale_id=sale.sale_id,
                    item_id=item.item_id,
                    location_id=location.location_id,
                    qty=1,
                    unit_price=item.price,
                    tax=round(float(item.price) * 0.07, 2),
                )
            )
        sale.subtotal = subtotal
        sale.tax = round(subtotal * 0.07, 2)
        sale.total = sale.subtotal + sale.tax

    po = await session.scalar(
        select(domain.PurchaseOrder).where(domain.PurchaseOrder.notes == "Sample purchase order")
    )
    if po is None:
        po = domain.PurchaseOrder(
            vendor_id=vendor.vendor_id,
            status="open",
            expected_date=utc_now(),
            terms="Net 30",
            notes="Sample purchase order",
            created_by="sample.loader",
        )
        session.add(po)
        await session.flush()
        created = True

        for item in item_map.values():
            session.add(
                domain.POLine(
                    po_id=po.po_id,
                    item_id=item.item_id,
                    description=item.description,
                    qty_ordered=2,
                    qty_received=0,
                    unit_cost=item.unit_cost,
                )
            )

    receipt = await session.scalar(
        select(domain.Receiving).where(domain.Receiving.received_by == "Sample Receiver")
    )
    if receipt is None and po is not None:
        receipt = domain.Receiving(
            po_id=po.po_id,
            received_at=utc_now(),
            received_by="Sample Receiver",
            created_at=utc_now(),
        )
        session.add(receipt)
        await session.flush()
        created = True

        po_lines = await session.scalars(select(domain.POLine).where(domain.POLine.po_id == po.po_id))
        for po_line in po_lines:
            session.add(
                domain.ReceivingLine(
                    receipt_id=receipt.receipt_id,
                    po_line_id=po_line.po_line_id,
                    item_id=po_line.item_id,
                    qty_received=1,
                    unit_cost=po_line.unit_cost,
                )
            )

    label_template = await session.scalar(
        select(domain.LabelTemplate).where(domain.LabelTemplate.name == "Sample Floor Tag")
    )
    if label_template is None:
        session.add(
            domain.LabelTemplate(
                name="Sample Floor Tag",
                target="item",
                dymo_label_xml=LABEL_XML,
            )
        )
        created = True

    totals = {
        "vendors": int(await session.scalar(select(func.count(domain.Vendor.vendor_id))) or 0),
        "locations": int(await session.scalar(select(func.count(domain.Location.location_id))) or 0),
        "items": int(await session.scalar(select(func.count(domain.Item.item_id))) or 0),
        "customers": int(await session.scalar(select(func.count(domain.Customer.customer_id))) or 0),
        "sales": int(await session.scalar(select(func.count(domain.Sale.sale_id))) or 0),
    }

    return SampleDataSummary(created=created, totals=totals)


async def apply() -> SampleDataSummary:
    """Create the demo dataset using a managed session."""

    async with SessionLocal() as session:
        summary = await ensure_sample_data(session)
        await session.commit()
        return summary


if __name__ == "__main__":  # pragma: no cover - manual invocation helper
    result = asyncio.run(apply())
    print(result.model_dump())
