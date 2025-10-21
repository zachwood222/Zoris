from __future__ import annotations

import io

import pytest
from sqlalchemy import select

from ..db import SessionLocal, engine
from ..models.base import Base
from ..models.domain import Inventory, Item


@pytest.mark.asyncio
async def test_spreadsheet_import(client) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    csv_content = """entity,name,terms,phone,email,sku,description,short_code,price,qty_on_hand,location_name\n"""
    csv_content += "vendors,Acme Supply,Net 30,555-1000,vendor@example.com,,,,,,\n"
    csv_content += "locations,Main Showroom,floor,,,,,,,\n"
    csv_content += "items,,,,,SKU-123,Demo Sofa,D001,899.00,4,Main Showroom\n"
    csv_content += "customers,Jordan Alvarez,,555-0100,jordan@example.com,,,,,\n"

    files = {"file": ("data.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}

    response = await client.post("/imports/spreadsheet", files=files)
    assert response.status_code == 200

    payload = response.json()
    assert payload["counters"]["items"] == 1
    assert payload["counters"]["inventoryRecords"] == 1
    assert payload["counters"]["customers"] == 1

    async with SessionLocal() as session:
        item = await session.scalar(select(Item).where(Item.sku == "SKU-123"))
        assert item is not None
        inventory = await session.scalar(select(Inventory).where(Inventory.item_id == item.item_id))
        assert inventory is not None
        assert float(inventory.qty_on_hand) == pytest.approx(4.0)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

