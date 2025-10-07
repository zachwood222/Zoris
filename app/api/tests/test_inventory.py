from __future__ import annotations

from decimal import Decimal

import pytest
from sqlalchemy import select

from ..db import SessionLocal, engine
from ..models.base import Base
from ..models.domain import Inventory, Item, Location
from ..routes.inventory import adjust_inventory
from ..schemas.common import InventoryAdjustRequest


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
