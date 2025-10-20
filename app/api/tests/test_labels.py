from __future__ import annotations

from decimal import Decimal

import pytest

from ..db import SessionLocal, engine
from ..models.base import Base
from ..models.domain import LabelTemplate
from ..services.labels import calculate_upcharge_code


@pytest.mark.asyncio
async def test_render_label_success_returns_xml(client) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        template = LabelTemplate(
            name="Test Label",
            target="item",
            dymo_label_xml="<DYMO>Example</DYMO>",
        )
        session.add(template)
        await session.commit()
        await session.refresh(template)

    response = await client.post(
        "/labels/render",
        json={"template_id": template.template_id, "context": {}},
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["template_id"] == template.template_id
    assert payload["xml"] == "<DYMO>Example</DYMO>"


@pytest.mark.asyncio
async def test_render_label_missing_template_returns_404(client) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    response = await client.post(
        "/labels/render",
        json={"template_id": 999, "context": {}},
    )

    assert response.status_code == 404
    assert response.json()["detail"] == "template_not_found"


def test_calculate_upcharge_code_rounds_to_nearest_five() -> None:
    assert calculate_upcharge_code("120", "199") == "U65"
    assert calculate_upcharge_code(Decimal("100"), Decimal("125")) == "U25"


def test_calculate_upcharge_code_returns_none_when_missing_data() -> None:
    assert calculate_upcharge_code(None, 100) is None
    assert calculate_upcharge_code(Decimal("0"), Decimal("100")) is None


@pytest.mark.asyncio
async def test_render_label_injects_upcharge_code(client) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    async with SessionLocal() as session:
        template = LabelTemplate(
            name="Upcharge Test",
            target="item",
            dymo_label_xml="<DYMO>{UPCHARGE_CODE}</DYMO>",
        )
        session.add(template)
        await session.commit()
        await session.refresh(template)

    response = await client.post(
        "/labels/render",
        json={
            "template_id": template.template_id,
            "context": {"PRICE": "199", "UNIT_COST": "120"},
        },
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["xml"] == "<DYMO>U65</DYMO>"
