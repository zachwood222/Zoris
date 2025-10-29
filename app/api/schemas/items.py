"""Schemas for item detail responses."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel

from .common import ItemSummary


class ItemLocationInfo(BaseModel):
    """Inventory information for an item at a specific location."""

    location_id: int
    location_name: str
    qty_on_hand: float
    qty_reserved: float


class IncomingPurchaseInfo(BaseModel):
    """Purchase order information for incoming inventory."""

    po_id: int
    status: str
    expected_date: Optional[datetime]
    vendor_name: Optional[str]
    qty_ordered: float
    qty_received: float
    qty_remaining: float


class ItemDetailResponse(BaseModel):
    """Detailed information about an item including inventory insights."""

    item: ItemSummary
    total_on_hand: float
    locations: list[ItemLocationInfo]
    incoming: list[IncomingPurchaseInfo]


class CatalogLocationInfo(BaseModel):
    """Location snapshot for catalog listings."""

    location_id: int
    location_name: str
    qty_on_hand: float


class CatalogItemSummary(BaseModel):
    """Simplified item summary for catalog lookups."""

    item_id: int
    sku: str
    description: str
    total_on_hand: float
    top_location: CatalogLocationInfo | None = None
