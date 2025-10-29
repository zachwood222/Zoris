"""Vendor API schemas."""
from __future__ import annotations

from typing import Optional

from pydantic import BaseModel


class VendorSummary(BaseModel):
    """Lightweight vendor listing information."""

    vendor_id: int
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    terms: Optional[str] = None
    city: Optional[str] = None
    state: Optional[str] = None
    active: bool
