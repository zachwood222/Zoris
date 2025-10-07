"""Dashboard summary endpoints."""

from __future__ import annotations

from datetime import datetime, timedelta

from fastapi import APIRouter, Depends
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models.domain import PurchaseOrder, Receiving, Sale
from ..schemas.dashboard import (
    DashboardActivity,
    DashboardMetric,
    DashboardSummaryResponse,
    DashboardSystemStatus,
)

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _humanize_delta(now: datetime, past: datetime) -> str:
    delta = now - past
    seconds = int(delta.total_seconds())
    if seconds < 60:
        return "Just now"
    minutes = seconds // 60
    if minutes < 60:
        return f"{minutes} minute{'s' if minutes != 1 else ''} ago"
    hours = minutes // 60
    if hours < 24:
        return f"{hours} hour{'s' if hours != 1 else ''} ago"
    days = hours // 24
    return f"{days} day{'s' if days != 1 else ''} ago"


@router.get("/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    session: AsyncSession = Depends(get_session),
) -> DashboardSummaryResponse:
    now = datetime.utcnow()
    last_24h = now - timedelta(hours=24)
    worker_window = now - timedelta(hours=4)

    open_sales_stmt = select(func.count()).select_from(Sale).where(Sale.status == "open")
    open_sales = (await session.scalar(open_sales_stmt)) or 0
    open_sales_today_stmt = (
        select(func.count())
        .select_from(Sale)
        .where(Sale.status == "open", Sale.created_at >= last_24h)
    )
    open_sales_today = (await session.scalar(open_sales_today_stmt)) or 0

    draft_ocr_stmt = (
        select(func.count())
        .select_from(Sale)
        .where(Sale.status == "draft", Sale.source == "ocr_ticket")
    )
    draft_ocr = (await session.scalar(draft_ocr_stmt)) or 0
    draft_ocr_new_stmt = (
        select(func.count())
        .select_from(Sale)
        .where(
            Sale.status == "draft",
            Sale.source == "ocr_ticket",
            Sale.created_at >= last_24h,
        )
    )
    draft_ocr_new = (await session.scalar(draft_ocr_new_stmt)) or 0

    inbound_stmt = (
        select(func.count())
        .select_from(PurchaseOrder)
        .where(PurchaseOrder.status.in_(["open", "partial"]))
    )
    inbound = (await session.scalar(inbound_stmt)) or 0
    recent_receivings_stmt = (
        select(func.count())
        .select_from(Receiving)
        .where(Receiving.created_at >= last_24h)
    )
    recent_receivings = (await session.scalar(recent_receivings_stmt)) or 0

    worker_activity_stmt = (
        select(func.count(func.distinct(Receiving.received_by)))
        .select_from(Receiving)
        .where(Receiving.created_at >= worker_window)
    )
    active_workers = (await session.scalar(worker_activity_stmt)) or 0

    metrics = [
        DashboardMetric(
            label="Open Sales",
            value=open_sales,
            change=f"{open_sales_today} created in last 24h",
            status="awaiting fulfillment",
        ),
        DashboardMetric(
            label="Draft OCR Tickets",
            value=draft_ocr,
            change=f"{draft_ocr_new} new in last 24h",
            status="needs review",
        ),
        DashboardMetric(
            label="Inbound Purchase Orders",
            value=inbound,
            change=f"{recent_receivings} receipts logged in last 24h",
            status="receiving queue",
        ),
        DashboardMetric(
            label="Active Receivers",
            value=active_workers,
            change=f"{recent_receivings} dock events in last 24h",
            status="worker health",
        ),
    ]

    activities: list[tuple[datetime, DashboardActivity]] = []
    recent_sales = (
        await session.execute(
            select(Sale).order_by(Sale.created_at.desc()).limit(2)
        )
    ).scalars()
    for sale in recent_sales:
        activities.append(
            (
                sale.created_at,
                DashboardActivity(
                    title=f"Sale #{sale.sale_id} {sale.status}",
                    description=f"Total ${float(sale.total or 0):,.2f}",
                    time=_humanize_delta(now, sale.created_at),
                ),
            )
        )

    recent_receiving_rows = (
        await session.execute(
            select(Receiving).order_by(Receiving.created_at.desc()).limit(2)
        )
    ).scalars()
    for receiving in recent_receiving_rows:
        activities.append(
            (
                receiving.created_at,
                DashboardActivity(
                    title=f"PO #{receiving.po_id} received",
                    description=f"Checked in by {receiving.received_by or 'Unknown associate'}",
                    time=_humanize_delta(now, receiving.created_at),
                ),
            )
        )

    recent_pos = (
        await session.execute(
            select(PurchaseOrder).order_by(PurchaseOrder.created_at.desc()).limit(2)
        )
    ).scalars()
    for po in recent_pos:
        activities.append(
            (
                po.created_at,
                DashboardActivity(
                    title=f"PO #{po.po_id} {po.status}",
                    description=f"Vendor #{po.vendor_id}",
                    time=_humanize_delta(now, po.created_at),
                ),
            )
        )

    activities.sort(key=lambda item: item[0], reverse=True)
    activity_payload = [item[1] for item in activities[:5]]

    system_status = [
        DashboardSystemStatus(
            label="Worker Health",
            state="Operational" if active_workers else "Idle",
            badge="bg-emerald-500" if active_workers else "bg-amber-400",
            description=(
                f"{active_workers} associates checked in over last 4h"
                if active_workers
                else "No recent receiving scans."
            ),
        ),
        DashboardSystemStatus(
            label="OCR Pipeline",
            state="Reviewing" if draft_ocr else "Clear",
            badge="bg-sky-400" if draft_ocr else "bg-emerald-500",
            description=f"{draft_ocr} tickets awaiting review.",
        ),
        DashboardSystemStatus(
            label="Sales Pipeline",
            state="Active" if open_sales else "Quiet",
            badge="bg-indigo-400" if open_sales else "bg-slate-500",
            description=f"{open_sales} open sales ready for fulfillment.",
        ),
    ]

    return DashboardSummaryResponse(
        metrics=metrics,
        activity=activity_payload,
        system_status=system_status,
    )
