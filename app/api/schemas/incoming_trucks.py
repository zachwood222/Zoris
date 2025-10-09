"""Schemas for incoming truck tracking."""
from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


IncomingTruckStatus = Literal["scheduled", "arrived", "unloading", "completed", "cancelled"]
IncomingTruckUpdateType = Literal["status", "note", "line_progress"]


class IncomingTruckLineCreate(BaseModel):
    po_line_id: int
    item_id: int
    qty_expected: float | None = None
    description: str | None = None


class IncomingTruckLineRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    truck_line_id: int
    po_line_id: int
    item_id: int
    description: str | None = None
    qty_expected: float | None = None


class IncomingTruckCreate(BaseModel):
    po_id: int
    reference: str
    carrier: str | None = None
    status: IncomingTruckStatus = "scheduled"
    scheduled_arrival: datetime | None = None
    lines: list[IncomingTruckLineCreate] = Field(default_factory=list)


class IncomingTruckUpdateCreate(BaseModel):
    update_type: IncomingTruckUpdateType
    message: str | None = None
    status: IncomingTruckStatus | None = None
    po_line_id: int | None = None
    item_id: int | None = None
    quantity: float | None = None


class IncomingTruckUpdateRead(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    update_id: int
    truck_id: int
    update_type: IncomingTruckUpdateType
    message: str | None = None
    status: IncomingTruckStatus | None = None
    po_line_id: int | None = None
    item_id: int | None = None
    quantity: float | None = None
    created_by: str | None = None
    created_at: datetime


class IncomingTruckLineProgress(BaseModel):
    po_line_id: int
    item_id: int | None = None
    total_quantity: float


class IncomingTruckAggregatedUpdates(BaseModel):
    latest_status: IncomingTruckStatus | None = None
    note_count: int = 0
    line_progress: list[IncomingTruckLineProgress] = Field(default_factory=list)
    history: list[IncomingTruckUpdateRead] = Field(default_factory=list)


class IncomingTruckResponse(BaseModel):
    truck_id: int
    po_id: int
    reference: str
    carrier: str | None = None
    status: IncomingTruckStatus
    scheduled_arrival: datetime | None = None
    arrived_at: datetime | None = None
    created_at: datetime
    lines: list[IncomingTruckLineRead] = Field(default_factory=list)
    updates: IncomingTruckAggregatedUpdates = Field(default_factory=IncomingTruckAggregatedUpdates)
