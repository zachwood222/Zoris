"""Spreadsheet importer for operational data."""
from __future__ import annotations

import csv
import io
import json
import re
from collections import defaultdict
from dataclasses import dataclass, field
from datetime import datetime
from decimal import Decimal, InvalidOperation
from typing import Any, Iterable, Mapping

from fastapi import HTTPException, status

try:  # pragma: no cover - optional dependency
    from openpyxl import load_workbook
except Exception:  # pragma: no cover - optional dependency
    load_workbook = None
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import engine
from ..models import domain
from ..models.base import Base
from ..utils.datetime import utc_now


SUPPORTED_ENTITIES = {"vendors", "locations", "items", "inventory", "customers"}

NO_IMPORTABLE_ROWS_DETAIL = "no_importable_rows"

FIELD_ALIASES: dict[str, dict[str, set[str]]] = {
    "vendors": {
        "name": {"name", "vendor", "vendor_name"},
        "terms": {"terms", "payment_terms"},
        "phone": {"phone", "vendor_phone"},
        "email": {"email", "vendor_email"},
        "address_json": {"address", "address_json"},
    },
    "locations": {
        "name": {"name", "location", "location_name"},
        "type": {"type", "location_type"},
    },
    "items": {
        "sku": {"sku", "item_sku"},
        "description": {"description", "item_description", "name"},
        "category": {"category"},
        "subcategory": {"subcategory", "sub_category"},
        "unit_cost": {"unit_cost", "cost", "unitcost"},
        "price": {"price", "retail", "unit_price"},
        "tax_code": {"tax_code"},
        "short_code": {"short_code", "shortcode", "short", "plu"},
        "barcode": {"barcode", "upc", "item_barcode"},
        "qty_on_hand": {"qty_on_hand", "on_hand", "quantity", "qty"},
        "location_name": {"inventory_location", "location", "location_name"},
    },
    "inventory": {
        "sku": {"sku", "item_sku"},
        "location_name": {"location", "location_name"},
        "qty_on_hand": {"qty_on_hand", "quantity", "qty", "on_hand"},
        "avg_cost": {"avg_cost", "unit_cost", "cost"},
    },
    "customers": {
        "name": {"name", "customer_name"},
        "phone": {"phone", "customer_phone"},
        "email": {"email", "customer_email"},
    },
}


def _normalise_header(value: str) -> str:
    value = value.strip().lower()
    return re.sub(r"[^a-z0-9]+", "_", value)


def _coerce_decimal(value: Any) -> Decimal | None:
    if value is None or value == "":
        return None
    if isinstance(value, Decimal):
        return value
    if isinstance(value, (int, float)):
        return Decimal(str(value))
    try:
        return Decimal(str(value).strip())
    except (InvalidOperation, AttributeError):
        return None


def _coerce_str(value: Any) -> str | None:
    if value is None:
        return None
    if isinstance(value, str):
        stripped = value.strip()
        return stripped if stripped else None
    if isinstance(value, (int, float, Decimal)):
        return str(value).strip()
    return None


def _coerce_object(value: Any) -> dict | None:
    if isinstance(value, dict):
        return value
    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        try:
            parsed = json.loads(text)
        except ValueError:
            return None
        return parsed if isinstance(parsed, dict) else None
    return None


