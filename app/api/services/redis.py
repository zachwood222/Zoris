"""Redis connectivity helpers."""
from __future__ import annotations

from functools import lru_cache
from typing import Optional

from redis.asyncio import Redis

from ..config import get_settings


@lru_cache(maxsize=1)
def get_redis_client() -> Optional[Redis]:
    """Return a cached Redis client if a URL is configured."""

    settings = get_settings()
    if not settings.redis_url:
        return None

    return Redis.from_url(settings.redis_url, decode_responses=True, health_check_interval=30)
