"""Purchase order endpoints."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models.domain import Bill, InventoryTxn, POLine, PurchaseOrder, Receiving, ReceivingLine
from ..security import User, require_roles

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
