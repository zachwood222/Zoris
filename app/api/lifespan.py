"""Application lifespan management."""

from __future__ import annotations

import logging
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI

from .config import get_settings
from .db import engine
from .services.redis import get_redis_client
from .utils.logging import log_startup_settings
from .utils.schema import ensure_runtime_schema

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Initialize shared clients and tear them down on shutdown."""

    settings = get_settings()

    # Shared resources available through ``app.state``.
    app.state.db_engine = engine
    app.state.redis = get_redis_client()

    await ensure_runtime_schema()
    if settings.log_startup_summary:
        log_startup_settings(settings)
    logger.info(
        "Application startup complete",
        extra={"environment": settings.environment},
    )

    try:
        yield
    finally:
        redis_client = getattr(app.state, "redis", None)
        if redis_client is not None:
            await redis_client.aclose()
            get_redis_client.cache_clear()
            app.state.redis = None

        db_engine = getattr(app.state, "db_engine", None)
        if db_engine is not None:
            await db_engine.dispose()
            app.state.db_engine = None
