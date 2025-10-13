from __future__ import annotations

from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy import select

from ..db import SessionLocal, engine
from ..models.base import Base
from ..models.domain import (
    Inventory,
    InventoryTxn,
    Item,
    Location,
    POLine,
    PurchaseOrder,
    Vendor,
)


@pytest_asyncio.fixture(autouse=True)
async def _reset_database() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


@pytest.mark.asyncio
async def test_po_line_search_matches_text_fields(client):
    async with SessionLocal() as session:
        vendor = Vendor(name="Summit Lumber", terms=None, phone=None, email=None)
        item = Item(
            sku="STUD-2X4",
            description="Spruce Stud 2x4",
            unit_cost=Decimal("3.50"),
            price=Decimal("6.75"),
            short_code="ST24",
        )
        po = PurchaseOrder(vendor=vendor, status="open", created_by="demo")
        line = POLine(
            po=po,
            item=item,
            description="KD Spruce Stud 2x4",
            qty_ordered=Decimal("80"),
            qty_received=Decimal("40"),
            unit_cost=Decimal("3.50"),
        )
        session.add_all([vendor, item, po, line])
        await session.flush()
        po_id = po.po_id
        await session.commit()

    for query in ("spruce", "Summit", f"PO-{po_id}"):
        response = await client.get("/po/lines/search", params={"q": query})
        assert response.status_code == 200
        payload = response.json()
        assert isinstance(payload, list)
        assert len(payload) == 1
        result = payload[0]
        assert result["po_id"] == po_id
        assert result["po_number"] == f"PO-{po_id}"
        assert result["item_description"].lower().startswith("kd spruce")
        assert result["vendor"] == "Summit Lumber"
        assert result["qty_remaining"] == pytest.approx(40)


@pytest.mark.asyncio
async def test_po_line_search_excludes_fully_received_and_closed(client):
    async with SessionLocal() as session:
        vendor = Vendor(name="Timber & Co", terms=None, phone=None, email=None)
        item_partial = Item(
            sku="PLY-34",
            description="Plywood 3/4",
            unit_cost=Decimal("15.00"),
            price=Decimal("25.00"),
            short_code="P034",
        )
        item_fully = Item(
            sku="PLY-12",
            description="Plywood 1/2",
            unit_cost=Decimal("12.00"),
            price=Decimal("20.00"),
            short_code="P012",
        )
        po_open = PurchaseOrder(vendor=vendor, status="partial", created_by="demo")
        po_closed = PurchaseOrder(vendor=vendor, status="closed", created_by="demo")
        open_line = POLine(
            po=po_open,
            item=item_partial,
            description='3/4" Plywood',
            qty_ordered=Decimal("60"),
            qty_received=Decimal("20"),
            unit_cost=Decimal("15.00"),
        )
        full_line = POLine(
            po=po_open,
            item=item_fully,
            description='1/2" Plywood',
            qty_ordered=Decimal("40"),
            qty_received=Decimal("40"),
            unit_cost=Decimal("12.00"),
        )
        closed_line = POLine(
            po=po_closed,
            item=item_partial,
            description='3/4" Plywood',
            qty_ordered=Decimal("30"),
            qty_received=Decimal("0"),
            unit_cost=Decimal("15.00"),
        )
        session.add_all(
            [
                vendor,
                item_partial,
                item_fully,
                po_open,
                po_closed,
                open_line,
                full_line,
                closed_line,
            ]
        )
        await session.flush()
        po_open_id = po_open.po_id
        await session.commit()

    response = await client.get("/po/lines/search", params={"q": "plywood"})
    assert response.status_code == 200
    payload = response.json()
    assert isinstance(payload, list)
    assert len(payload) == 1
    result = payload[0]
    assert result["po_id"] == po_open_id
    assert result["item_description"].startswith("3/4")
    assert result["qty_remaining"] == pytest.approx(40)


@pytest.mark.asyncio
async def test_receive_po_updates_inventory(client):
    async with SessionLocal() as session:
        vendor = Vendor(name="Lumber Direct", terms=None, phone=None, email=None)
        location = Location(name="Main Warehouse", type="warehouse")
        item = Item(
            sku="BEAM-4X6",
            description="Douglas Fir Beam 4x6",
            unit_cost=Decimal("12.00"),
            price=Decimal("20.00"),
            short_code="BF46",
        )
        po = PurchaseOrder(vendor=vendor, status="open", created_by="demo")
        line = POLine(
            po=po,
            item=item,
            description="Douglas Fir Beam 4x6",
            qty_ordered=Decimal("10"),
            qty_received=Decimal("0"),
            unit_cost=Decimal("12.00"),
        )
        session.add_all([vendor, location, item, po, line])
        await session.flush()
        po_id = po.po_id
        po_line_id = line.po_line_id
        item_id = item.item_id
        location_id = location.location_id
        await session.commit()

    response = await client.post(
        f"/po/{po_id}/receive",
        json=[
            {
                "po_line_id": po_line_id,
                "qty_received": 4,
                "unit_cost": 12.0,
                "location_id": location_id,
            }
        ],
    )
    assert response.status_code == 200
    payload = response.json()
    assert "receipt_id" in payload

    async with SessionLocal() as session:
        txn_rows = (
            await session.execute(
                select(InventoryTxn).where(
                    InventoryTxn.item_id == item_id,
                    InventoryTxn.location_id == location_id,
                    InventoryTxn.ref_type == "receiving",
                )
            )
        ).scalars().all()
        assert len(txn_rows) == 1
        txn = txn_rows[0]
        assert float(txn.qty_delta) == pytest.approx(4)

        inventory = await session.scalar(
            select(Inventory).where(
                Inventory.item_id == item_id,
                Inventory.location_id == location_id,
            )
        )
        assert inventory is not None
        assert float(inventory.qty_on_hand) == pytest.approx(4)
