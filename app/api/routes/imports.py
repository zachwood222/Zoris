"""Endpoints for spreadsheet imports."""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..schemas.imports import SpreadsheetImportResponse
from ..services.importer import import_spreadsheet

router = APIRouter(prefix="/imports", tags=["imports"])


@router.post("/spreadsheet", response_model=SpreadsheetImportResponse)
async def upload_spreadsheet(
    file: UploadFile = File(...), session: AsyncSession = Depends(get_session)
) -> SpreadsheetImportResponse:
    data = await file.read()
    result = await import_spreadsheet(session, data, file.filename)
    counters = result.counters
    warnings = counters.warnings

    message_parts: list[str] = []
    if counters.items:
        message_parts.append(f"Imported {counters.items} items")
    if counters.inventory_records:
        message_parts.append(f"updated {counters.inventory_records} inventory records")
    if counters.customers:
        message_parts.append(f"loaded {counters.customers} customers")
    if not message_parts:
        message_parts.append("Processed spreadsheet")

    detail: str | None = None
    if warnings:
        detail = "\n".join(warnings)

    return SpreadsheetImportResponse(
        message=", ".join(message_parts),
        importedAt=result.imported_at,
        clearedSampleData=result.cleared_sample_data,
        counters={
            "vendors": counters.vendors,
            "locations": counters.locations,
            "items": counters.items,
            "barcodes": counters.barcodes,
            "inventoryRecords": counters.inventory_records,
            "customers": counters.customers,
            "sales": counters.sales,
            "purchaseOrders": counters.purchase_orders,
            "receivings": counters.receivings,
            "warnings": warnings,
        },
        detail=detail,
    )

