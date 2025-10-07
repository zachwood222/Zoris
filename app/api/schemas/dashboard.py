"""Dashboard response models."""
from __future__ import annotations

from pydantic import BaseModel


class DashboardMetric(BaseModel):
    label: str
    value: int
    change: str
    status: str


class DashboardActivity(BaseModel):
    title: str
    description: str
    time: str


class DashboardSystemStatus(BaseModel):
    label: str
    state: str
    badge: str
    description: str


class DashboardSummaryResponse(BaseModel):
    metrics: list[DashboardMetric]
    activity: list[DashboardActivity]
    system_status: list[DashboardSystemStatus]
