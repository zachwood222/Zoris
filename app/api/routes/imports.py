"""Endpoints for spreadsheet imports."""
from __future__ import annotations

from fastapi import APIRouter, Depends, File, Query, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..schemas.imports import SpreadsheetImportResponse
from ..services.importer import NO_IMPORTABLE_ROWS_WARNING, import_spreadsheet

router = APIRouter(prefix="/imports", tags=["imports"])


@router.post("/spreadsheet", response_model=SpreadsheetImportResponse)
async def upload_spreadsheet(
    file: UploadFile = File(...),
    dataset: str | None = Query(default=None, description="Dataset to import"),
    replace_inventory: bool = Query(
        default=False,
        alias="replaceInventory",
        description="Clear existing inventory quantities before importing products",
    ),
    session: AsyncSession = Depends(get_session),
) -> SpreadsheetImportResponse:
    data = await file.read()
    result = await import_spreadsheet(
        session,
        data,
        file.filename,
        dataset=dataset,
        replace_inventory=replace_inventory,
    )
    counters = result.counters
    warnings = counters.warnings

    message_parts: list[str] = []
    if counters.vendors:
        message_parts.append(f"Imported {counters.vendors} vendor(s)")
    if counters.items:
        message_parts.append(f"Imported {counters.items} item(s)")
    if counters.inventory_records:
        message_parts.append(f"Updated {counters.inventory_records} inventory record(s)")
    if counters.customers:
        message_parts.append(f"Loaded {counters.customers} customer(s)")
    if counters.sales:
        message_parts.append(f"Processed {counters.sales} sale(s)")
    if counters.purchase_orders:
        message_parts.append(
            f"Processed {counters.purchase_orders} purchase order(s)"
        )
    if result.cleared_inventory and not result.cleared_sample_data:
        message_parts.append("Cleared previous inventory records")
    if not message_parts:
        if warnings:
            if warnings == [NO_IMPORTABLE_ROWS_WARNING]:
                message_parts.append(NO_IMPORTABLE_ROWS_WARNING)
            else:
                message_parts.append("Processed spreadsheet with warnings")
        else:
            message_parts.append("Processed spreadsheet")

    detail: str | None = None
    if warnings:
        detail = "\n".join(warnings)

    return SpreadsheetImportResponse(
        message=", ".join(message_parts),
        importedAt=result.imported_at,
        clearedSampleData=result.cleared_sample_data,
        clearedInventory=result.cleared_inventory,
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

