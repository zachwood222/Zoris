"""Shared Pydantic models."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    ok: bool = True


class ConfigResponse(BaseModel):
    ocr_provider: str
    dymo_enabled: bool
    short_code_length: int
    station_pin_rotate_minutes: int


class ItemSummary(BaseModel):
    item_id: int
    sku: str
    description: str
    price: float
    short_code: str


class InventoryAdjustRequest(BaseModel):
    item_id: int
    location_id: int
    qty_delta: float
    reason: str
    note: Optional[str] = None


class InventoryTransferRequest(BaseModel):
    item_id: int
    from_location_id: int
    to_location_id: int
    qty: float


class SaleCreateRequest(BaseModel):
    customer_id: Optional[int] = None
    created_by: str | None = None
    source: str | None = None


class SaleLineRequest(BaseModel):
    sku: str | None = None
    short_code: str | None = None
    barcode: str | None = None
    qty: float = 1
    location_id: int | None = None


class SaleFinalizeResponse(BaseModel):
    sale_id: int
    status: str
    total: float


class SaleDeliveryRequest(BaseModel):
    delivery_requested: bool
    address: dict | None = None


class OCRSaleTicketResponse(BaseModel):
    sale_id: int
    parsed_fields: dict
    confidence: float
    review_required: bool


class LabelRenderRequest(BaseModel):
    template_id: int
    context: dict


class LabelRenderResponse(BaseModel):
    template_id: int
    xml: str = Field(..., description="DYMO XML ready for client printing")


class StationPinResponse(BaseModel):
    pin: str
    expires_at: datetime
