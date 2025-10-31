"""Dashboard summary endpoints."""

from __future__ import annotations

import re
from datetime import datetime, timedelta, timezone

from fastapi import APIRouter, Depends
from psycopg.errors import UndefinedTable
from sqlalchemy import func, select
from sqlalchemy.exc import ProgrammingError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session, selectinload

from ..db import get_session
from ..models.domain import PurchaseOrder, Receiving, Sale
from ..schemas.dashboard import (
    DashboardActivity,
    DashboardDrilldownItem,
    DashboardDrilldowns,
    DashboardMetric,
    DashboardSummaryResponse,
    DashboardSystemStatus,
)
from ..utils.datetime import utc_now

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


def _is_missing_table_error(exc: ProgrammingError) -> bool:
    """Return True when the underlying DBAPI error indicates a missing table."""

    orig = getattr(exc, "orig", None)
    if isinstance(orig, UndefinedTable):
        return True
    message = str(orig or exc).lower()
    return "does not exist" in message or "undefined table" in message


async def _safe_scalar(
    session: AsyncSession, statement, default: int | float = 0
) -> int | float:
    """Execute a scalar statement and swallow missing-table errors."""

    try:
        result = await session.scalar(statement)
    except ProgrammingError as exc:
        if _is_missing_table_error(exc):
            await session.rollback()
            return default
        raise
    return result or default


async def _safe_scalars(session: AsyncSession, statement) -> list:
    """Execute a statement returning ORM rows and swallow missing-table errors."""

    try:
        result = await session.execute(statement)
    except ProgrammingError as exc:
        if _is_missing_table_error(exc):
            await session.rollback()
            return []
        raise
    return result.scalars().all()


async def _safe_all(session: AsyncSession, statement) -> list:
    """Execute a statement returning raw rows and swallow missing-table errors."""

    try:
        result = await session.execute(statement)
    except ProgrammingError as exc:
        if _is_missing_table_error(exc):
            await session.rollback()
            return []
        raise
    return result.all()


