from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class SaleDashboardEntry(BaseModel):
    sale_id: int
    ticket_number: str | None = None
    customer_name: str | None = None
    status: str
    total: float
    created_at: datetime | None = None
    sale_date: datetime | None = None
    created_by: str | None = None


class SalesDashboardResponse(BaseModel):
    open_sales: list[SaleDashboardEntry]
    fulfilled_sales: list[SaleDashboardEntry]
