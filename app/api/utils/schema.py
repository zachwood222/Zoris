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


async def ensure_runtime_schema() -> None:
    """Run lightweight checks to keep essential schema pieces in place."""

    await ensure_vendor_model_column()
