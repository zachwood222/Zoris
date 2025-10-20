"""Seed demo data."""
from __future__ import annotations

import asyncio
import random
from datetime import datetime, timedelta
from pathlib import Path


from sqlalchemy import delete, select

from .db import engine
from .models import domain
from .services.shortcode import generate_short_code
from .utils.datetime import utc_now

LABEL_TEMPLATE_PATHS = {
    "Floor 2x1": Path("app/profiles/dymo/floor_tag.label"),
    "Quarter Page": Path("app/profiles/dymo/quarter_page.label"),
}


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
            domain.ReceivingLine,
            domain.Receiving,
            domain.POLine,
            domain.PurchaseOrder,
            domain.SaleLine,
            domain.Sale,
            domain.Customer,
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
        items: list[domain.Item] = []
        random.seed(42)
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

        now = utc_now()

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

        now = utc_now()

        customers = [
            domain.Customer(name="Jordan Alvarez", phone="555-0100", email="jordan@example.com"),
            domain.Customer(name="Sasha Patel", phone="555-0110", email="sasha@example.com"),
            domain.Customer(name="Taylor Reed", phone="555-0120", email="taylor@example.com"),
        ]
        session.add_all(customers)
        await session.flush()

        def create_sale(
            *,
            customer: domain.Customer | None,
            status: str,
            source: str | None,
            created_at: datetime,
            line_specs: list[tuple[domain.Item, float, domain.Location]],
        ) -> None:
            sale = domain.Sale(
                customer_id=customer.customer_id if customer else None,
                status=status,
                source=source,
                created_by="demo",
                subtotal=0,
                tax=0,
                total=0,
            )
            sale.created_at = created_at
            sale.sale_date = created_at
            session.add(sale)
            subtotal = 0.0
            for item, qty, location in line_specs:
                price = float(item.price)
                subtotal += price * qty
                session.add(
                    domain.SaleLine(
                        sale=sale,
                        item_id=item.item_id,
                        location_id=location.location_id,
                        qty=qty,
                        unit_price=price,
                    )
                )
            sale.subtotal = subtotal
            sale.total = subtotal

        create_sale(
            customer=customers[0],
            status="open",
            source="kiosk",
            created_at=now - timedelta(hours=3),
            line_specs=[(items[0], 2, locations[0]), (items[1], 1, locations[0])],
        )
        create_sale(
            customer=customers[1],
            status="open",
            source="kiosk",
            created_at=now - timedelta(minutes=40),
            line_specs=[(items[2], 1, locations[0]), (items[3], 3, locations[0])],
        )
        create_sale(
            customer=None,
            status="draft",
            source="ocr_ticket",
            created_at=now - timedelta(minutes=25),
            line_specs=[(items[4], 1, locations[1])],
        )
        create_sale(
            customer=None,
            status="draft",
            source="ocr_ticket",
            created_at=now - timedelta(days=1, hours=2),
            line_specs=[(items[5], 2, locations[1])],
        )

        po_open = domain.PurchaseOrder(
            vendor_id=vendors[0].vendor_id,
            status="open",
            expected_date=now + timedelta(days=2),
            terms="Net 30",
            notes="Floor reset inbound",
            created_by="demo",
        )
        po_open.created_at = now - timedelta(hours=5)
        session.add(po_open)
        await session.flush()

        po_open_line_a = domain.POLine(
            po_id=po_open.po_id,
            item_id=items[10].item_id,
            description=items[10].description,
            qty_ordered=5,
            qty_received=0,
            unit_cost=float(items[10].unit_cost),
        )
        po_open_line_b = domain.POLine(
            po_id=po_open.po_id,
            item_id=items[11].item_id,
            description=items[11].description,
            qty_ordered=4,
            qty_received=0,
            unit_cost=float(items[11].unit_cost),
        )
        session.add_all([po_open_line_a, po_open_line_b])
        await session.flush()

        po_partial = domain.PurchaseOrder(
            vendor_id=vendors[1].vendor_id,
            status="partial",
            expected_date=now + timedelta(days=1),
            terms="Net 45",
            notes="Restock accessories",
            created_by="demo",
        )
        po_partial.created_at = now - timedelta(hours=2)
        session.add(po_partial)
        await session.flush()

        po_partial_line_a = domain.POLine(
            po_id=po_partial.po_id,
            item_id=items[12].item_id,
            description=items[12].description,
            qty_ordered=6,
            qty_received=2,
            unit_cost=float(items[12].unit_cost),
        )
        po_partial_line_b = domain.POLine(
            po_id=po_partial.po_id,
            item_id=items[13].item_id,
            description=items[13].description,
            qty_ordered=8,
            qty_received=5,
            unit_cost=float(items[13].unit_cost),
        )
        session.add_all([po_partial_line_a, po_partial_line_b])
        await session.flush()

        active_truck = domain.IncomingTruck(
            po_id=po_partial.po_id,
            reference="TRK-5001",
            carrier="Evergreen Logistics",
            status="unloading",
            scheduled_arrival=now + timedelta(hours=1),
            arrived_at=now - timedelta(minutes=25),
        )
        active_truck.created_at = now - timedelta(hours=2)
        session.add(active_truck)
        await session.flush()

        session.add_all(
            [
                domain.IncomingTruckLine(
                    truck_id=active_truck.truck_id,
                    po_line_id=po_partial_line_a.po_line_id,
                    item_id=po_partial_line_a.item_id,
                    description=po_partial_line_a.description,
                    qty_expected=float(po_partial_line_a.qty_ordered - po_partial_line_a.qty_received),
                ),
                domain.IncomingTruckLine(
                    truck_id=active_truck.truck_id,
                    po_line_id=po_partial_line_b.po_line_id,
                    item_id=po_partial_line_b.item_id,
                    description=po_partial_line_b.description,
                    qty_expected=float(po_partial_line_b.qty_ordered - po_partial_line_b.qty_received),
                ),
            ]
        )

        status_update = domain.IncomingTruckUpdate(
            truck_id=active_truck.truck_id,
            update_type="status",
            status="arrived",
            message="Checked in at receiving dock.",
            created_by="demo.driver",
        )
        status_update.created_at = now - timedelta(hours=1, minutes=30)

        note_update = domain.IncomingTruckUpdate(
            truck_id=active_truck.truck_id,
            update_type="note",
            message="Carrier reports minor traffic delay but now on-site.",
            created_by="demo.driver",
        )
        note_update.created_at = now - timedelta(hours=1, minutes=10)

        progress_update = domain.IncomingTruckUpdate(
            truck_id=active_truck.truck_id,
            update_type="line_progress",
            po_line_id=po_partial_line_a.po_line_id,
            item_id=po_partial_line_a.item_id,
            quantity=2,
            message="Unloaded accent chairs.",
            created_by="demo.receiver",
        )
        progress_update.created_at = now - timedelta(minutes=35)

        session.add_all([status_update, note_update, progress_update])

        scheduled_truck = domain.IncomingTruck(
            po_id=po_open.po_id,
            reference="TRK-5002",
            carrier="Northern Freight",
            status="scheduled",
            scheduled_arrival=now + timedelta(hours=6),
        )
        scheduled_truck.created_at = now - timedelta(minutes=15)
        session.add(scheduled_truck)
        await session.flush()

        session.add(
            domain.IncomingTruckLine(
                truck_id=scheduled_truck.truck_id,
                po_line_id=po_open_line_a.po_line_id,
                item_id=po_open_line_a.item_id,
                description=po_open_line_a.description,
                qty_expected=float(po_open_line_a.qty_ordered),
            )
        )

        scheduled_status = domain.IncomingTruckUpdate(
            truck_id=scheduled_truck.truck_id,
            update_type="status",
            status="scheduled",
            message="Dispatcher confirmed departure.",
            created_by="demo.dispatch",
        )
        scheduled_status.created_at = now - timedelta(minutes=12)
        session.add(scheduled_status)

        recent_receiving = domain.Receiving(
            po_id=po_partial.po_id,
            received_by="Morgan",
            received_at=now - timedelta(hours=1, minutes=15),
        )
        recent_receiving.created_at = recent_receiving.received_at
        session.add(recent_receiving)
        await session.flush()

        session.add_all(
            [
                domain.ReceivingLine(
                    receipt_id=recent_receiving.receipt_id,
                    po_line_id=po_partial_line_a.po_line_id,
                    item_id=po_partial_line_a.item_id,
                    qty_received=2,
                    unit_cost=float(items[12].unit_cost),
                ),
                domain.ReceivingLine(
                    receipt_id=recent_receiving.receipt_id,
                    po_line_id=po_partial_line_b.po_line_id,
                    item_id=po_partial_line_b.item_id,
                    qty_received=3,
                    unit_cost=float(items[13].unit_cost),
                ),
            ]
        )

        earlier_receiving = domain.Receiving(
            po_id=po_partial.po_id,
            received_by="Casey",
            received_at=now - timedelta(hours=3, minutes=30),
        )
        earlier_receiving.created_at = earlier_receiving.received_at
        session.add(earlier_receiving)
        await session.flush()

        session.add(
            domain.ReceivingLine(
                receipt_id=earlier_receiving.receipt_id,
                po_line_id=po_partial_line_b.po_line_id,
                item_id=po_partial_line_b.item_id,
                qty_received=2,
                unit_cost=float(items[13].unit_cost),
            )
        )

        for name, path in LABEL_TEMPLATE_PATHS.items():
            label_contents = path.read_text() if path.exists() else "<label />"
            existing_template = await session.scalar(
                select(domain.LabelTemplate).where(domain.LabelTemplate.name == name)
            )
            if existing_template is None:
                session.add(
                    domain.LabelTemplate(
                        name=name,
                        target="item",
                        dymo_label_xml=label_contents,
                    )
                )
        await session.commit()


if __name__ == "__main__":
    asyncio.run(seed())
