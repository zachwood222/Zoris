"""CLI helper to replace demo data with a spreadsheet import."""
from __future__ import annotations

import argparse
import asyncio
import sys
from datetime import datetime
from pathlib import Path
from typing import Iterable

from fastapi import HTTPException

from ..db import SessionLocal
from ..services.importer import ImportCounters, ImportResult, import_spreadsheet


def _format_counter_lines(counters: ImportCounters) -> list[str]:
    entries: list[str] = []
    if counters.vendors:
        entries.append(f"vendors={counters.vendors}")
    if counters.locations:
        entries.append(f"locations={counters.locations}")
    if counters.items:
        entries.append(f"items={counters.items}")
    if counters.barcodes:
        entries.append(f"barcodes={counters.barcodes}")
    if counters.inventory_records:
        entries.append(f"inventory_records={counters.inventory_records}")
    if counters.customers:
        entries.append(f"customers={counters.customers}")
    if counters.sales:
        entries.append(f"sales={counters.sales}")
    if counters.purchase_orders:
        entries.append(f"purchase_orders={counters.purchase_orders}")
    if counters.receivings:
        entries.append(f"receivings={counters.receivings}")
    return entries


def _print_summary(
    filename: str,
    cleared_demo: bool,
    counters: ImportCounters,
    warnings: Iterable[str],
    imported_at: datetime,
) -> None:
    print(f"Imported '{filename}' at {imported_at.isoformat()}")

    lines = _format_counter_lines(counters)
    if lines:
        print("Updated:")
        for entry in lines:
            print(f"  - {entry}")
    else:
        print("Processed spreadsheet without entity updates")

    if cleared_demo:
        print("Cleared existing demo/sample data before importing")

    if warnings:
        print("Warnings:")
        for warning in warnings:
            print(f"  - {warning}")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Import an XLSX workbook containing 'Products', 'Customers', 'Orders', and "
            "'Purchase Orders' sheets. Existing demo fixtures are removed automatically so "
            "your data replaces them."
        )
    )
    parser.add_argument(
        "spreadsheet",
        help="Path to the XLSX file exported from STORIS, Google Sheets, or another system",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run the importer and display the summary without committing database changes",
    )
    return parser


async def _run_import(path: Path, dry_run: bool) -> ImportResult:
    data = path.read_bytes()
    async with SessionLocal() as session:
        try:
            result = await import_spreadsheet(session, data, path.name)
            if dry_run:
                await session.rollback()
            else:
                await session.commit()
            return result
        except HTTPException as exc:
            await session.rollback()
            detail = exc.detail or "Import failed"
            raise RuntimeError(detail) from exc
        except Exception:
            await session.rollback()
            raise


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    path = Path(args.spreadsheet)
    if not path.is_file():
        parser.error(f"Spreadsheet file not found: {path}")

    try:
        result = asyncio.run(_run_import(path, args.dry_run))
    except RuntimeError as exc:
        print(f"Error: {exc}", file=sys.stderr)
        return 1
    except Exception as exc:  # pragma: no cover - unexpected errors bubble up
        print(f"Unexpected error: {exc}", file=sys.stderr)
        return 1

    _print_summary(path.name, result.cleared_sample_data, result.counters, result.counters.warnings, result.imported_at)
    if args.dry_run:
        print("Dry-run requested; no changes were committed.")
    return 0


if __name__ == "__main__":  # pragma: no cover - manual execution entry point
    sys.exit(main())
