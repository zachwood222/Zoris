from __future__ import annotations

import pytest

from .. import sample_data
from ..db import SessionLocal, engine
from ..models.base import Base


@pytest.mark.asyncio
async def test_dashboard_summary_includes_drilldowns(client) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await sample_data.apply()

    response = await client.get("/dashboard/summary")
    assert response.status_code == 200

    payload = response.json()
    assert "drilldowns" in payload
    drilldowns = payload["drilldowns"]

    assert "openSales" in drilldowns
    assert isinstance(drilldowns["openSales"], list)
    assert drilldowns["openSales"]
    first_sale = drilldowns["openSales"][0]
    assert first_sale["title"].startswith("Sale ")

    assert "activeReceivers" in drilldowns
    assert isinstance(drilldowns["activeReceivers"], list)
