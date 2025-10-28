"""Schemas for spreadsheet import endpoints."""
from __future__ import annotations

from datetime import datetime
from typing import Optional

from pydantic import BaseModel, Field


class ImportCountersSchema(BaseModel):
    vendors: int = 0
    locations: int = 0
    items: int = 0
    barcodes: int = 0
    inventory_records: int = Field(0, alias="inventoryRecords")
    customers: int = 0
    sales: int = 0
    purchase_orders: int = Field(0, alias="purchaseOrders")
    receivings: int = 0
    warnings: list[str] = Field(default_factory=list)

    model_config = {
        "populate_by_name": True,
        "json_schema_extra": {
            "example": {
                "vendors": 1,
                "locations": 1,
                "items": 25,
                "barcodes": 25,
                "inventoryRecords": 25,
                "customers": 10,
                "sales": 12,
                "purchaseOrders": 7,
                "receivings": 4,
                "warnings": ["Skipped item because of missing SKU"],
            }
        },
    }


class SpreadsheetImportResponse(BaseModel):
    message: str
    imported_at: datetime = Field(..., alias="importedAt")
    cleared_sample_data: bool = Field(False, alias="clearedSampleData")
    cleared_inventory: bool = Field(False, alias="clearedInventory")
    counters: ImportCountersSchema
    detail: Optional[str] = None

    model_config = {"populate_by_name": True, "json_schema_extra": {}}

