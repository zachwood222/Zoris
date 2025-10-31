from __future__ import annotations

from decimal import Decimal

import pytest

from .. import sample_data
from ..db import SessionLocal, engine
from ..models.base import Base
from ..models.domain import Barcode, Item, Location, Sale, SaleLine
from ..routes.sales import add_line, finalize_sale
from ..schemas.common import SaleLineRequest


@pytest.mark.asyncio
async def test_add_line_with_barcode_lookup() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        item = Item(
            sku="SKU-ABC",
            description="Barcode Item",
            unit_cost=Decimal("10.00"),
            price=Decimal("20.00"),
            short_code="SC123",
        )
        barcode = Barcode(barcode="012345678905", item=item)
        location = Location(name="Showroom", type="retail")
        sale = Sale(status="draft", created_by="tester", source="manual")
        session.add_all([item, barcode, location, sale])
        await session.commit()
        sale_id = sale.sale_id
        location_id = location.location_id

    payload = SaleLineRequest(barcode="012345678905", location_id=location_id, qty=2)

    async with SessionLocal() as session:
        response = await add_line(sale_id, payload, session=session)
        await session.commit()

    assert "sale_line_id" in response

    async with SessionLocal() as session:
        sale = await session.get(Sale, sale_id)
        assert sale is not None
        assert float(sale.total) == pytest.approx(40.0)


@pytest.mark.asyncio
async def test_finalize_sale_eager_loads_lines() -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        item = Item(
            sku="SKU-FINALIZE",
            description="Finalize Item",
            unit_cost=Decimal("15.00"),
            price=Decimal("30.00"),
            short_code="FINAL",
        )
        location = Location(name="Warehouse", type="retail")
        sale = Sale(status="draft", created_by="tester", source="manual")
        session.add_all([item, location, sale])
        await session.flush()

        sale_line = SaleLine(
            sale_id=sale.sale_id,
            item_id=item.item_id,
            location_id=location.location_id,
            qty=1,
            unit_price=item.price,
        )
        sale.subtotal = sale.total = Decimal("30.00")
        session.add(sale_line)
        await session.commit()
        sale_id = sale.sale_id

    async with SessionLocal() as session:
        response = await finalize_sale(sale_id, session=session)
        await session.commit()

    assert response.status == "open"
    assert float(response.total) == pytest.approx(30.0)


@pytest.mark.asyncio
async def test_sales_dashboard_lists_open_and_fulfilled(client) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await sample_data.apply()

    response = await client.get("/sales/dashboard")
    assert response.status_code == 200

    payload = response.json()
    assert "open_sales" in payload
    assert "fulfilled_sales" in payload
    assert isinstance(payload["open_sales"], list)
    assert isinstance(payload["fulfilled_sales"], list)
    # demo dataset should seed at least one open and one fulfilled sale
    assert payload["open_sales"], "expected sample open sales"
    assert payload["fulfilled_sales"], "expected sample fulfilled sales"
