"""Render DYMO label templates."""
from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.domain import LabelTemplate


async def render_label(session: AsyncSession, template_id: int, context: dict[str, str]) -> str:
    template = await session.scalar(select(LabelTemplate).where(LabelTemplate.template_id == template_id))
    if not template:
        raise ValueError("template_not_found")
    xml = template.dymo_label_xml
    for key, value in context.items():
        xml = xml.replace(f"{{{key}}}", str(value))
    return xml
