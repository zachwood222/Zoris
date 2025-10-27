"""Incoming truck endpoints."""
from __future__ import annotations

import logging
from collections import defaultdict
from decimal import Decimal
from typing import Sequence

from fastapi import APIRouter, Depends, HTTPException, status
from psycopg.errors import UndefinedTable
from sqlalchemy import select
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models.domain import (
    IncomingTruck,
    IncomingTruckLine,
    IncomingTruckUpdate,
    POLine,
    PurchaseOrder,
)
from ..schemas.incoming_trucks import (
    IncomingTruckAggregatedUpdates,
    IncomingTruckCreate,
    IncomingTruckLineProgress,
    IncomingTruckLineRead,
    IncomingTruckResponse,
    IncomingTruckUpdateCreate,
    IncomingTruckUpdateRead,
)
from ..security import User, require_roles
from ..utils.datetime import utc_now

router = APIRouter()

logger = logging.getLogger(__name__)


async def _execute_incoming_truck_query(
    session: AsyncSession, statement
):
    """Execute a statement while tolerating missing truck tables.

    Older databases may not yet have the incoming truck tables. When that
    happens, we want to return an empty payload instead of failing the entire
    request with a 500 error.
    """

    try:
        return await session.execute(statement)
    except ProgrammingError as exc:
        if isinstance(exc.orig, UndefinedTable):
            logger.warning(
                "Incoming truck tables are unavailable; returning an empty response.",
            )
            await session.rollback()
            return None
        raise


def _to_decimal(value: float | None) -> Decimal | None:
    if value is None:
        return None
    return Decimal(str(value))


def _to_float(value: Decimal | float | None) -> float | None:
    if value is None:
        return None
    return float(value)


def _serialize_line(line: IncomingTruckLine) -> IncomingTruckLineRead:
    return IncomingTruckLineRead(
        truck_line_id=line.truck_line_id,
        po_line_id=line.po_line_id,
        item_id=line.item_id,
        description=line.description,
        qty_expected=_to_float(line.qty_expected),
    )


def _serialize_update(update: IncomingTruckUpdate) -> IncomingTruckUpdateRead:
    created_at = update.created_at or utc_now()
    return IncomingTruckUpdateRead(
        update_id=update.update_id,
        truck_id=update.truck_id,
        update_type=update.update_type,
        message=update.message,
        status=update.status,
        po_line_id=update.po_line_id,
        item_id=update.item_id,
        quantity=_to_float(update.quantity),
        created_by=update.created_by,
        created_at=created_at,
    )


def _aggregate_updates(updates: Sequence[IncomingTruckUpdate]) -> list[IncomingTruckLineProgress]:
    line_totals: dict[int, IncomingTruckLineProgress] = {}
    for update in updates:
        if update.update_type != "line_progress" or update.po_line_id is None:
            continue
        quantity = _to_float(update.quantity) or 0.0
        existing = line_totals.get(update.po_line_id)
        if existing:
            existing.total_quantity += quantity
        else:
            line_totals[update.po_line_id] = IncomingTruckLineProgress(
                po_line_id=update.po_line_id,
                item_id=update.item_id,
                total_quantity=quantity,
            )
    return sorted(line_totals.values(), key=lambda entry: entry.po_line_id)


def _build_truck_response(
    truck: IncomingTruck,
    lines: Sequence[IncomingTruckLine],
    updates: Sequence[IncomingTruckUpdate],
) -> IncomingTruckResponse:
    sorted_updates = sorted(updates, key=lambda update: update.created_at or utc_now())
    history = [_serialize_update(update) for update in sorted_updates]
    latest_status = None
    note_count = 0
    for update in sorted_updates:
        if update.update_type == "status" and update.status:
            latest_status = update.status
        elif update.update_type == "note":
            note_count += 1

    line_progress = _aggregate_updates(sorted_updates)

    aggregated = IncomingTruckAggregatedUpdates(
        latest_status=latest_status,
        note_count=note_count,
        line_progress=line_progress,
        history=history,
    )

    return IncomingTruckResponse(
        truck_id=truck.truck_id,
        po_id=truck.po_id,
        reference=truck.reference,
        carrier=truck.carrier,
        status=truck.status,
        scheduled_arrival=truck.scheduled_arrival,
        arrived_at=truck.arrived_at,
        created_at=truck.created_at,
        lines=[_serialize_line(line) for line in sorted(lines, key=lambda line: line.truck_line_id)],
        updates=aggregated,
    )


