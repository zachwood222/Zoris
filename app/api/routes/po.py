"""Purchase order endpoints."""
from __future__ import annotations

from datetime import datetime
import re

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models.domain import (
    Barcode,
    Bill,
    Item,
    InventoryTxn,
    POLine,
    PurchaseOrder,
    Receiving,
    ReceivingLine,
    Vendor,
)
from ..security import User, require_roles
from ..schemas.po import POLineSearchResult

router = APIRouter()


class POLinePayload(BaseModel):
    item_id: int
    description: str
    qty_ordered: float
    unit_cost: float


class POCreatePayload(BaseModel):
    vendor_id: int
    lines: list[POLinePayload]
    notes: str | None = None


class POReceiveLinePayload(BaseModel):
    po_line_id: int
    qty_received: float
    unit_cost: float | None = None


class POLineLookupResponse(BaseModel):
    po_id: int
    po_line_id: int
    item_id: int
    description: str
    qty_ordered: float
    qty_received: float
    qty_remaining: float


@router.post("", response_model=dict)
async def create_po(
    payload: POCreatePayload,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_roles("Purchasing", "Admin")),
) -> dict:
    po = PurchaseOrder(vendor_id=payload.vendor_id, status="open", notes=payload.notes, created_by=user.id)
    session.add(po)
    await session.flush()
    for line in payload.lines:
        session.add(
            POLine(
                po_id=po.po_id,
                item_id=line.item_id,
                description=line.description,
                qty_ordered=line.qty_ordered,
                unit_cost=line.unit_cost,
            )
        )
    await session.flush()
    return {"po_id": po.po_id}


@router.get("/{po_id}")
async def get_po(po_id: int, session: AsyncSession = Depends(get_session)) -> dict:
    po = await session.get(PurchaseOrder, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="not_found")
    lines = (await session.execute(select(POLine).where(POLine.po_id == po_id))).scalars().all()
    return {
        "po_id": po.po_id,
        "status": po.status,
        "lines": [
            {
                "po_line_id": line.po_line_id,
                "item_id": line.item_id,
                "description": line.description,
                "qty_ordered": float(line.qty_ordered),
                "qty_received": float(line.qty_received or 0),
                "unit_cost": float(line.unit_cost),
            }
            for line in lines
        ],
    }


@router.patch("/{po_id}")
async def update_po(po_id: int, payload: dict, session: AsyncSession = Depends(get_session)) -> dict:
    po = await session.get(PurchaseOrder, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="not_found")
    for key, value in payload.items():
        setattr(po, key, value)
    await session.flush()
    return {"po_id": po.po_id, "status": po.status}


@router.get("/lookup/{code}", response_model=list[POLineLookupResponse])
async def lookup_po_line(
    code: str,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_roles("Purchasing", "Admin")),
) -> list[POLineLookupResponse]:
    sanitized = code.strip()
    results: list[POLineLookupResponse] = []
    seen_lines: set[int] = set()

    potential_ids: list[int] = []
    if sanitized.isdigit():
        potential_ids.append(int(sanitized))
    else:
        for fragment in re.findall(r"\d+", sanitized):
            try:
                potential_ids.append(int(fragment))
            except ValueError:
                continue

    for line_id in potential_ids:
        if line_id in seen_lines:
            continue
        line = await session.get(POLine, line_id)
        if not line:
            continue
        po = await session.get(PurchaseOrder, line.po_id)
        if not po or po.status not in {"open", "partial"}:
            continue
        qty_ordered = float(line.qty_ordered)
        qty_received = float(line.qty_received or 0)
        qty_remaining = max(qty_ordered - qty_received, 0.0)
        if qty_remaining <= 0:
            continue
        results.append(
            POLineLookupResponse(
                po_id=line.po_id,
                po_line_id=line.po_line_id,
                item_id=line.item_id,
                description=line.description,
                qty_ordered=qty_ordered,
                qty_received=qty_received,
                qty_remaining=qty_remaining,
            )
        )
        seen_lines.add(line.po_line_id)

    if results:
        return results

    barcode = await session.get(Barcode, sanitized)
    if not barcode:
        raise HTTPException(status_code=404, detail="barcode_not_found")

    stmt = (
        select(POLine, PurchaseOrder)
        .join(PurchaseOrder, PurchaseOrder.po_id == POLine.po_id)
        .where(POLine.item_id == barcode.item_id)
        .where(PurchaseOrder.status.in_(("open", "partial")))
    )
    rows = (await session.execute(stmt)).all()
    for line, po in rows:
        if line.po_line_id in seen_lines:
            continue
        qty_ordered = float(line.qty_ordered)
        qty_received = float(line.qty_received or 0)
        qty_remaining = max(qty_ordered - qty_received, 0.0)
        if qty_remaining <= 0:
            continue
        results.append(
            POLineLookupResponse(
                po_id=line.po_id,
                po_line_id=line.po_line_id,
                item_id=line.item_id,
                description=line.description,
                qty_ordered=qty_ordered,
                qty_received=qty_received,
                qty_remaining=qty_remaining,
            )
        )
        seen_lines.add(line.po_line_id)

    if not results:
        raise HTTPException(status_code=404, detail="po_line_not_found")

    return results


