from __future__ import annotations

import io

import pytest
from openpyxl import Workbook
from sqlalchemy import select

from .. import sample_data
from ..db import SessionLocal, engine
from ..models.base import Base
from ..models.domain import (
    Barcode,
    Customer,
    Inventory,
    Item,
    Location,
    PurchaseOrder,
    Receiving,
    Sale,
    Vendor,
)


@pytest.mark.asyncio
async def test_spreadsheet_import(client) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_import_generates_unique_short_codes(client) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    csv_content = """entity,name,terms,phone,email,sku,description,short_code,price,qty_on_hand,location_name\n"""
    csv_content += "vendors,Acme Supply,Net 30,555-1000,vendor@example.com,,,,,,\n"
    csv_content += "locations,Main Showroom,floor,,,,,,,\n"
    csv_content += "items,,,,,SKU-1000,Modern Sofa,,899.00,4,Main Showroom\n"
    csv_content += "items,,,,,SKU 1000B,Modern Sofa Variant,,999.00,2,Main Showroom\n"

    files = {"file": ("dupe_short_codes.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}

    response = await client.post("/imports/spreadsheet", files=files)
    assert response.status_code == 200

    payload = response.json()
    assert payload["counters"]["items"] == 2

    async with SessionLocal() as session:
        short_codes = set((await session.scalars(select(Item.short_code))).all())
        assert len(short_codes) == 2
        assert all(len(code) == 4 for code in short_codes)


@pytest.mark.asyncio
async def test_import_rejects_unsupported_file_types(client) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    files = {"file": ("data.txt", io.BytesIO(b"not-a-spreadsheet"), "text/plain")}

    response = await client.post("/imports/spreadsheet", files=files)
    assert response.status_code == 400
    assert "Unsupported file type" in response.json()["detail"]


@pytest.mark.asyncio
async def test_spreadsheet_import_xlsx_cleaning(client) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_import_replaces_existing_records(client) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await sample_data.apply()

    first_csv = """entity,name,terms,phone,email,sku,description,short_code,price,qty_on_hand,location_name\n"""
    first_csv += "vendors,Acme Supply,Net 30,555-1000,vendor@example.com,,,,,,\n"
    first_csv += "locations,Main Showroom,floor,,,,,,,\n"
    first_csv += "items,,,,,SKU-ONE,First Chair,F001,199.00,5,Main Showroom\n"

    files = {"file": ("first.csv", io.BytesIO(first_csv.encode("utf-8")), "text/csv")}
    response = await client.post("/imports/spreadsheet", files=files)
    assert response.status_code == 200

    payload = response.json()
    assert payload["clearedSampleData"] is True
    assert payload["counters"]["items"] == 1

    async with SessionLocal() as session:
        demo_item = await session.scalar(select(Item).where(Item.sku.like("DEMO%")))
        assert demo_item is None
        imported_item = await session.scalar(select(Item).where(Item.sku == "SKU-ONE"))
        assert imported_item is not None

    second_csv = """entity,name,terms,phone,email,sku,description,short_code,price,qty_on_hand,location_name\n"""
    second_csv += "vendors,Beta Goods,Net 45,555-2000,beta@example.com,,,,,,\n"
    second_csv += "locations,Warehouse West,warehouse,,,,,,,\n"
    second_csv += "items,,,,,SKU-TWO,Second Sofa,F002,349.00,2,Warehouse West\n"

    files = {"file": ("second.csv", io.BytesIO(second_csv.encode("utf-8")), "text/csv")}
    response = await client.post("/imports/spreadsheet", files=files)
    assert response.status_code == 200

    payload = response.json()
    assert payload["clearedSampleData"] is False
    assert payload["counters"]["items"] == 1

    async with SessionLocal() as session:
        legacy_item = await session.scalar(select(Item).where(Item.sku == "SKU-ONE"))
        assert legacy_item is None
        current_item = await session.scalar(select(Item).where(Item.sku == "SKU-TWO"))
        assert current_item is not None

        vendor_names = set((await session.scalars(select(Vendor.name))).all())
        assert vendor_names == {"Beta Goods"}

        location_names = set((await session.scalars(select(Location.name))).all())
        assert location_names == {"Warehouse West"}

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    workbook = Workbook()
    items_sheet = workbook.active
    items_sheet.title = "Items"
    items_sheet.append([
        "Item SKU",
        "Item Description",
        "Retail",
        "Qty On Hand",
        "Location Name",
        "Barcode",
    ])
    items_sheet.append([
        " SKU-555 ",
        " Comfy Chair ",
        399.99,
        2,
        " Main Showroom ",
        " 0012345678905 ",
    ])

    locations_sheet = workbook.create_sheet("Locations")
    locations_sheet.append(["Location Name", "Location Type"])
    locations_sheet.append([" Main Showroom ", " Warehouse "])

    customers_sheet = workbook.create_sheet("Customers")
    customers_sheet.append(["Customer Name", "Customer Email", "Customer Phone #"])
    customers_sheet.append(["  Alex Johnson  ", "alex@example.com", "555-2000"])
    customers_sheet.append(["Alex Johnson", "alex@example.com", "555-2000"])

    buffer = io.BytesIO()
    workbook.save(buffer)
    buffer.seek(0)

    files = {
        "file": (
            "data.xlsx",
            buffer,
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        )
    }

    response = await client.post("/imports/spreadsheet", files=files)
    assert response.status_code == 200

    payload = response.json()
    assert payload["counters"]["items"] == 1
    assert payload["counters"]["customers"] == 1
    assert payload["counters"]["locations"] == 1
    assert payload["counters"]["warnings"] == []

    async with SessionLocal() as session:
        item = await session.scalar(select(Item).where(Item.sku == "SKU-555"))
        assert item is not None
        assert item.short_code == "SKU5"

        barcode = await session.scalar(select(Barcode).where(Barcode.item_id == item.item_id))
        assert barcode is not None

        location = await session.scalar(select(Location).where(Location.name == "Main Showroom"))
        assert location is not None
        assert location.type == "warehouse"

        customer = await session.scalar(select(Customer).where(Customer.email == "alex@example.com"))
        assert customer is not None
        assert customer.name == "Alex Johnson"

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    csv_content = """entity,name,terms,phone,email,sku,description,short_code,price,qty_on_hand,location_name\n"""
    csv_content += "vendors,Acme Supply,Net 30,555-1000,vendor@example.com,,,,,,\n"
    csv_content += "locations,Main Showroom,floor,,,,,,,\n"
    csv_content += "items,,,,,SKU-123,Demo Sofa,D001,899.00,4,Main Showroom\n"
    csv_content += "customers,Jordan Alvarez,,555-0100,jordan@example.com,,,,,\n"

    files = {"file": ("data.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}

    response = await client.post("/imports/spreadsheet", files=files)
    assert response.status_code == 200

    payload = response.json()
    assert payload["counters"]["items"] == 1
    assert payload["counters"]["inventoryRecords"] == 1
    assert payload["counters"]["customers"] == 1

    async with SessionLocal() as session:
        item = await session.scalar(select(Item).where(Item.sku == "SKU-123"))
        assert item is not None
        inventory = await session.scalar(select(Inventory).where(Inventory.item_id == item.item_id))
        assert inventory is not None
        assert float(inventory.qty_on_hand) == pytest.approx(4.0)

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_import_rejects_when_no_supported_rows(client) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    await sample_data.apply()

    csv_content = """entity,name,terms,phone,email,sku,description,short_code,price,qty_on_hand,location_name\n"""
    csv_content += "vendorrs,Acme Supply,Net 30,555-1000,vendor@example.com,,,,,,\n"
    csv_content += "locatoins,Main Showroom,floor,,,,,,,\n"

    files = {"file": ("bad.csv", io.BytesIO(csv_content.encode("utf-8")), "text/csv")}

    response = await client.post("/imports/spreadsheet", files=files)
    assert response.status_code == 400

    payload = response.json()
    assert payload["detail"] == "no_importable_rows"

    async with SessionLocal() as session:
        demo_item = await session.scalar(select(Item).where(Item.sku == "DEMO-SOFA"))
        assert demo_item is not None
        demo_vendor = await session.scalar(select(Vendor).where(Vendor.name == "Demo Furnishings"))
        assert demo_vendor is not None


@pytest.mark.asyncio
async def test_imports_load_sales_purchase_orders_and_receivings(client) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

    header = (
        "entity,name,terms,phone,email,external_ref,customer_email,customer_name,status,total,created_at,"
        "source,created_by,vendor_name,expected_date,received_by,received_at,po_ref\n"
    )
    rows = [
        [
            "vendors",
            "Demo Supply",
            "Net 30",
            "555-2222",
            "vendor@example.com",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
        ],
        [
            "customers",
            "Jordan Alvarez",
            "",
            "555-0100",
            "jordan@example.com",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
            "",
        ],
        [
            "sales",
            "",
            "",
            "",
            "",
            "SO-1001",
            "jordan@example.com",
            "Jordan Alvarez",
            "open",
            "1299.00",
            "2024-05-01T10:30:00Z",
            "assisted",
            "Alex Rivera",
            "",
            "",
            "",
            "",
            "",
        ],
        [
            "sales",
            "",
            "",
            "",
            "",
            "TKT-2002",
            "jordan@example.com",
            "Jordan Alvarez",
            "draft",
            "899.00",
            "2024-05-02T11:15:00Z",
            "ocr_ticket",
            "CounterUser",
            "",
            "",
            "",
            "",
            "",
        ],
        [
            "purchase_orders",
            "",
            "Net 15",
            "",
            "",
            "PO-5001",
            "",
            "",
            "open",
            "",
            "2024-05-01T09:00:00Z",
            "",
            "Importer",
            "Demo Supply",
            "2024-05-05T09:00:00Z",
            "",
            "",
            "",
        ],
        [
            "receivings",
            "",
            "",
            "",
            "",
            "RCPT-77",
            "",
            "",
            "",
            "",
            "2024-05-06T12:45:00Z",
            "",
            "",
            "",
            "",
            "Dock Lead",
            "2024-05-06T12:45:00Z",
            "PO-5001",
        ],
    ]
    csv_lines = header + "\n".join(",".join(row) for row in rows)

    files = {"file": ("ops.csv", io.BytesIO(csv_lines.encode("utf-8")), "text/csv")}

    response = await client.post("/imports/spreadsheet", files=files)
    assert response.status_code == 200

    payload = response.json()
    counters = payload["counters"]
    assert counters["sales"] == 2
    assert counters["purchaseOrders"] == 1
    assert counters["receivings"] == 1

    async with SessionLocal() as session:
        open_sale = await session.scalar(select(Sale).where(Sale.external_ref == "SO-1001"))
        assert open_sale is not None
        assert open_sale.status == "open"
        assert open_sale.customer_id is not None

        draft_ticket = await session.scalar(select(Sale).where(Sale.external_ref == "TKT-2002"))
        assert draft_ticket is not None
        assert draft_ticket.status == "draft"
        assert draft_ticket.source == "ocr_ticket"
        assert draft_ticket.customer_id is not None

        po = await session.scalar(select(PurchaseOrder).where(PurchaseOrder.external_ref == "PO-5001"))
        assert po is not None
        assert po.status == "open"
        assert po.vendor_id is not None

        receipt = await session.scalar(select(Receiving).where(Receiving.external_ref == "RCPT-77"))
        assert receipt is not None
        assert receipt.received_by == "Dock Lead"
        assert receipt.po_id == po.po_id

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)

