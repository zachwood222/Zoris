"""Zapier webhook client with retries."""
from __future__ import annotations

import asyncio
import json
from typing import Any

import httpx

from ..config import get_settings

settings = get_settings()


async def post_with_retry(url: str, payload: dict[str, Any], *, attempts: int = 3) -> None:
    delay = 1.0
    async with httpx.AsyncClient() as client:
        for attempt in range(1, attempts + 1):
            try:
                response = await client.post(url, json=payload, timeout=10)
                response.raise_for_status()
                return
            except Exception:  # pragma: no cover - logged in production
                if attempt == attempts:
                    raise
                await asyncio.sleep(delay)
                delay *= 2


def ticket_finalized(payload: dict[str, Any]) -> None:
    if not settings.zap_ticket_finalized_url:
        return
    asyncio.create_task(post_with_retry(settings.zap_ticket_finalized_url, payload))


def delivery_completed(payload: dict[str, Any]) -> None:
    if not settings.zap_delivery_completed_url:
        return
    asyncio.create_task(post_with_retry(settings.zap_delivery_completed_url, payload))
