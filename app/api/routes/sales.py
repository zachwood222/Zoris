"""Sales endpoints."""
from __future__ import annotations

from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models.domain import Barcode, InventoryTxn, Item, Sale, SaleLine
from ..schemas.common import (
    OCRSaleTicketResponse,
    SaleCreateRequest,
    SaleDeliveryRequest,
    SaleDeliveryStatusResponse,
    SaleDeliveryStatusUpdate,
    SaleFinalizeResponse,
    SaleLineRequest,
)
from ..security import User, require_roles
from ..services import zapier

router = APIRouter()


@router.get("")
async def list_sales(session: AsyncSession = Depends(get_session)) -> dict:
    drafts = (
        await session.execute(select(Sale).where(Sale.status == "draft").limit(50))
    ).scalars()
    return {
        "drafts": [
            {
                "sale_id": sale.sale_id,
                "ocr_confidence": float(sale.ocr_confidence or 0),
                "total": float(sale.total or 0),
            }
            for sale in drafts
        ]
    }


@router.post("", response_model=dict)
async def create_sale(
    payload: SaleCreateRequest,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_roles("Floor", "Admin")),
) -> dict:
    sale = Sale(
        customer_id=payload.customer_id,
        status="draft",
        created_by=payload.created_by or (user.id if user else "system"),
        source=payload.source or "manual",
    )
    session.add(sale)
    await session.flush()
    return {"sale_id": sale.sale_id}


@router.post("/{sale_id}/add-line")
async def add_line(sale_id: int, payload: SaleLineRequest, session: AsyncSession = Depends(get_session)) -> dict:
    sale = await session.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="sale_not_found")
    item_stmt = select(Item)
    if payload.sku:
        item_stmt = item_stmt.where(Item.sku == payload.sku)
    elif payload.short_code:
        item_stmt = item_stmt.where(Item.short_code == payload.short_code)
    elif payload.barcode:
        item_stmt = item_stmt.join(Barcode).where(Barcode.barcode == payload.barcode)
    else:
        raise HTTPException(status_code=400, detail="missing_identifier")
    item = await session.scalar(item_stmt)
    if not item:
        raise HTTPException(status_code=404, detail="item_not_found")
    line = SaleLine(
        sale_id=sale_id,
        item_id=item.item_id,
        location_id=payload.location_id or 1,
        qty=payload.qty,
        unit_price=item.price,
    )
    session.add(line)
    await session.flush()
    sale.subtotal = (sale.subtotal or 0) + float(item.price) * payload.qty
    sale.total = sale.subtotal
    return {"sale_line_id": line.sale_line_id}


@router.post("/{sale_id}/finalize", response_model=SaleFinalizeResponse)
async def finalize_sale(sale_id: int, session: AsyncSession = Depends(get_session)) -> SaleFinalizeResponse:
    sale = await session.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="sale_not_found")
    sale.status = "open"
    sale.sale_date = datetime.utcnow()
    for line in sale.lines:
        session.add(
            InventoryTxn(
                item_id=line.item_id,
                location_id=line.location_id,
                qty_delta=-line.qty,
                reason="sale",
                ref_type="sale",
                ref_id=sale.sale_id,
                unit_cost=line.unit_price,
                created_at=datetime.utcnow(),
            )
        )
    await session.flush()
    zapier.ticket_finalized(
        {
            "sale_id": sale.sale_id,
            "subtotal": float(sale.subtotal or 0),
            "tax": float(sale.tax or 0),
            "total": float(sale.total or 0),
            "delivery_requested": sale.delivery_requested,
            "delivery_status": sale.delivery_status,
            "lines": [
                {
                    "sku": line.item.sku if line.item else "",
                    "qty": float(line.qty),
                    "price": float(line.unit_price),
                }
                for line in sale.lines
            ],
        }
    )
    return SaleFinalizeResponse(sale_id=sale.sale_id, status=sale.status, total=float(sale.total or 0))


@router.post("/{sale_id}/void")
async def void_sale(sale_id: int, session: AsyncSession = Depends(get_session)) -> dict:
    sale = await session.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="sale_not_found")
    sale.status = "void"
    await session.flush()
    return {"sale_id": sale.sale_id, "status": sale.status}


@router.post("/{sale_id}/delivery-request")
async def delivery_request(sale_id: int, payload: SaleDeliveryRequest, session: AsyncSession = Depends(get_session)) -> dict:
    sale = await session.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="sale_not_found")
    sale.delivery_requested = payload.delivery_requested
    if payload.delivery_requested:
        sale.delivery_status = sale.delivery_status or "queued"
    else:
        sale.delivery_status = None
    await session.flush()
    return {
        "sale_id": sale.sale_id,
        "delivery_requested": sale.delivery_requested,
        "delivery_status": sale.delivery_status,
    }


@router.get("/{sale_id}/delivery-status", response_model=SaleDeliveryStatusResponse)
async def get_delivery_status(
    sale_id: int,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_roles("Driver", "Admin")),
) -> SaleDeliveryStatusResponse:
    sale = await session.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="sale_not_found")
    return SaleDeliveryStatusResponse(sale_id=sale.sale_id, delivery_status=sale.delivery_status)


@router.patch("/{sale_id}/delivery-status", response_model=SaleDeliveryStatusResponse)
async def update_delivery_status(
    sale_id: int,
    payload: SaleDeliveryStatusUpdate,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_roles("Driver", "Admin")),
) -> SaleDeliveryStatusResponse:
    sale = await session.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="sale_not_found")
    sale.delivery_status = payload.delivery_status
    await session.flush()
    if sale.delivery_status == "delivered":
        zapier.delivery_completed({
            "sale_id": sale.sale_id,
            "delivery_status": sale.delivery_status,
        })
    return SaleDeliveryStatusResponse(sale_id=sale.sale_id, delivery_status=sale.delivery_status)


@router.post("/{sale_id}/approve")
async def approve_sale(
    sale_id: int,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_roles("Admin", "AP")),
) -> dict:
    sale = await session.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="sale_not_found")
    sale.status = "open"
    sale.sale_date = datetime.utcnow()
    await session.flush()
    return {"sale_id": sale.sale_id, "status": sale.status}


@router.post("/{sale_id}/reject")
async def reject_sale(
    sale_id: int,
    session: AsyncSession = Depends(get_session),
    user: User = Depends(require_roles("Admin", "AP")),
) -> dict:
    sale = await session.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="sale_not_found")
    sale.status = "draft"
    sale.delivery_requested = False
    await session.flush()
    return {"sale_id": sale.sale_id, "status": sale.status, "review_required": True}
