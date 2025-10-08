from __future__ import annotations

from decimal import Decimal

import pytest

from ..db import SessionLocal, engine
from ..models.base import Base
from ..models.domain import Barcode, Item, Location, Sale
from ..routes.sales import add_line
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
