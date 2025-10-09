"""Schemas related to purchase orders."""
from __future__ import annotations

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
