"""Shared Pydantic models."""
from __future__ import annotations

from datetime import datetime
from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    ok: bool = True
    fastapi: bool = True
    database: bool = True
    redis: bool | None = None
    detail: dict[str, Any] = Field(default_factory=dict)


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
    unit_cost: float


class CustomerSummary(BaseModel):
    customer_id: int
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None


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


class SaleUpdateRequest(BaseModel):
    customer_id: Optional[int] = None
    payment_method: Optional[str] = None
    fulfillment_type: Optional[str] = None
    delivery_fee: float = 0
    lines: list[SaleLineRequest] = Field(default_factory=list)


class SaleDeliveryRequest(BaseModel):
    delivery_requested: bool
    address: dict | None = None


class SaleDeliveryStatusUpdate(BaseModel):
    delivery_status: Literal[
        "queued",
        "scheduled",
        "out_for_delivery",
        "delivered",
        "failed",
    ]


class SaleDeliveryStatusResponse(BaseModel):
    sale_id: int
    delivery_status: str | None


class AttachmentSummary(BaseModel):
    attachment_id: int
    file_url: str
    kind: str
    created_at: datetime


class OCRSaleTicketResponse(BaseModel):
    sale_id: int
    parsed_fields: dict
    confidence: float
    review_required: bool


class SaleLineSummary(BaseModel):
    sale_line_id: int
    item_id: int
    sku: str
    description: str
    qty: float
    unit_price: float
    location_id: int
    short_code: str | None = None


class SaleCustomerSummary(BaseModel):
    customer_id: int
    name: str
    phone: Optional[str] = None
    email: Optional[str] = None


class SaleDetailResponse(BaseModel):
    sale_id: int
    status: str
    subtotal: float
    tax: float
    total: float
    ocr_confidence: float
    ocr_fields: dict
    attachments: list[AttachmentSummary]
    customer: SaleCustomerSummary | None = None
    payment_method: str | None = None
    fulfillment_type: str | None = None
    delivery_fee: float = 0
    lines: list[SaleLineSummary] = []


class LabelRenderRequest(BaseModel):
    template_id: int
    context: dict


class LabelRenderResponse(BaseModel):
    template_id: int
    xml: str = Field(..., description="DYMO XML ready for client printing")


class StationPinResponse(BaseModel):
    pin: str
    expires_at: datetime
