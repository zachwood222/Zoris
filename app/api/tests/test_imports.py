import io

import pytest
from openpyxl import Workbook
from sqlalchemy import func, select

from .. import sample_data
from ..db import SessionLocal, engine
from ..models.base import Base
from ..models.domain import Customer, Inventory, Item, Location, POLine, PurchaseOrder, Sale, SaleLine


def _build_workbook() -> Workbook:
    workbook = Workbook()
    products_sheet = workbook.active
    products_sheet.title = "Products"
    products_sheet.append(
        [
            "SKU",
            "Description",
            "Price",
            "Unit Cost",
            "Qty On Hand",
            "Location",
            "Vendor Name",
            "Barcode",
        ]
    )
    products_sheet.append(
        [
            "SOFA-001",
            "Modern Sofa",
            899.00,
            450.00,
            4,
            "Main Showroom",
            "Acme Furniture",
            "000111222333",
        ]
    )
    products_sheet.append(
        [
            "LAMP-002",
            "Brass Floor Lamp",
            129.00,
            60.00,
            6,
            "Lighting Aisle",
            "Acme Furniture",
            "000999888777",
        ]
    )

    customers_sheet = workbook.create_sheet("Customers")
    customers_sheet.append(["Name", "Email", "Phone"])
    customers_sheet.append(["Jamie Smith", "jamie@example.com", "555-0100"])
    customers_sheet.append(["Chris Doe", "", "555-0101"])

    return workbook


@pytest.mark.asyncio
async def test_import_products_and_customers(client) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    workbook = _build_workbook()
    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)

    files = {"file": ("import.xlsx", buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    response = await client.post("/imports/spreadsheet", files=files)
    assert response.status_code == 200

    payload = response.json()
    assert payload["counters"]["items"] == 2
    assert payload["counters"]["customers"] == 2
    assert payload["counters"]["vendors"] == 1
    assert payload["counters"]["locations"] == 2
    assert payload["counters"]["inventoryRecords"] == 2

    async with SessionLocal() as session:
        item_count = await session.scalar(select(func.count(Item.item_id)))
        customer_count = await session.scalar(select(func.count(Customer.customer_id)))
        location_names = set((await session.scalars(select(Location.name))).all())
        inventory_rows = (await session.scalars(select(Inventory))).all()

    assert item_count == 2
    assert customer_count == 2
    assert location_names == {"Main Showroom", "Lighting Aisle"}
    assert {row.qty_on_hand for row in inventory_rows} == {4, 6}


@pytest.mark.asyncio
async def test_import_ignores_leading_blank_rows(client) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    workbook = Workbook()
    products_sheet = workbook.active
    products_sheet.title = "Products"
    products_sheet.append(["", "", ""])
    products_sheet.append([None, None, None])
    products_sheet.append(["Products", "for", "Import"])  # header-like note row
    products_sheet.append(["SKU", "Description", "Price"])
    products_sheet.append(["TABLE-01", "Dining Table", 499.0])

    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)

    files = {"file": ("blanks.xlsx", buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    response = await client.post("/imports/spreadsheet", files=files)
    assert response.status_code == 200

    payload = response.json()
    assert payload["counters"]["items"] == 1


@pytest.mark.asyncio
async def test_import_orders_and_purchase_orders(client) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    workbook = _build_workbook()
    orders_sheet = workbook.create_sheet("Orders")
    orders_sheet.append(
        [
            "Order Number",
            "Customer Email",
            "Customer Name",
            "Item SKU",
            "Qty",
            "Unit Price",
            "Status",
        ]
    )
    orders_sheet.append(
        [
            "ORDER-10",
            "jamie@example.com",
            "Jamie Smith",
            "SOFA-001",
            1,
            899.00,
            "Open",
        ]
    )

    po_sheet = workbook.create_sheet("Purchase Orders")
    po_sheet.append([
        "PO Number",
        "Vendor Name",
        "Item SKU",
        "Qty Ordered",
        "Unit Cost",
    ])
    po_sheet.append([
        "PO-50",
        "Acme Furniture",
        "SOFA-001",
        2,
        450.00,
    ])

    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)

    files = {"file": ("orders.xlsx", buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    response = await client.post("/imports/spreadsheet", files=files)
    assert response.status_code == 200

    payload = response.json()
    assert payload["counters"]["sales"] == 1
    assert payload["counters"]["purchaseOrders"] == 1

    async with SessionLocal() as session:
        sale = await session.scalar(select(Sale).where(Sale.external_ref == "ORDER-10"))
        po = await session.scalar(select(PurchaseOrder).where(PurchaseOrder.external_ref == "PO-50"))
        sale_lines = []
        po_lines = []
        if sale is not None:
            sale_lines = (
                await session.scalars(select(SaleLine).where(SaleLine.sale_id == sale.sale_id))
            ).all()
        if po is not None:
            po_lines = (
                await session.scalars(select(POLine).where(POLine.po_id == po.po_id))
            ).all()

    assert sale is not None
    assert len(sale_lines) == 1
    assert sale_lines[0].qty == 1
    assert po is not None
    assert len(po_lines) == 1
    assert po_lines[0].qty_ordered == 2


@pytest.mark.asyncio
async def test_import_clears_sample_data(client) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await sample_data.apply()

    workbook = Workbook()
    products_sheet = workbook.active
    products_sheet.title = "Products"
    products_sheet.append(["SKU", "Description", "Price"])
    products_sheet.append(["NEW-ITEM", "Imported Item", 199.0])

    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)

    files = {"file": ("fresh.xlsx", buffer, "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")}
    response = await client.post("/imports/spreadsheet", files=files)
    assert response.status_code == 200

    payload = response.json()
    assert payload["clearedSampleData"] is True

    async with SessionLocal() as session:
        demo_item = await session.scalar(select(Item).where(Item.sku.like("DEMO%")))
        imported = await session.scalar(select(Item).where(Item.sku == "NEW-ITEM"))

    assert demo_item is None
    assert imported is not None


@pytest.mark.asyncio
async def test_import_rejects_unsupported_file_types(client) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    files = {"file": ("data.txt", io.BytesIO(b"not-a-spreadsheet"), "text/plain")}

    response = await client.post("/imports/spreadsheet", files=files)
    assert response.status_code == 400
    assert response.json()["detail"].startswith("Unsupported file type")


@pytest.mark.asyncio
async def test_import_returns_warning_when_no_importable_rows(client) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    workbook = Workbook()
    notes = workbook.active
    notes.title = "Notes"
    notes.append(["No data here"])

    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)

    files = {
        "file": (
            "notes.xlsx",
            buffer,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    }

    response = await client.post("/imports/spreadsheet", files=files)
    assert response.status_code == 200

    payload = response.json()
    assert payload["message"] == "Processed spreadsheet with warnings"
    assert payload["detail"] == "No importable rows were found in the spreadsheet."
    assert payload["counters"]["warnings"] == [
        "No importable rows were found in the spreadsheet."
    ]