def _dedupe_preserve_order(values: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    result: list[str] = []
    for value in values:
        if value not in seen:
            seen.add(value)
            result.append(value)
    return result


def _resolve_field(entity: str, key: str) -> str | None:
    aliases = FIELD_ALIASES.get(entity, {})
    for field, options in aliases.items():
        if key in options:
            return field
    return None


def _derive_short_code(row: Mapping[str, Any]) -> str | None:
    def _clean(value: str | None) -> str | None:
        if not value:
            return None
        alphanumeric = re.sub(r"[^A-Za-z0-9]", "", value)
        if not alphanumeric:
            return None
        return alphanumeric[:4].upper()

    sources = (
        _coerce_str(row.get("short_code")),
        _coerce_str(row.get("sku")),
        _coerce_str(row.get("description")),
    )
    for candidate in sources:
        cleaned = _clean(candidate)
        if cleaned:
            return cleaned
    return None


def _prepare_row(entity: str, raw_row: Mapping[str, Any]) -> dict[str, Any]:
    normalised = {
        _normalise_header(str(key)): value
        for key, value in raw_row.items()
        if key is not None
    }
    prepared: dict[str, Any] = {}
    for key, value in normalised.items():
        field = _resolve_field(entity, key)
        if field is None:
            continue
        if field in prepared:
            if value is None:
                continue
            if isinstance(value, str) and not value.strip():
                continue
        prepared[field] = value
    return prepared


def _extract_from_csv(data: bytes) -> dict[str, list[dict[str, Any]]]:
    text = data.decode("utf-8-sig")
    stream = io.StringIO(text)
    reader = csv.DictReader(stream)
    if reader.fieldnames is None:
        raise ValueError("Uploaded CSV is missing a header row")

    fieldnames = [_normalise_header(name) for name in reader.fieldnames]
    entity_column = None
    for index, field in enumerate(fieldnames):
        if field in {"entity", "table", "sheet"}:
            entity_column = reader.fieldnames[index]
            break
    if entity_column is None:
        raise ValueError(
            "CSV uploads must include an 'entity' column identifying vendors, items, etc."
        )

    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for raw_row in reader:
        entity_value = raw_row.get(entity_column)
        entity = _coerce_str(entity_value)
        if not entity:
            continue
        entity_key = _normalise_header(entity)
        if entity_key not in SUPPORTED_ENTITIES:
            continue
        grouped[entity_key].append(_prepare_row(entity_key, raw_row))
    return grouped


def _extract_from_workbook(data: bytes) -> dict[str, list[dict[str, Any]]]:
    if load_workbook is None:  # pragma: no cover - optional dependency
        raise ValueError("XLSX support requires the 'openpyxl' package")
    workbook = load_workbook(io.BytesIO(data), read_only=True, data_only=True)
    grouped: dict[str, list[dict[str, Any]]] = defaultdict(list)
    for worksheet in workbook.worksheets:
        entity_key = _normalise_header(worksheet.title)
        if entity_key not in SUPPORTED_ENTITIES:
            continue
        rows_iter = worksheet.iter_rows(values_only=True)
        headers = next(rows_iter, None)
        if headers is None:
            continue
        normalised_headers = [
            _normalise_header(str(header)) if header is not None else "" for header in headers
        ]
        for row in rows_iter:
            raw_row: dict[str, Any] = {}
            empty = True
            for index, header in enumerate(normalised_headers):
                if not header:
                    continue
                value = row[index] if index < len(row) else None
                if value not in (None, ""):
                    empty = False
                raw_row[header] = value
            if empty:
                continue
            grouped[entity_key].append(_prepare_row(entity_key, raw_row))
    return grouped


def extract_datasets(data: bytes, filename: str) -> dict[str, list[dict[str, Any]]]:
    if filename.lower().endswith(".csv"):
        return _extract_from_csv(data)
    if filename.lower().endswith(".xlsx"):
        return _extract_from_workbook(data)
    raise ValueError("Unsupported file type. Upload a CSV or XLSX spreadsheet.")


@dataclass
class ImportCounters:
    vendors: int = 0
    locations: int = 0
    items: int = 0
    barcodes: int = 0
    inventory_records: int = 0
    customers: int = 0
    warnings: list[str] = field(default_factory=list)


@dataclass
class ImportResult:
    counters: ImportCounters
    cleared_sample_data: bool
    imported_at: datetime


async def _clear_existing_data(session: AsyncSession) -> bool:
    """Remove existing demo/sample data to avoid duplicates."""

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    demo_items = await session.scalar(
        select(func.count(domain.Item.item_id)).where(domain.Item.sku.like("DEMO%"))
    )
    demo_vendor = await session.scalar(
        select(func.count(domain.Vendor.vendor_id)).where(domain.Vendor.name == "Demo Furnishings")
    )
    cleared_demo = bool(demo_items or demo_vendor)

    for model in (
        domain.IncomingTruckUpdate,
        domain.IncomingTruckLine,
        domain.IncomingTruck,
        domain.ReceivingLine,
        domain.Receiving,
        domain.POLine,
        domain.PurchaseOrder,
        domain.InventoryTxn,
        domain.Inventory,
        domain.Barcode,
        domain.SaleLine,
        domain.Sale,
        domain.Customer,
        domain.Item,
        domain.Location,
        domain.Vendor,
    ):
        await session.execute(delete(model))

    await session.flush()

    return cleared_demo


def _clean_location_type(value: Any) -> str:
    candidate = (_coerce_str(value) or "floor").lower()
    allowed = {"floor", "backroom", "warehouse"}
    if candidate not in allowed:
        return "floor"
    return candidate


async def import_spreadsheet(
    session: AsyncSession, data: bytes, filename: str
) -> ImportResult:
    datasets = extract_datasets(data, filename)
    has_supported_rows = any(datasets.get(entity) for entity in SUPPORTED_ENTITIES)
    if not has_supported_rows:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=NO_IMPORTABLE_ROWS_DETAIL
        )
    counters = ImportCounters()

    imported_records = False

    cleared_demo = await _clear_existing_data(session)

    vendor_rows = datasets.get("vendors", [])
    vendors: dict[str, domain.Vendor] = {}
    for row in vendor_rows:
        name = _coerce_str(row.get("name"))
        if not name:
            counters.warnings.append("Skipped vendor row without a name")
            continue
        vendor = domain.Vendor(
            name=name,
            terms=_coerce_str(row.get("terms")),
            phone=_coerce_str(row.get("phone")),
            email=_coerce_str(row.get("email")),
            address_json=_coerce_object(row.get("address_json")),
        )
        session.add(vendor)
        await session.flush()
        vendors[name.lower()] = vendor
        counters.vendors += 1
        imported_records = True

    location_rows = datasets.get("locations", [])
    locations: dict[str, domain.Location] = {}
    for row in location_rows:
        name = _coerce_str(row.get("name"))
        if not name:
            counters.warnings.append("Skipped location row without a name")
            continue
        location = domain.Location(name=name, type=_clean_location_type(row.get("type")))
        session.add(location)
        await session.flush()
        locations[name.lower()] = location
        counters.locations += 1
        imported_records = True

    if not locations:
        default_location = domain.Location(name="Main Showroom", type="floor")
        session.add(default_location)
        await session.flush()
        locations[default_location.name.lower()] = default_location
        counters.locations += 1

    item_rows = datasets.get("items", [])
    items: dict[str, domain.Item] = {}
    item_qty_defaults: list[tuple[str, Decimal | None, str | None]] = []
    for row in item_rows:
        sku = _coerce_str(row.get("sku"))
        description = _coerce_str(row.get("description"))
        if not sku or not description:
            counters.warnings.append(f"Skipped item because of missing required fields (sku={sku})")
            continue

        short_code = _derive_short_code(row)
        if not short_code:
            counters.warnings.append(
                f"Skipped item because of missing short code (derived from sku={sku})"
            )
            continue

        unit_cost = _coerce_decimal(row.get("unit_cost")) or _coerce_decimal(row.get("avg_cost"))
        price = _coerce_decimal(row.get("price")) or unit_cost or Decimal("0")
        if unit_cost is None:
            unit_cost = price

        item = domain.Item(
            sku=sku,
            description=description,
            category=_coerce_str(row.get("category")),
            subcategory=_coerce_str(row.get("subcategory")),
            unit_cost=unit_cost,
            price=price,
            tax_code=_coerce_str(row.get("tax_code")),
            short_code=short_code,
            active=True,
        )
        session.add(item)
        await session.flush()
        items[sku.lower()] = item
        counters.items += 1
        imported_records = True

        barcode_value = _coerce_str(row.get("barcode"))
        if barcode_value:
            barcode = domain.Barcode(item_id=item.item_id, barcode=barcode_value)
            session.add(barcode)
            counters.barcodes += 1

        qty = _coerce_decimal(row.get("qty_on_hand"))
        location_name = _coerce_str(row.get("location_name"))
        item_qty_defaults.append((sku.lower(), qty, location_name.lower() if location_name else None))

    inventory_rows = datasets.get("inventory", [])
    inventory_map: dict[tuple[str, str], dict[str, Any]] = {}
    for row in inventory_rows:
        sku = _coerce_str(row.get("sku"))
        location_name = _coerce_str(row.get("location_name"))
        if not sku or not location_name:
            counters.warnings.append("Skipped inventory row missing SKU or location")
            continue
        key = (sku.lower(), location_name.lower())
        inventory_map[key] = {
            "qty_on_hand": _coerce_decimal(row.get("qty_on_hand")) or Decimal("0"),
            "avg_cost": _coerce_decimal(row.get("avg_cost")),
        }

    if not inventory_map:
        for sku, qty, location_name in item_qty_defaults:
            if sku not in items:
                continue
            if location_name and location_name in locations:
                target_location = locations[location_name]
            else:
                target_location = next(iter(locations.values()))
            key = (sku, target_location.name.lower())
            if key in inventory_map:
                continue
            if qty is None:
                qty = Decimal("0")
            inventory_map[key] = {"qty_on_hand": qty, "avg_cost": items[sku].unit_cost}

    for (sku_key, location_key), payload in inventory_map.items():
        item = items.get(sku_key)
        location = locations.get(location_key)
        if item is None:
            counters.warnings.append(f"Inventory reference for unknown SKU '{sku_key}' was skipped")
            continue
        if location is None:
            counters.warnings.append(
                f"Inventory reference for unknown location '{location_key}' was skipped"
            )
            continue
        inventory = domain.Inventory(
            item_id=item.item_id,
            location_id=location.location_id,
            qty_on_hand=payload.get("qty_on_hand", Decimal("0")),
            qty_reserved=Decimal("0"),
            avg_cost=payload.get("avg_cost") or item.unit_cost,
            last_counted_at=utc_now(),
        )
        session.add(inventory)
        counters.inventory_records += 1
        imported_records = True

    customer_rows = datasets.get("customers", [])
    seen_customer_keys: set[str] = set()
    for row in customer_rows:
        name = _coerce_str(row.get("name"))
        email = _coerce_str(row.get("email"))
        phone = _coerce_str(row.get("phone"))
        if not name and not email:
            counters.warnings.append("Skipped customer row without name or email")
            continue
        dedupe_key = "::".join(_dedupe_preserve_order(filter(None, [name, email, phone])))
        if dedupe_key in seen_customer_keys:
            continue
        seen_customer_keys.add(dedupe_key)
        customer = domain.Customer(name=name or email or phone or "Customer", phone=phone, email=email)
        session.add(customer)
        counters.customers += 1

        imported_records = True

    if not imported_records:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail=NO_IMPORTABLE_ROWS_DETAIL
        )

    return ImportResult(counters=counters, cleared_sample_data=cleared_demo, imported_at=utc_now())

