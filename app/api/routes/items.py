"""Item endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models.domain import Barcode, Inventory, Item, Location
from ..schemas.common import ItemSummary

router = APIRouter()


@router.get("/search", response_model=list[ItemSummary])
async def search_items(q: str, session: AsyncSession = Depends(get_session)) -> list[ItemSummary]:
    pattern = f"%{q}%"
    stmt = select(Item).where(or_(Item.sku.ilike(pattern), Item.description.ilike(pattern))).limit(20)
    items = (await session.scalars(stmt)).all()
    return [
        ItemSummary(
            item_id=item.item_id,
            sku=item.sku,
            description=item.description,
            price=float(item.price),
            short_code=item.short_code,
        )
        for item in items
    ]


@router.get("/by-short-code/{code}", response_model=ItemSummary)
async def get_by_short_code(code: str, session: AsyncSession = Depends(get_session)) -> ItemSummary:
    item = await session.scalar(select(Item).where(Item.short_code == code))
    if not item:
        raise HTTPException(status_code=404, detail="not_found")
    return ItemSummary(
        item_id=item.item_id,
        sku=item.sku,
        description=item.description,
        price=float(item.price),
        short_code=item.short_code,
    )


@router.get("/scan/{barcode}")
async def scan(barcode: str, session: AsyncSession = Depends(get_session)) -> dict:
    item = await session.scalar(
        select(Item).join(Barcode).where(Barcode.barcode == barcode)
    )
    if not item:
        raise HTTPException(status_code=404, detail="barcode_not_found")
    inventory = (await session.execute(
        select(Location.name, Inventory.qty_on_hand)
        .join(Inventory, Inventory.location_id == Location.location_id)
        .where(Inventory.item_id == item.item_id)
    )).all()
    return {
        "item": ItemSummary(
            item_id=item.item_id,
            sku=item.sku,
            description=item.description,
            price=float(item.price),
            short_code=item.short_code,
        ),
        "locations": [
            {"location": loc, "qty_on_hand": float(qty)} for loc, qty in inventory
        ],
        "last_cost": float(item.unit_cost),
    }
