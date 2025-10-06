"""Seed demo data."""
from __future__ import annotations

import asyncio
import random

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
            domain.Inventory,
            domain.Item,
            domain.Location,
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
