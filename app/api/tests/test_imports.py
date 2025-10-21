from __future__ import annotations

import io

import pytest
from openpyxl import Workbook
from sqlalchemy import select

from ..db import SessionLocal, engine
from ..models.base import Base
from ..models.domain import Barcode, Customer, Inventory, Item, Location


@pytest.mark.asyncio
async def test_spreadsheet_import(client) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)


@pytest.mark.asyncio
async def test_spreadsheet_import_xlsx_cleaning(client) -> None:
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

