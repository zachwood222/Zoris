from __future__ import annotations

import pytest
from sqlalchemy import select

from ..db import SessionLocal, engine
from ..models.base import Base
from ..models.domain import Item


@pytest.mark.asyncio
async def test_health(client) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    response = await client.get("/health")
    assert response.status_code == 200

    payload = response.json()
    assert payload["ok"] is True
    assert payload["fastapi"] is True
    assert payload["database"] is True
    assert "sample_data" in payload["detail"]
    assert payload["detail"]["sample_data"]["totals"]["items"] >= 3

    async with SessionLocal() as session:
        demo_item = await session.scalar(select(Item).where(Item.sku == "DEMO-SOFA"))
        assert demo_item is not None

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
