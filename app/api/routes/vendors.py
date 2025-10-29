"""Vendor endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models.domain import Vendor
from ..schemas.vendors import VendorSummary

router = APIRouter()


@router.get("", response_model=list[VendorSummary])
async def list_vendors(
    q: str | None = None,
    session: AsyncSession = Depends(get_session),
) -> list[VendorSummary]:
    stmt = select(Vendor).order_by(Vendor.name.asc())
    search = (q or "").strip()
    if search:
        pattern = f"%{search}%"
        stmt = stmt.where(
            or_(
                Vendor.name.ilike(pattern),
                Vendor.email.ilike(pattern),
                Vendor.phone.ilike(pattern),
            )
        )

    vendors = (await session.execute(stmt)).scalars().all()
    results: list[VendorSummary] = []
    for vendor in vendors:
        address = vendor.address_json or {}
        results.append(
            VendorSummary(
                vendor_id=vendor.vendor_id,
                name=vendor.name,
                email=vendor.email,
                phone=vendor.phone,
                terms=vendor.terms,
                city=address.get("city"),
                state=address.get("state"),
                active=bool(vendor.active),
            )
        )

    return results
