"""Inventory endpoints."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models.domain import Inventory, InventoryTxn
from ..schemas.common import InventoryAdjustRequest, InventoryTransferRequest

router = APIRouter()


@router.post("/adjust")
async def adjust_inventory(payload: InventoryAdjustRequest, session: AsyncSession = Depends(get_session)) -> dict:
    inventory = await session.scalar(
        select(Inventory).where(
            Inventory.item_id == payload.item_id,
            Inventory.location_id == payload.location_id,
        )
    )
    if not inventory:
        inventory = Inventory(
            item_id=payload.item_id,
            location_id=payload.location_id,
            qty_on_hand=0,
            qty_reserved=0,
            avg_cost=0,
        )
        session.add(inventory)
    inventory.qty_on_hand = (inventory.qty_on_hand or 0) + payload.qty_delta
    txn = InventoryTxn(
        item_id=payload.item_id,
        location_id=payload.location_id,
        qty_delta=payload.qty_delta,
        reason=payload.reason,
        ref_type="manual_adjust",
        unit_cost=inventory.avg_cost,
        created_at=datetime.utcnow(),
    )
    session.add(txn)
    await session.flush()
    return {"inventory_id": inventory.inv_id, "new_qty": float(inventory.qty_on_hand)}


@router.post("/transfer")
async def transfer_inventory(payload: InventoryTransferRequest, session: AsyncSession = Depends(get_session)) -> dict:
    await adjust_inventory(
        InventoryAdjustRequest(
            item_id=payload.item_id,
            location_id=payload.from_location_id,
            qty_delta=-payload.qty,
            reason="transfer",
        ),
        session,
    )
    result = await adjust_inventory(
        InventoryAdjustRequest(
            item_id=payload.item_id,
            location_id=payload.to_location_id,
            qty_delta=payload.qty,
            reason="transfer",
        ),
        session,
    )
    return result