def _humanize_delta(now: datetime, past: datetime) -> str:
    if past.tzinfo is None:
        past = past.replace(tzinfo=timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
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


BADGE_STYLES = {
    "sky": "border border-sky-400/30 bg-sky-400/10 text-sky-200",
    "emerald": "border border-emerald-400/30 bg-emerald-400/10 text-emerald-200",
    "amber": "border border-amber-400/30 bg-amber-400/10 text-amber-200",
    "rose": "border border-rose-400/30 bg-rose-400/10 text-rose-200",
    "slate": "border border-white/20 bg-white/5 text-slate-200",
}


def _badge_style(color: str) -> str:
    return BADGE_STYLES.get(color, BADGE_STYLES["slate"])


def _sale_badge(status: str) -> tuple[str, str]:
    mapping = {
        "open": ("Awaiting fulfillment", "sky"),
        "fulfilled": ("Fulfilled", "emerald"),
        "draft": ("Draft", "amber"),
        "void": ("Voided", "rose"),
    }
    return mapping.get(status, (status.title(), "slate"))


def _po_badge(status: str) -> tuple[str, str]:
    mapping = {
        "draft": ("Draft", "amber"),
        "open": ("Open", "sky"),
        "partial": ("Partial", "amber"),
        "received": ("Received", "emerald"),
        "closed": ("Closed", "slate"),
    }
    return mapping.get(status, (status.title(), "slate"))


def _slugify(prefix: str, value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", value.lower()).strip("-")
    if not slug:
        slug = prefix
    return f"{prefix}-{slug}"


def _format_eta(now: datetime, target: datetime | None) -> str:
    if target is None:
        return "No ETA provided"
    if target.tzinfo is None:
        target = target.replace(tzinfo=timezone.utc)
    if now.tzinfo is None:
        now = now.replace(tzinfo=timezone.utc)
    if target >= now:
        delta_days = (target - now).days
        if delta_days <= 0:
            return "Due today"
        if delta_days == 1:
            return "Due in 1 day"
        return f"Due in {delta_days} days"
    return f"Arrived {_humanize_delta(now, target)}"

async def _table_exists(session: AsyncSession, table_name: str) -> bool:
    """Return True if the requested table exists in the bound database."""

    def _has_table(sync_session: Session) -> bool:
        inspector = inspect(sync_session.get_bind())
        return inspector.has_table(table_name)

    return await session.run_sync(_has_table)


@router.get("/summary", response_model=DashboardSummaryResponse)
async def get_dashboard_summary(
    session: AsyncSession = Depends(get_session),
) -> DashboardSummaryResponse:
    now = utc_now()
    last_24h = now - timedelta(hours=24)
    worker_window = now - timedelta(hours=4)

    open_sales_stmt = select(func.count()).select_from(Sale).where(Sale.status == "open")
    open_sales = await _safe_scalar(session, open_sales_stmt, default=0)
    open_sales_today_stmt = (
        select(func.count())
        .select_from(Sale)
        .where(Sale.status == "open", Sale.created_at >= last_24h)
    )
    open_sales_today = await _safe_scalar(session, open_sales_today_stmt, default=0)

    draft_ocr_stmt = (
        select(func.count())
        .select_from(Sale)
        .where(Sale.status == "draft", Sale.source == "ocr_ticket")
    )
    draft_ocr = await _safe_scalar(session, draft_ocr_stmt, default=0)
    draft_ocr_new_stmt = (
        select(func.count())
        .select_from(Sale)
        .where(
            Sale.status == "draft",
            Sale.source == "ocr_ticket",
            Sale.created_at >= last_24h,
        )
    )
    draft_ocr_new = await _safe_scalar(session, draft_ocr_new_stmt, default=0)

    inbound_stmt = (
        select(func.count())
        .select_from(PurchaseOrder)
        .where(PurchaseOrder.status.in_(["open", "partial"]))
    )
    inbound = await _safe_scalar(session, inbound_stmt, default=0)
    recent_receivings_stmt = (
        select(func.count())
        .select_from(Receiving)
        .where(Receiving.created_at >= last_24h)
    )
    recent_receivings = await _safe_scalar(session, recent_receivings_stmt, default=0)

    worker_activity_stmt = (
        select(func.count(func.distinct(Receiving.received_by)))
        .select_from(Receiving)
        .where(Receiving.created_at >= worker_window)
    )
    active_workers = await _safe_scalar(session, worker_activity_stmt, default=0)

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
    recent_sales = await _safe_scalars(
        session, select(Sale).order_by(Sale.created_at.desc()).limit(2)
    )
    for sale in recent_sales:
        activities.append(
            (
                sale.created_at,
                DashboardActivity(
                    title=f"Sale #{sale.sale_id} {sale.status}",
                    description=f"Total ${float(sale.total or 0):,.2f}",
                    time=_humanize_delta(now, sale.created_at),
                    href=f"/dashboard/sales/{sale.sale_id}",
                ),
            )
        )

    recent_receiving_rows = await _safe_scalars(
        session, select(Receiving).order_by(Receiving.created_at.desc()).limit(2)
    )
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

    recent_pos = await _safe_scalars(
        session, select(PurchaseOrder).order_by(PurchaseOrder.created_at.desc()).limit(2)
    )
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

    open_sales_rows = await _safe_scalars(
        session,
        select(Sale)
        .options(selectinload(Sale.customer))
        .where(Sale.status == "open")
        .order_by(Sale.sale_date.desc())
        .limit(10),
    )
    open_sales_items: list[DashboardDrilldownItem] = []
    for sale in open_sales_rows:
        display_ref = sale.external_ref or f"#{sale.sale_id}"
        customer_name = sale.customer.name if sale.customer else "Walk-in customer"
        total_value = f"${float(sale.total or 0):,.2f}"
        subtitle = f"{customer_name} • {total_value}"
        created_reference = sale.created_at or sale.sale_date
        created_label = (
            _humanize_delta(now, created_reference) if created_reference else "Unknown time"
        )
        created_by = sale.created_by or "Unassigned"
        meta = f"Created {created_label} by {created_by}"
        badge_label, badge_color = _sale_badge(sale.status or "open")
        open_sales_items.append(
            DashboardDrilldownItem(
                id=_slugify("sale", display_ref),
                title=f"Sale {display_ref}",
                subtitle=subtitle,
                meta=meta,
                badge_label=badge_label,
                badge_class=_badge_style(badge_color),
                href=f"/dashboard/sales/{sale.sale_id}",
            )
        )

    draft_ticket_rows = await _safe_scalars(
        session,
        select(Sale)
        .options(selectinload(Sale.customer))
        .where(Sale.status == "draft", Sale.source == "ocr_ticket")
        .order_by(Sale.created_at.desc())
        .limit(10),
    )
    draft_ticket_items: list[DashboardDrilldownItem] = []
    for ticket in draft_ticket_rows:
        reference = (
            ticket.external_ref
            or (ticket.ocr_payload or {}).get("ticket_id")
            or f"#{ticket.sale_id}"
        )
        customer_name = ticket.customer.name if ticket.customer else "Walk-in customer"
        total_value = f"${float(ticket.total or 0):,.2f}"
        subtitle = f"{customer_name} • {total_value}"
        created_reference = ticket.created_at or ticket.sale_date
        captured_label = (
            _humanize_delta(now, created_reference) if created_reference else "Unknown time"
        )
        meta_parts = [f"Captured {captured_label}"]
        if ticket.ocr_confidence is not None:
            meta_parts.append(f"Confidence {float(ticket.ocr_confidence):.0%}")
        meta = " • ".join(meta_parts)
        draft_ticket_items.append(
            DashboardDrilldownItem(
                id=_slugify("ticket", reference),
                title=f"Ticket {reference}",
                subtitle=subtitle,
                meta=meta,
                badge_label="Needs review",
                badge_class=_badge_style("amber"),
            )
        )

    inbound_po_rows = await _safe_scalars(
        session,
        select(PurchaseOrder)
        .options(
            selectinload(PurchaseOrder.vendor),
            selectinload(PurchaseOrder.receivings),
        )
        .where(PurchaseOrder.status.in_(["open", "partial"]))
        .order_by(PurchaseOrder.created_at.desc())
        .limit(10),
    )
    inbound_po_items: list[DashboardDrilldownItem] = []
    for po in inbound_po_rows:
        reference = po.external_ref or f"#{po.po_id}"
        vendor_name = po.vendor.name if po.vendor else "Unknown vendor"
        receipts_count = len(po.receivings)
        subtitle = f"{vendor_name} • {receipts_count} receipt(s)"
        meta = f"{_format_eta(now, po.expected_date)} • Created by {po.created_by or 'Unknown'}"
        badge_label, badge_color = _po_badge(po.status or "open")
        inbound_po_items.append(
            DashboardDrilldownItem(
                id=_slugify("po", reference),
                title=f"PO {reference}",
                subtitle=subtitle,
                meta=meta,
                badge_label=badge_label,
                badge_class=_badge_style(badge_color),
            )
        )

    receiver_activity = await _safe_all(
        session,
        select(
            Receiving.received_by,
            func.count(Receiving.receipt_id),
            func.max(Receiving.received_at),
        )
        .where(Receiving.received_at >= worker_window)
        .group_by(Receiving.received_by)
        .order_by(func.max(Receiving.received_at).desc()),
    )
    active_receivers_items: list[DashboardDrilldownItem] = []
    for received_by, count, last_received_at in receiver_activity:
        name = received_by or "Unassigned"
        subtitle = f"{int(count)} receipt(s) this shift"
        meta = (
            f"Last scan {_humanize_delta(now, last_received_at)}"
            if last_received_at
            else "No recent scans"
        )
        active_receivers_items.append(
            DashboardDrilldownItem(
                id=_slugify("receiver", name),
                title=name,
                subtitle=subtitle,
                meta=meta,
                badge_label="Active",
                badge_class=_badge_style("emerald"),
            )
        )

    drilldowns = DashboardDrilldowns(
        open_sales=open_sales_items,
        draft_ocr_tickets=draft_ticket_items,
        inbound_purchase_orders=inbound_po_items,
        active_receivers=active_receivers_items,
    )

    return DashboardSummaryResponse(
        metrics=metrics,
        activity=activity_payload,
        system_status=system_status,
        drilldowns=drilldowns,
    )
