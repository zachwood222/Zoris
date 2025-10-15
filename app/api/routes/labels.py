"""Label endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models.domain import LabelTemplate
from ..schemas.common import LabelRenderRequest, LabelRenderResponse
from ..services.labels import render_label

router = APIRouter()


@router.get("/templates")
async def list_templates(session: AsyncSession = Depends(get_session)) -> list[dict]:
    templates = (await session.execute(select(LabelTemplate))).scalars().all()
    return [
        {"template_id": template.template_id, "name": template.name, "target": template.target}
        for template in templates
    ]


@router.post("/render", response_model=LabelRenderResponse)
async def render(payload: LabelRenderRequest, session: AsyncSession = Depends(get_session)) -> LabelRenderResponse:
    try:
        xml = await render_label(session, payload.template_id, payload.context)
    except ValueError as exc:
        raise HTTPException(status_code=404, detail="template_not_found") from exc
    return LabelRenderResponse(template_id=payload.template_id, xml=xml)
