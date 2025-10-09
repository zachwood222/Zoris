from __future__ import annotations

from decimal import Decimal

import pytest
from sqlalchemy import func, select

from ..db import SessionLocal, engine
from ..models.base import Base
from ..models.domain import (
    Bill,
    InventoryTxn,
    Item,
    Location,
    POLine,
    PurchaseOrder,
    Receiving,
    ReceivingLine,
    Vendor,
)


@pytest.mark.asyncio
async def test_receive_po_rejects_lines_from_other_po(client) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        vendor = Vendor(name="Widget Co", terms="Net 30")
        location = Location(name="Main Warehouse", type="warehouse")
        item = Item(
            sku="WIDGET-001",
            description="Widget",
            unit_cost=Decimal("5.00"),
            price=Decimal("10.00"),
            short_code="W001",
        )
        po_one = PurchaseOrder(vendor=vendor, status="open", created_by="tester")
        po_two = PurchaseOrder(vendor=vendor, status="open", created_by="tester")
        line_one = POLine(
            po=po_one,
            item=item,
            description="Widget",
            qty_ordered=Decimal("4.00"),
            unit_cost=Decimal("5.00"),
        )
        line_two = POLine(
            po=po_two,
            item=item,
            description="Widget",
            qty_ordered=Decimal("6.00"),
            unit_cost=Decimal("5.00"),
        )
        session.add_all([vendor, location, item, po_one, po_two, line_one, line_two])
        await session.commit()
        await session.refresh(po_one)
        await session.refresh(po_two)
        await session.refresh(line_one)
        await session.refresh(line_two)

        po_one_id = po_one.po_id
        line_one_id = line_one.po_line_id
        line_two_id = line_two.po_line_id

    payload = [
        {
            "po_line_id": line_two_id,
            "qty_received": 1,
            "unit_cost": 5.0,
        }
    ]

    response = await client.post(f"/po/{po_one_id}/receive", json=payload)

    assert response.status_code == 400
    assert response.json()["detail"] == "po_line_mismatch"

    async with SessionLocal() as session:
        line_one_db = await session.get(POLine, line_one_id)
        line_two_db = await session.get(POLine, line_two_id)

        assert float(line_one_db.qty_received or 0) == pytest.approx(0.0)
        assert float(line_two_db.qty_received or 0) == pytest.approx(0.0)

        receiving_count = (
            await session.execute(select(func.count()).select_from(Receiving))
        ).scalar_one()
        receiving_line_count = (
            await session.execute(select(func.count()).select_from(ReceivingLine))
        ).scalar_one()
        inventory_txn_count = (
            await session.execute(select(func.count()).select_from(InventoryTxn))
        ).scalar_one()
        bill_count = (
            await session.execute(select(func.count()).select_from(Bill))
        ).scalar_one()

        assert receiving_count == 0
        assert receiving_line_count == 0
        assert inventory_txn_count == 0
        assert bill_count == 0

        po_one_db = await session.get(PurchaseOrder, po_one_id)
        assert po_one_db.status == "open"