def _escape_like(value: str) -> str:
    """Escape SQL LIKE wildcards in ``value``."""

    return value.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


@router.get("/lines/search", response_model=list[POLineSearchResult])
async def search_po_lines(
    q: str,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_roles("Purchasing", "Admin")),
) -> list[POLineSearchResult]:
    query = q.strip()
    if len(query) < 2:
        return []

    escaped = _escape_like(query)
    like_pattern = f"%{escaped}%"
    remaining_qty = POLine.qty_ordered - func.coalesce(POLine.qty_received, 0)

    stmt = (
        select(POLine, PurchaseOrder, Item, Vendor)
        .join(PurchaseOrder, PurchaseOrder.po_id == POLine.po_id)
        .join(Item, Item.item_id == POLine.item_id)
        .join(Vendor, Vendor.vendor_id == PurchaseOrder.vendor_id, isouter=True)
        .where(PurchaseOrder.status.in_(("open", "partial")))
        .where(remaining_qty > 0)
    )

    conditions = [
        Item.sku.ilike(like_pattern, escape="\\"),
        Item.description.ilike(like_pattern, escape="\\"),
        POLine.description.ilike(like_pattern, escape="\\"),
        PurchaseOrder.notes.ilike(like_pattern, escape="\\"),
        Vendor.name.ilike(like_pattern, escape="\\"),
    ]

    digit_tokens = {int(fragment) for fragment in re.findall(r"\d+", query)}
    if digit_tokens:
        conditions.extend(
            (
                PurchaseOrder.po_id.in_(digit_tokens),
                POLine.po_line_id.in_(digit_tokens),
                Item.item_id.in_(digit_tokens),
            )
        )

    stmt = stmt.where(or_(*conditions)).order_by(PurchaseOrder.po_id.desc(), POLine.po_line_id).limit(50)

    rows = (await session.execute(stmt)).all()

    results: list[POLineSearchResult] = []
    for line, po, item, vendor in rows:
        qty_ordered = float(line.qty_ordered or 0)
        qty_received = float(line.qty_received or 0)
        qty_remaining = max(qty_ordered - qty_received, 0.0)
        if qty_remaining <= 0:
            continue

        results.append(
            POLineSearchResult(
                po_id=po.po_id,
                po_number=f"PO-{po.po_id}",
                po_line_id=line.po_line_id,
                item_id=line.item_id,
                item_description=line.description or item.description,
                vendor=vendor.name if vendor else None,
                qty_ordered=qty_ordered,
                qty_remaining=qty_remaining,
            )
        )

    return results


@router.post("/{po_id}/receive")
async def receive_po(
    po_id: int,
    payload: list[POReceiveLinePayload],
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_roles("Purchasing", "Admin")),
) -> dict:
    po = await session.get(PurchaseOrder, po_id)
    if not po:
        raise HTTPException(status_code=404, detail="not_found")
    receiving = Receiving(po_id=po_id, received_by=user.id)
    session.add(receiving)
    await session.flush()
    subtotal = 0.0
    for line_payload in payload:
        line = await session.get(POLine, line_payload.po_line_id)
        if not line:
            continue
        if line.po_id != po_id:
            raise HTTPException(status_code=400, detail="po_line_mismatch")
        qty = line_payload.qty_received
        unit_cost = float(line_payload.unit_cost or line.unit_cost)
        line.qty_received = (line.qty_received or 0) + qty
        subtotal += qty * unit_cost
        session.add(
            ReceivingLine(
                receipt_id=receiving.receipt_id,
                po_line_id=line.po_line_id,
                item_id=line.item_id,
                qty_received=qty,
                unit_cost=unit_cost,
            )
        )
        session.add(
            InventoryTxn(
                item_id=line.item_id,
                location_id=1,
                qty_delta=qty,
                reason="receive",
                ref_type="receiving",
                ref_id=receiving.receipt_id,
                unit_cost=unit_cost,
                created_at=datetime.utcnow(),
            )
        )
    bill = Bill(
        vendor_id=po.vendor_id,
        po_id=po_id,
        subtotal=subtotal,
        total=subtotal,
        status="draft",
    )
    session.add(bill)
    await session.flush()
    return {"receipt_id": receiving.receipt_id, "bill_id": bill.bill_id}
