"""Seed demo data."""
from __future__ import annotations

import asyncio
import random
from datetime import datetime, timedelta

from sqlalchemy import delete

from .config import get_settings
from .db import engine
from .models import domain
from .services.shortcode import generate_short_code


async def seed() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(domain.Base.metadata.create_all)

    from sqlalchemy.ext.asyncio import async_sessionmaker

    Session = async_sessionmaker(engine, expire_on_commit=False)
    async with Session() as session:
        for table in [
            domain.LabelTemplate,
            domain.Attachment,
            domain.Barcode,
            domain.SaleLine,
            domain.Sale,
            domain.ReceivingLine,
            domain.Receiving,
            domain.POLine,
            domain.PurchaseOrder,
            domain.Inventory,
            domain.Item,
            domain.Location,
            domain.Customer,
            domain.Vendor,
        ]:
            await session.execute(delete(table))
        vendors = [domain.Vendor(name=f"Vendor {i}", terms="Net 30") for i in range(1, 6)]
        session.add_all(vendors)
        await session.flush()

        locations = [
            domain.Location(name="Showroom", type="floor"),
            domain.Location(name="Warehouse A", type="warehouse"),
            domain.Location(name="Backroom", type="backroom"),
        ]
        session.add_all(locations)
        await session.flush()

        existing_codes: set[str] = set()
        items = []
        for i in range(1, 51):
            code = generate_short_code(existing_codes)
            existing_codes.add(code)
            item = domain.Item(
                sku=f"SKU-{i:04d}",
                description=f"Demo Item {i}",
                category="Furniture",
                subcategory="Living",
                unit_cost=round(random.uniform(100, 500), 2),
                price=round(random.uniform(500, 1200), 2),
                tax_code="TAX",
                short_code=code,
            )
            items.append(item)
        session.add_all(items)
        await session.flush()

        customers = [
            domain.Customer(
                name="Olivia Martin",
                phone="555-0110",
                email="olivia.martin@example.com",
            ),
            domain.Customer(
                name="Noah Patel",
                phone="555-0111",
                email="noah.patel@example.com",
            ),
            domain.Customer(
                name="Sophia Chen",
                phone="555-0112",
                email="sophia.chen@example.com",
            ),
        ]
        session.add_all(customers)
        await session.flush()

        now = datetime.utcnow()

        open_sale = domain.Sale(
            customer_id=customers[0].customer_id,
            status="open",
            sale_date=now - timedelta(hours=3),
            created_at=now - timedelta(hours=3),
            subtotal=0,
            tax=0,
            total=0,
            deposit_amt=0,
            created_by="demo.associate",
            source="pos",
        )
        session.add(open_sale)
        await session.flush()

        open_sale_line = domain.SaleLine(
            sale_id=open_sale.sale_id,
            item_id=items[0].item_id,
            location_id=locations[0].location_id,
            qty=2,
            unit_price=items[0].price,
            discount=0,
            tax=round(float(items[0].price) * 2 * 0.07, 2),
        )
        line_total = float(open_sale_line.qty) * float(open_sale_line.unit_price)
        open_sale.subtotal = line_total - float(open_sale_line.discount or 0)
        open_sale.tax = float(open_sale_line.tax)
        open_sale.total = open_sale.subtotal + open_sale.tax
        session.add(open_sale_line)

        draft_ocr_sale = domain.Sale(
            customer_id=customers[1].customer_id,
            status="draft",
            sale_date=now - timedelta(hours=1),
            created_at=now - timedelta(hours=1),
            subtotal=0,
            tax=0,
            total=0,
            deposit_amt=0,
            created_by="ocr.pipeline",
            source="ocr_ticket",
            ocr_confidence=0.82,
        )
        session.add(draft_ocr_sale)
        await session.flush()

        draft_line = domain.SaleLine(
            sale_id=draft_ocr_sale.sale_id,
            item_id=items[1].item_id,
            location_id=locations[1].location_id,
            qty=1,
            unit_price=items[1].price,
            discount=0,
            tax=round(float(items[1].price) * 0.07, 2),
        )
        draft_total = float(draft_line.qty) * float(draft_line.unit_price)
        draft_ocr_sale.subtotal = draft_total - float(draft_line.discount or 0)
        draft_ocr_sale.tax = float(draft_line.tax)
        draft_ocr_sale.total = draft_ocr_sale.subtotal + draft_ocr_sale.tax
        session.add(draft_line)

        fulfilled_sale = domain.Sale(
            customer_id=customers[2].customer_id,
            status="fulfilled",
            sale_date=now - timedelta(days=1, hours=2),
            created_at=now - timedelta(days=1, hours=2),
            subtotal=0,
            tax=0,
            total=0,
            deposit_amt=50,
            created_by="demo.associate",
            source="pos",
        )
        session.add(fulfilled_sale)
        await session.flush()

        fulfilled_line = domain.SaleLine(
            sale_id=fulfilled_sale.sale_id,
            item_id=items[2].item_id,
            location_id=locations[0].location_id,
            qty=1,
            unit_price=items[2].price,
            discount=25,
            tax=round((float(items[2].price) - 25) * 0.07, 2),
        )
        fulfilled_total = float(fulfilled_line.qty) * float(fulfilled_line.unit_price)
        fulfilled_sale.subtotal = fulfilled_total - float(fulfilled_line.discount or 0)
        fulfilled_sale.tax = float(fulfilled_line.tax)
        fulfilled_sale.total = fulfilled_sale.subtotal + fulfilled_sale.tax
        session.add(fulfilled_line)

        po_open = domain.PurchaseOrder(
            vendor_id=vendors[0].vendor_id,
            status="open",
            expected_date=now + timedelta(days=5),
            terms="Net 30",
            notes="Awaiting vendor confirmation.",
            created_by="buyer.jane",
            created_at=now - timedelta(days=2),
        )
        po_open.lines = [
            domain.POLine(
                item_id=items[10].item_id,
                description=items[10].description,
                qty_ordered=5,
                qty_received=0,
                unit_cost=items[10].unit_cost,
            ),
            domain.POLine(
                item_id=items[11].item_id,
                description=items[11].description,
                qty_ordered=3,
                qty_received=0,
                unit_cost=items[11].unit_cost,
            ),
        ]

        po_partial = domain.PurchaseOrder(
            vendor_id=vendors[1].vendor_id,
            status="partial",
            expected_date=now + timedelta(days=1),
            terms="Net 45",
            notes="Backordered on final units.",
            created_by="buyer.mike",
            created_at=now - timedelta(hours=10),
        )
        po_partial.lines = [
            domain.POLine(
                item_id=items[12].item_id,
                description=items[12].description,
                qty_ordered=4,
                qty_received=2,
                unit_cost=items[12].unit_cost,
            ),
            domain.POLine(
                item_id=items[13].item_id,
                description=items[13].description,
                qty_ordered=2,
                qty_received=1,
                unit_cost=items[13].unit_cost,
            ),
        ]

        session.add_all([po_open, po_partial])
        await session.flush()

        first_receiving = domain.Receiving(
            po_id=po_partial.po_id,
            received_at=now - timedelta(hours=2),
            received_by="Alice Johnson",
            doc_url=None,
            created_at=now - timedelta(hours=2),
        )
        first_receiving.lines = [
            domain.ReceivingLine(
                po_line_id=po_partial.lines[0].po_line_id,
                item_id=po_partial.lines[0].item_id,
                qty_received=2,
                unit_cost=po_partial.lines[0].unit_cost,
            )
        ]

        second_receiving = domain.Receiving(
            po_id=po_partial.po_id,
            received_at=now - timedelta(minutes=45),
            received_by="Miguel Lopez",
            doc_url=None,
            created_at=now - timedelta(minutes=45),
        )
        second_receiving.lines = [
            domain.ReceivingLine(
                po_line_id=po_partial.lines[1].po_line_id,
                item_id=po_partial.lines[1].item_id,
                qty_received=1,
                unit_cost=po_partial.lines[1].unit_cost,
            )
        ]

        session.add_all([first_receiving, second_receiving])

        for item in items:
            session.add(
                domain.Inventory(
                    item_id=item.item_id,
                    location_id=locations[0].location_id,
                    qty_on_hand=10,
                    qty_reserved=0,
                    avg_cost=item.unit_cost,
                )
            )
            session.add(domain.Barcode(barcode=f"BC{item.item_id:05d}", item_id=item.item_id))

        session.add(
            domain.LabelTemplate(
                name="Floor 2x1",
                target="item",
                dymo_label_xml=open("app/profiles/dymo/floor_tag.label").read(),
            )
        )
        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
