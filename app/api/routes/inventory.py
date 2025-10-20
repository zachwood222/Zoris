"""Inventory endpoints."""
from __future__ import annotations

from decimal import Decimal

from fastapi import APIRouter, Depends
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models.domain import Inventory, InventoryTxn
from ..schemas.common import InventoryAdjustRequest, InventoryTransferRequest
from ..utils.datetime import utc_now

router = APIRouter()


async def _apply_inventory_adjustment(
    payload: InventoryAdjustRequest,
    session: AsyncSession,
    *,
    ref_type: str,
) -> dict:
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
            qty_on_hand=Decimal("0"),
            qty_reserved=Decimal("0"),
            avg_cost=Decimal("0"),
        )
        session.add(inventory)

    current_qty = inventory.qty_on_hand if inventory.qty_on_hand is not None else Decimal("0")
    qty_delta = Decimal(str(payload.qty_delta))
    inventory.qty_on_hand = Decimal(current_qty) + qty_delta
    txn = InventoryTxn(
        item_id=payload.item_id,
        location_id=payload.location_id,
        qty_delta=payload.qty_delta,
        reason=payload.reason,
        ref_type=ref_type,
        unit_cost=inventory.avg_cost,
        created_at=utc_now(),
    )
    session.add(txn)
    await session.flush()
    return {"inventory_id": inventory.inv_id, "new_qty": float(inventory.qty_on_hand)}


@router.post("/adjust")
async def adjust_inventory(
    payload: InventoryAdjustRequest,
    session: AsyncSession = Depends(get_session),
) -> dict:
    return await _apply_inventory_adjustment(payload, session, ref_type="manual_adjust")


@router.post("/transfer")
async def transfer_inventory(payload: InventoryTransferRequest, session: AsyncSession = Depends(get_session)) -> dict:
    await _apply_inventory_adjustment(
        InventoryAdjustRequest(
            item_id=payload.item_id,
            location_id=payload.from_location_id,
            qty_delta=-payload.qty,
            reason="transfer",
        ),
        session,
        ref_type="transfer",
    )
    result = await _apply_inventory_adjustment(
        InventoryAdjustRequest(
            item_id=payload.item_id,
            location_id=payload.to_location_id,
            qty_delta=payload.qty,
            reason="transfer",
        ),
        session,
        ref_type="transfer",
    )
    return result
