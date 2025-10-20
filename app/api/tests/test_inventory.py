from __future__ import annotations

from decimal import Decimal

import pytest
from sqlalchemy import select

from ..db import SessionLocal, engine
from ..models.base import Base
from ..models.domain import Inventory, InventoryTxn, Item, Location
from ..routes.inventory import adjust_inventory, transfer_inventory
from ..schemas.common import InventoryAdjustRequest, InventoryTransferRequest


@pytest.mark.asyncio
async def test_adjust_inventory_preserves_decimal_storage():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        item = Item(
            sku="SKU-DECIMAL",
            description="Decimal Item",
            unit_cost=Decimal("1.00"),
            price=Decimal("2.00"),
            short_code="D001",
        )
        location = Location(name="Warehouse", type="warehouse")
        inventory = Inventory(
            item=item,
            location=location,
            qty_on_hand=Decimal("5.50"),
            qty_reserved=Decimal("0.00"),
            avg_cost=Decimal("1.00"),
        )
        session.add_all([item, location, inventory])
        await session.commit()
        await session.refresh(item)
        await session.refresh(location)
        await session.refresh(inventory)
        item_id = item.item_id
        location_id = location.location_id
        inventory_id = inventory.inv_id

    payload = InventoryAdjustRequest(
        item_id=item_id,
        location_id=location_id,
        qty_delta=2.5,
        reason="adjust",
    )

    async with SessionLocal() as session:
        response = await adjust_inventory(payload, session=session)
        await session.commit()

    assert response["new_qty"] == pytest.approx(8.0)

    async with SessionLocal() as session:
        updated_inventory = await session.scalar(
            select(Inventory).where(Inventory.inv_id == inventory_id)
        )
        assert updated_inventory is not None
        assert isinstance(updated_inventory.qty_on_hand, Decimal)
        assert updated_inventory.qty_on_hand == Decimal("8.00")


@pytest.mark.asyncio
async def test_transfer_inventory_records_transfer_txn():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        item = Item(
            sku="SKU-TRANSFER",
            description="Transfer Item",
            unit_cost=Decimal("5.00"),
            price=Decimal("10.00"),
            short_code="T001",
        )
        from_location = Location(name="Main Floor", type="warehouse")
        to_location = Location(name="Overflow", type="warehouse")
        inventory = Inventory(
            item=item,
            location=from_location,
            qty_on_hand=Decimal("5.00"),
            qty_reserved=Decimal("0.00"),
            avg_cost=Decimal("5.00"),
        )
        session.add_all([item, from_location, to_location, inventory])
        await session.commit()
        await session.refresh(item)
        await session.refresh(from_location)
        await session.refresh(to_location)
        from_location_id = from_location.location_id
        to_location_id = to_location.location_id
        item_id = item.item_id

    transfer_payload = InventoryTransferRequest(
        item_id=item_id,
        from_location_id=from_location_id,
        to_location_id=to_location_id,
        qty=2,
    )

    async with SessionLocal() as session:
        await transfer_inventory(transfer_payload, session=session)
        await session.commit()

    async with SessionLocal() as session:
        txn_rows = (
            await session.execute(
                select(InventoryTxn)
                .where(
                    InventoryTxn.item_id == item_id,
                    InventoryTxn.ref_type == "transfer",
                )
                .order_by(InventoryTxn.location_id)
            )
        ).scalars().all()
        assert len(txn_rows) == 2
        qty_by_location = {txn.location_id: float(txn.qty_delta) for txn in txn_rows}
        assert qty_by_location[from_location_id] == pytest.approx(-2)
        assert qty_by_location[to_location_id] == pytest.approx(2)
        for txn in txn_rows:
            assert txn.reason == "transfer"

        from_inventory = await session.scalar(
            select(Inventory).where(
                Inventory.item_id == item_id,
                Inventory.location_id == from_location_id,
            )
        )
        to_inventory = await session.scalar(
            select(Inventory).where(
                Inventory.item_id == item_id,
                Inventory.location_id == to_location_id,
            )
        )
        assert from_inventory is not None and to_inventory is not None
        assert float(from_inventory.qty_on_hand) == pytest.approx(3)
        assert float(to_inventory.qty_on_hand) == pytest.approx(2)
