"""Render DYMO label templates."""
from __future__ import annotations

from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..models.domain import LabelTemplate


def _parse_decimal(value: Any) -> Decimal | None:
    """Best-effort conversion of label context values to ``Decimal``."""

    if value is None:
        return None

    if isinstance(value, Decimal):
        return value

    if isinstance(value, (int, float)):
        return Decimal(str(value))

    if isinstance(value, str):
        cleaned = value.strip().replace("$", "")
        if not cleaned:
            return None
        try:
            return Decimal(cleaned)
        except InvalidOperation:
            return None

    return None


def calculate_upcharge_code(cost_value: Any, price_value: Any) -> str | None:
    """Return an alphanumeric code summarizing the markup between cost and price.

    The resulting code uses five-point increments so that a markup of 32% becomes
    ``"U30"`` while 65.8% rounds to ``"U65"``. ``None`` is returned when the
    calculation cannot be performed, such as missing or zero cost values.
    """

    cost = _parse_decimal(cost_value)
    price = _parse_decimal(price_value)

    if cost is None or price is None or cost <= 0:
        return None

    markup = (price - cost) / cost * Decimal("100")
    if markup <= 0:
        rounded = Decimal(0)
    else:
        rounded = (
            (markup / Decimal(5))
            .quantize(Decimal(1), rounding=ROUND_HALF_UP)
            * Decimal(5)
        )

    return f"U{int(rounded):02d}"


def _lookup_context_value(context: dict[str, Any], *keys: str) -> Any:
    for key in keys:
        if key in context:
            return context[key]
    return None


async def render_label(session: AsyncSession, template_id: int, context: dict[str, Any]) -> str:
    template = await session.scalar(select(LabelTemplate).where(LabelTemplate.template_id == template_id))
    if not template:
        raise ValueError("template_not_found")

    context = dict(context)
    if "UPCHARGE_CODE" not in context:
        price = _lookup_context_value(context, "PRICE", "price", "Price")
        cost = _lookup_context_value(
            context, "UNIT_COST", "unit_cost", "COST", "cost"
        )
        code = calculate_upcharge_code(cost, price)
        if code:
            context["UPCHARGE_CODE"] = code

    xml = template.dymo_label_xml
    for key, value in context.items():
        xml = xml.replace(f"{{{key}}}", str(value))
    return xml
