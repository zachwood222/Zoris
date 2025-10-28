"""Schemas related to purchase orders."""
from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class POLineSearchResult(BaseModel):
    po_id: int
    po_number: str
    po_line_id: int
    item_id: int
    item_description: str
    vendor: str | None = None
    qty_ordered: float
    qty_remaining: float


class PurchaseOrderSummary(BaseModel):
    po_id: int
    status: str
    vendor_name: str | None = None
    expected_date: datetime | None = None
    total_lines: int
    open_lines: int
    received_lines: int
    qty_ordered: float
    qty_received: float
    notes: str | None = None
