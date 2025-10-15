from __future__ import annotations

import pytest

from ..db import SessionLocal, engine
from ..models.base import Base
from ..models.domain import LabelTemplate


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
