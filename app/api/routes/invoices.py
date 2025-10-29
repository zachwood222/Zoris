"""Invoice endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models.domain import Bill, Vendor
from ..schemas.invoices import InvoiceSummary

router = APIRouter()


@router.get("", response_model=list[InvoiceSummary])
async def list_invoices(
    q: str | None = None,
    session: AsyncSession = Depends(get_session),
) -> list[InvoiceSummary]:
    stmt = (
        select(
            Bill.bill_id,
            Bill.invoice_no,
            Bill.bill_date,
            Bill.due_date,
            Bill.subtotal,
            Bill.tax,
            Bill.freight,
            Bill.total,
            Bill.status,
            Bill.po_id,
            Vendor.name.label("vendor_name"),
        )
        .join(Vendor, Vendor.vendor_id == Bill.vendor_id, isouter=True)
        .order_by(Bill.bill_date.desc(), Bill.bill_id.desc())
        .limit(200)
    )

    search = (q or "").strip()
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                Vendor.name.ilike(pattern),
                Bill.invoice_no.ilike(pattern),
                Bill.status.ilike(pattern),
            )
        )

    rows = (await session.execute(stmt)).all()
    invoices: list[InvoiceSummary] = []
    for row in rows:
        invoices.append(
            InvoiceSummary(
                invoice_id=row.bill_id,
                vendor_name=row.vendor_name,
                po_id=row.po_id,
                invoice_no=row.invoice_no,
                bill_date=row.bill_date,
                due_date=row.due_date,
                subtotal=float(row.subtotal or 0),
                tax=float(row.tax or 0),
                freight=float(row.freight or 0),
                total=float(row.total or 0),
                status=row.status,
            )
        )

    return invoices