@router.get("", response_model=list[IncomingTruckResponse])
async def list_incoming_trucks(
    session: AsyncSession = Depends(get_session),
) -> list[IncomingTruckResponse]:
    result = await _execute_incoming_truck_query(
        session, select(IncomingTruck).order_by(IncomingTruck.created_at.desc())
    )
    if result is None:
        return []

    trucks = result.scalars().all()
    if not trucks:
        return []

    truck_ids = [truck.truck_id for truck in trucks]

    lines_map: dict[int, list[IncomingTruckLine]] = defaultdict(list)
    updates_map: dict[int, list[IncomingTruckUpdate]] = defaultdict(list)

    if truck_ids:
        line_rows = await _execute_incoming_truck_query(
            session, select(IncomingTruckLine).where(IncomingTruckLine.truck_id.in_(truck_ids))
        )
        if line_rows is not None:
            for line in line_rows.scalars():
                lines_map[line.truck_id].append(line)

        update_rows = await _execute_incoming_truck_query(
            session,
            select(IncomingTruckUpdate)
            .where(IncomingTruckUpdate.truck_id.in_(truck_ids))
            .order_by(IncomingTruckUpdate.created_at),
        )
        if update_rows is not None:
            for update in update_rows.scalars():
                updates_map[update.truck_id].append(update)

    return [
        _build_truck_response(
            truck,
            lines_map.get(truck.truck_id, []),
            updates_map.get(truck.truck_id, []),
        )
        for truck in trucks
    ]


@router.post("", response_model=IncomingTruckResponse, status_code=status.HTTP_200_OK)
async def create_incoming_truck(
    payload: IncomingTruckCreate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_roles("Purchasing", "Admin", "Driver")),
) -> IncomingTruckResponse:
    po = await session.get(PurchaseOrder, payload.po_id)
    if not po:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="po_not_found")

    truck = IncomingTruck(
        po_id=payload.po_id,
        reference=payload.reference,
        carrier=payload.carrier,
        status=payload.status,
        scheduled_arrival=payload.scheduled_arrival,
    )
    session.add(truck)
    await session.flush()

    for line_payload in payload.lines:
        po_line = await session.get(POLine, line_payload.po_line_id)
        if not po_line or po_line.po_id != payload.po_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="po_line_mismatch")
        if line_payload.item_id != po_line.item_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="item_mismatch")

        truck_line = IncomingTruckLine(
            truck_id=truck.truck_id,
            po_line_id=po_line.po_line_id,
            item_id=line_payload.item_id,
            description=line_payload.description or po_line.description,
            qty_expected=_to_decimal(line_payload.qty_expected),
        )
        session.add(truck_line)

    await session.flush()

    lines = (
        await session.execute(
            select(IncomingTruckLine).where(IncomingTruckLine.truck_id == truck.truck_id)
        )
    ).scalars().all()
    return _build_truck_response(truck, lines, [])


@router.post("/{truck_id}/updates", response_model=IncomingTruckUpdateRead)
async def create_incoming_truck_update(
    truck_id: int,
    payload: IncomingTruckUpdateCreate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_roles("Purchasing", "Admin", "Driver")),
) -> IncomingTruckUpdateRead:
    truck = await session.get(IncomingTruck, truck_id)
    if not truck:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="truck_not_found")

    po_line = None
    item_id = payload.item_id
    if payload.po_line_id is not None:
        po_line = await session.get(POLine, payload.po_line_id)
        if not po_line or po_line.po_id != truck.po_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="po_line_mismatch")
        if item_id is None:
            item_id = po_line.item_id
        elif item_id != po_line.item_id:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="item_mismatch")
    elif item_id is not None:
        po_line = await session.scalar(
            select(POLine).where(POLine.po_id == truck.po_id, POLine.item_id == item_id)
        )
        if not po_line:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="item_not_in_po")

    if payload.update_type == "line_progress":
        if payload.po_line_id is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="po_line_required")
        if payload.quantity is None:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="quantity_required")

    if payload.update_type == "status" and not payload.status:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="status_required")

    update = IncomingTruckUpdate(
        truck_id=truck.truck_id,
        update_type=payload.update_type,
        message=payload.message,
        status=payload.status,
        po_line_id=payload.po_line_id,
        item_id=item_id,
        quantity=_to_decimal(payload.quantity),
        created_by=user.id,
    )
    session.add(update)

    if payload.update_type == "status" and payload.status:
        truck.status = payload.status

    await session.flush()
    await session.refresh(update)

    return _serialize_update(update)
