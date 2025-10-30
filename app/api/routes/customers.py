from fastapi import APIRouter, Depends, Query
from sqlalchemy import func, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..models.domain import Customer
from ..schemas.common import CustomerSummary

router = APIRouter()


@router.get("/search", response_model=list[CustomerSummary])
async def search_customers(
    q: str | None = Query(default=None, description="Query string to match against name, email, or phone."),
    limit: int = Query(default=25, ge=1, le=100),
    session: AsyncSession = Depends(get_session),
) -> list[CustomerSummary]:
    limit_value = limit if isinstance(limit, int) else 25
    limit_value = max(1, min(100, limit_value))
    stmt = select(Customer).order_by(Customer.name).limit(limit_value)

    search_term = (q if isinstance(q, str) else "").strip().lower()
    if search_term:
        pattern = f"%{search_term}%"
        stmt = stmt.where(
            or_(
                func.lower(Customer.name).like(pattern),
                func.lower(Customer.email).like(pattern),
                func.lower(Customer.phone).like(pattern),
            )
        )

    customers = (await session.execute(stmt)).scalars().all()
    return [
        CustomerSummary(
            customer_id=customer.customer_id,
            name=customer.name,
            phone=customer.phone,
            email=customer.email,
        )
        for customer in customers
    ]
