"""QuickBooks stubbed service."""
from __future__ import annotations

from typing import Any

from ..config import get_settings

settings = get_settings()


def create_sales_receipt(payload: dict[str, Any]) -> None:
    if not settings.qbo_enabled:
        # In production integrate with QBO SDK. For now just log payload.
        print("[QBO] create_sales_receipt", payload)
        return
    raise NotImplementedError("QBO integration not implemented in starter")


def create_bill(payload: dict[str, Any]) -> None:
    if not settings.qbo_enabled:
        print("[QBO] create_bill", payload)
        return
    raise NotImplementedError
