"""Invoice API schemas."""
from __future__ import annotations

from datetime import date
from typing import Optional

from pydantic import BaseModel


class InvoiceSummary(BaseModel):
    """Summarized invoice/bill details for listings."""

    invoice_id: int
    vendor_name: Optional[str] = None
    po_id: Optional[int] = None
    invoice_no: Optional[str] = None
    bill_date: Optional[date] = None
    due_date: Optional[date] = None
    subtotal: float
    tax: float
    freight: float
    total: float
    status: str
