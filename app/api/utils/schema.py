"""Utilities for keeping the runtime database schema aligned with expectations."""
from __future__ import annotations

from sqlalchemy import inspect, text

from ..db import engine


async def ensure_vendor_model_column() -> None:
    """Ensure the ``item.vendor_model`` column exists for backward compatible deployments."""

    async with engine.begin() as conn:
        def _has_column(sync_conn) -> bool:
            inspector = inspect(sync_conn)
            return any(col["name"] == "vendor_model" for col in inspector.get_columns("item"))

        has_column = await conn.run_sync(_has_column)
        if not has_column:
            await conn.execute(text("ALTER TABLE item ADD COLUMN vendor_model VARCHAR(100)"))


async def ensure_sale_workflow_columns() -> None:
    """Ensure sale header columns introduced for the editable workflow exist."""

    async with engine.begin() as conn:
        def _existing_columns(sync_conn) -> set[str]:
            inspector = inspect(sync_conn)
            return {col["name"] for col in inspector.get_columns("sale")}

        existing_columns = await conn.run_sync(_existing_columns)

        if "payment_method" not in existing_columns:
            await conn.execute(
                text("ALTER TABLE sale ADD COLUMN payment_method VARCHAR(50)")
            )

        if "fulfillment_type" not in existing_columns:
            await conn.execute(
                text("ALTER TABLE sale ADD COLUMN fulfillment_type VARCHAR(20)")
            )

        if "delivery_fee" not in existing_columns:
            await conn.execute(
                text("ALTER TABLE sale ADD COLUMN delivery_fee NUMERIC(10, 2) DEFAULT 0")
            )


async def ensure_runtime_schema() -> None:
    """Run lightweight checks to keep essential schema pieces in place."""

    await ensure_vendor_model_column()
    await ensure_sale_workflow_columns()
