from __future__ import annotations

from decimal import Decimal

import pytest
import pytest_asyncio
from sqlalchemy import select

from ..db import SessionLocal, engine
from ..models.base import Base
from ..models.domain import (
    IncomingTruckLine,
    IncomingTruckUpdate,
    Item,
    POLine,
    PurchaseOrder,
    Vendor,
)


@pytest_asyncio.fixture(autouse=True)
async def _reset_database() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)


async def _create_po_with_line() -> tuple[int, int, int]:
    async with SessionLocal() as session:
        vendor = Vendor(name="Acme Logistics")
        item = Item(
            sku="SKU-TRUCK",
            description="Incoming Widget",
            unit_cost=Decimal("5.00"),
            price=Decimal("10.00"),
            short_code="TRK1",
        )
        session.add_all([vendor, item])
        await session.flush()

        po = PurchaseOrder(vendor_id=vendor.vendor_id, status="open", created_by="tester")
        session.add(po)
        await session.flush()

        po_line = POLine(
            po_id=po.po_id,
            item_id=item.item_id,
            description="Widget",
            qty_ordered=Decimal("10.00"),
            unit_cost=Decimal("5.00"),
        )
        session.add(po_line)
        await session.commit()
        await session.refresh(po_line)

        return po.po_id, po_line.po_line_id, item.item_id


@pytest.mark.asyncio
async def test_create_incoming_truck_with_lines(client) -> None:
    po_id, po_line_id, item_id = await _create_po_with_line()

    payload = {
        "po_id": po_id,
        "reference": "TRUCK-100",
        "carrier": "Acme Freight",
        "status": "scheduled",
        "lines": [
            {
                "po_line_id": po_line_id,
                "item_id": item_id,
                "qty_expected": 10.0,
            }
        ],
    }

    response = await client.post("/incoming-trucks", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["po_id"] == po_id
    assert data["reference"] == "TRUCK-100"
    assert data["lines"]
    assert data["lines"][0]["po_line_id"] == po_line_id
    assert data["updates"]["history"] == []

    async with SessionLocal() as session:
        truck_line = await session.scalar(
            select(IncomingTruckLine).where(IncomingTruckLine.po_line_id == po_line_id)
        )
        assert truck_line is not None
        assert truck_line.qty_expected == Decimal("10.00")


@pytest.mark.asyncio
async def test_post_update_validates_item_linkage(client) -> None:
    po_id, po_line_id, item_id = await _create_po_with_line()

    async with SessionLocal() as session:
        other_item = Item(
            sku="SKU-OTHER",
            description="Other",
            unit_cost=Decimal("3.00"),
            price=Decimal("6.00"),
            short_code="OTR1",
        )
        session.add(other_item)
        await session.commit()
        await session.refresh(other_item)
        other_item_id = other_item.item_id

    create_response = await client.post(
        "/incoming-trucks",
        json={
            "po_id": po_id,
            "reference": "TRUCK-200",
            "lines": [
                {
                    "po_line_id": po_line_id,
                    "item_id": item_id,
                    "qty_expected": 5.0,
                }
            ],
        },
    )
    truck_id = create_response.json()["truck_id"]

    bad_update = {
        "update_type": "line_progress",
        "po_line_id": po_line_id,
        "item_id": other_item_id,
        "quantity": 2.0,
    }
    bad_response = await client.post(f"/incoming-trucks/{truck_id}/updates", json=bad_update)
    assert bad_response.status_code == 400
    assert bad_response.json()["detail"] == "item_mismatch"

    good_update = {
        "update_type": "line_progress",
        "po_line_id": po_line_id,
        "item_id": item_id,
        "quantity": 2.5,
    }
    good_response = await client.post(f"/incoming-trucks/{truck_id}/updates", json=good_update)
    assert good_response.status_code == 200
    payload = good_response.json()
    assert payload["quantity"] == pytest.approx(2.5)

    async with SessionLocal() as session:
        update = await session.scalar(select(IncomingTruckUpdate))
        assert update is not None
        assert update.quantity == Decimal("2.50")


@pytest.mark.asyncio
async def test_list_incoming_trucks_includes_aggregates(client) -> None:
    po_id, po_line_id, item_id = await _create_po_with_line()

    create_response = await client.post(
        "/incoming-trucks",
        json={
            "po_id": po_id,
            "reference": "TRUCK-300",
            "lines": [
                {
                    "po_line_id": po_line_id,
                    "item_id": item_id,
                    "qty_expected": 7.0,
                }
            ],
        },
    )
    truck_id = create_response.json()["truck_id"]

    await client.post(
        f"/incoming-trucks/{truck_id}/updates",
        json={"update_type": "status", "status": "arrived"},
    )
    await client.post(
        f"/incoming-trucks/{truck_id}/updates",
        json={"update_type": "note", "message": "Waiting for dock"},
    )
    await client.post(
        f"/incoming-trucks/{truck_id}/updates",
        json={
            "update_type": "line_progress",
            "po_line_id": po_line_id,
            "item_id": item_id,
            "quantity": 1.5,
        },
    )
    await client.post(
        f"/incoming-trucks/{truck_id}/updates",
        json={
            "update_type": "line_progress",
            "po_line_id": po_line_id,
            "item_id": item_id,
            "quantity": 2.0,
        },
    )

    response = await client.get("/incoming-trucks")
    assert response.status_code == 200
    trucks = response.json()
    assert trucks
    truck = trucks[0]
    assert truck["updates"]["latest_status"] == "arrived"
    assert truck["updates"]["note_count"] == 1
    history = truck["updates"]["history"]
    assert len(history) == 4
    progress = truck["updates"]["line_progress"]
    assert len(progress) == 1
    assert progress[0]["po_line_id"] == po_line_id
    assert progress[0]["total_quantity"] == pytest.approx(3.5)
