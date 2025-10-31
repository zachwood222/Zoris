"""Dashboard response models."""
from __future__ import annotations

from pydantic import BaseModel, Field


class DashboardMetric(BaseModel):
    label: str
    value: int
    change: str
    status: str


class DashboardActivity(BaseModel):
    title: str
    description: str
    time: str
    href: str | None = None


class DashboardSystemStatus(BaseModel):
    label: str
    state: str
    badge: str
    description: str


class DashboardDrilldownItem(BaseModel):
    id: str
    title: str
    subtitle: str
    meta: str
    badge_label: str = Field(alias="badgeLabel")
    badge_class: str = Field(alias="badgeClass")
    href: str | None = None

    model_config = {"populate_by_name": True}


class DashboardDrilldowns(BaseModel):
    open_sales: list[DashboardDrilldownItem] | None = Field(default=None, alias="openSales")
    draft_ocr_tickets: list[DashboardDrilldownItem] | None = Field(
        default=None, alias="draftOcrTickets"
    )
    inbound_purchase_orders: list[DashboardDrilldownItem] | None = Field(
        default=None, alias="inboundPurchaseOrders"
    )
    active_receivers: list[DashboardDrilldownItem] | None = Field(
        default=None, alias="activeReceivers"
    )

    model_config = {"populate_by_name": True}


class DashboardSummaryResponse(BaseModel):
    metrics: list[DashboardMetric]
    activity: list[DashboardActivity]
    system_status: list[DashboardSystemStatus]
    drilldowns: DashboardDrilldowns | None = None
