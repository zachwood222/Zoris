"""Item endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import and_, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models.domain import (
    Barcode,
    Inventory,
    Item,
    Location,
    POLine,
    PurchaseOrder,
    Sale,
    SaleLine,
    Vendor,
)
from ..schemas.common import ItemSummary
from ..schemas.items import (
    CatalogItemSummary,
    CatalogLocationInfo,
    IncomingPurchaseInfo,
    ItemDetailResponse,
    ItemLocationInfo,
)

router = APIRouter()


@router.get("/catalog", response_model=list[CatalogItemSummary])
async def list_catalog_items(
    q: str | None = None,
    limit: int = 50,
    session: AsyncSession = Depends(get_session),
) -> list[CatalogItemSummary]:
    search = (q or "").strip()
    limit_value = max(1, min(limit, 100))

    stmt = select(Item).where(Item.active.is_(True)).order_by(Item.description.asc())
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            or_(Item.sku.ilike(pattern), Item.description.ilike(pattern))
        )
    stmt = stmt.limit(limit_value)

    items = (await session.execute(stmt)).scalars().all()
    if not items:
        return []

    item_ids = [item.item_id for item in items]

    inventory_stmt = (
        select(
            Inventory.item_id.label("item_id"),
            Inventory.qty_on_hand.label("qty_on_hand"),
            Location.location_id.label("location_id"),
            Location.name.label("location_name"),
        )
        .join(Location, Inventory.location_id == Location.location_id, isouter=True)
        .where(Inventory.item_id.in_(item_ids))
    )

    inventory_rows = (await session.execute(inventory_stmt)).all()
    totals: dict[int, float] = {item_id: 0.0 for item_id in item_ids}
    top_candidates: dict[int, tuple[int, str, float]] = {}

    for row in inventory_rows:
        item_id = row.item_id
        qty = float(row.qty_on_hand or 0)
        totals[item_id] = totals.get(item_id, 0.0) + qty
        if row.location_id is not None and row.location_name:
            current = top_candidates.get(item_id)
            if current is None or qty > current[2]:
                top_candidates[item_id] = (
                    row.location_id,
                    row.location_name,
                    qty,
                )

    catalog_items: list[CatalogItemSummary] = []
    for item in items:
        candidate = top_candidates.get(item.item_id)
        top_location = (
            CatalogLocationInfo(
                location_id=candidate[0],
                location_name=candidate[1],
                qty_on_hand=candidate[2],
            )
            if candidate
            else None
        )
        catalog_items.append(
            CatalogItemSummary(
                item_id=item.item_id,
                sku=item.sku,
                description=item.description,
                vendor_model=item.vendor_model,
                total_on_hand=totals.get(item.item_id, 0.0),
                top_location=top_location,
            )
        )

    return catalog_items


@router.get("/search", response_model=list[ItemSummary])
async def search_items(q: str, session: AsyncSession = Depends(get_session)) -> list[ItemSummary]:
    pattern = f"%{q}%"
    stmt = (
        select(Item)
        .where(
            or_(
                Item.sku.ilike(pattern),
                Item.description.ilike(pattern),
                Item.short_code.ilike(pattern),
            )
        )
        .limit(20)
    )
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


@router.get("/{item_id}", response_model=ItemDetailResponse)
async def get_item_detail(
    item_id: int, session: AsyncSession = Depends(get_session)
) -> ItemDetailResponse:
    item = await session.scalar(select(Item).where(Item.item_id == item_id))
    if not item:
        raise HTTPException(status_code=404, detail="not_found")

    location_rows = (
        await session.execute(
            select(
                Location.location_id,
                Location.name,
                Inventory.qty_on_hand,
                Inventory.qty_reserved,
            )
            .join(Inventory, Inventory.location_id == Location.location_id)
            .where(Inventory.item_id == item_id)
            .order_by(Location.name)
        )
    ).all()

    locations = [
        ItemLocationInfo(
            location_id=location_id,
            location_name=name,
            qty_on_hand=float(qty_on_hand or 0),
            qty_reserved=float(qty_reserved or 0),
        )
        for location_id, name, qty_on_hand, qty_reserved in location_rows
    ]

    incoming_rows = (
        await session.execute(
            select(
                PurchaseOrder.po_id,
                PurchaseOrder.status,
                PurchaseOrder.expected_date,
                Vendor.name,
                POLine.qty_ordered,
                POLine.qty_received,
            )
            .join(POLine, POLine.po_id == PurchaseOrder.po_id)
            .join(Vendor, PurchaseOrder.vendor_id == Vendor.vendor_id, isouter=True)
            .where(
                and_(
                    POLine.item_id == item_id,
                    POLine.qty_received < POLine.qty_ordered,
                    PurchaseOrder.status.in_(["open", "partial"]),
                )
            )
            .order_by(PurchaseOrder.expected_date)
        )
    ).all()

    incoming = []
    for po_id, status, expected_date, vendor_name, qty_ordered, qty_received in incoming_rows:
        qty_ordered_f = float(qty_ordered or 0)
        qty_received_f = float(qty_received or 0)
        incoming.append(
            IncomingPurchaseInfo(
                po_id=po_id,
                status=status,
                expected_date=expected_date,
                vendor_name=vendor_name,
                qty_ordered=qty_ordered_f,
                qty_received=qty_received_f,
                qty_remaining=max(qty_ordered_f - qty_received_f, 0.0),
            )
        )

    total_on_hand = sum(location.qty_on_hand for location in locations)

    return ItemDetailResponse(
        item=ItemSummary(
            item_id=item.item_id,
            sku=item.sku,
            description=item.description,
            price=float(item.price),
            short_code=item.short_code,
        ),
        total_on_hand=total_on_hand,
        locations=locations,
        incoming=incoming,
    )
