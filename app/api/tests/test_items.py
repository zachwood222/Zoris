from __future__ import annotations

from datetime import timedelta
from decimal import Decimal

import pytest

from ..db import SessionLocal, engine
from ..models.base import Base
from ..models.domain import (
    Inventory,
    Item,
    Location,
    POLine,
    PurchaseOrder,
    Vendor,
)
from ..utils.datetime import utc_now


@pytest.mark.asyncio
async def test_get_item_detail_returns_inventory_and_incoming(client) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        vendor = Vendor(name="Vendor Test", terms="Net 30")
        item = Item(
            sku="SKU-CLICK", description="Clickable Item", unit_cost=Decimal("10.00"), price=Decimal("20.00"), short_code="AB12"
        )
        location = Location(name="Showroom", type="floor")
        inventory = Inventory(
            item=item,
            location=location,
            qty_on_hand=Decimal("5.00"),
            qty_reserved=Decimal("1.00"),
            avg_cost=Decimal("10.00"),
        )
        po = PurchaseOrder(
            vendor=vendor,
            status="open",
            expected_date=utc_now() + timedelta(days=3),
            created_by="tester",
        )
        po_line = POLine(
            po=po,
            item=item,
            description="Clickable Item",
            qty_ordered=Decimal("8.00"),
            qty_received=Decimal("3.00"),
            unit_cost=Decimal("10.00"),
        )
        session.add_all([vendor, item, location, inventory, po, po_line])
        await session.commit()
        await session.refresh(item)
        await session.refresh(location)
        await session.refresh(po)

        item_id = item.item_id
        po_id = po.po_id
        location_id = location.location_id

    response = await client.get(f"/items/{item_id}")
    assert response.status_code == 200
    payload = response.json()

    assert payload["item"]["sku"] == "SKU-CLICK"
    assert payload["total_on_hand"] == pytest.approx(5.0)
    assert len(payload["locations"]) == 1
    location_payload = payload["locations"][0]
    assert location_payload["location_id"] == location_id
    assert location_payload["location_name"] == "Showroom"
    assert location_payload["qty_on_hand"] == pytest.approx(5.0)
    assert location_payload["qty_reserved"] == pytest.approx(1.0)
    assert len(payload["incoming"]) == 1
    incoming = payload["incoming"][0]
    assert incoming["po_id"] == po_id
    assert incoming["status"] == "open"
    assert incoming["qty_ordered"] == pytest.approx(8.0)
    assert incoming["qty_received"] == pytest.approx(3.0)
    assert incoming["qty_remaining"] == pytest.approx(5.0)
    assert incoming["expected_date"] is not None


@pytest.mark.asyncio
async def test_get_item_detail_not_found(client) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    response = await client.get("/items/9999")
    assert response.status_code == 404
    assert response.json()["detail"] == "not_found"


@pytest.mark.asyncio
async def test_search_items_supports_short_code(client) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        item = Item(
            sku="SKU-SHORT",
            description="Short Code Sample Lamp",
            unit_cost=Decimal("40.00"),
            price=Decimal("79.00"),
            short_code="LAMP",
        )
        session.add(item)
        await session.commit()

    response = await client.get("/items/search", params={"q": "LAMP"})
    assert response.status_code == 200
    payload = response.json()

    assert any(result["sku"] == "SKU-SHORT" for result in payload)
