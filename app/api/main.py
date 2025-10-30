"""FastAPI entry point."""
from __future__ import annotations

import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import get_settings
from .lifespan import lifespan
from .routes import api_router
from .utils.logging import (
    RequestLoggingMiddleware,
    configure_logging,
    configure_sqlalchemy_logging,
)

settings = get_settings()
configure_logging(level=settings.log_level)
configure_sqlalchemy_logging(echo=settings.sqlalchemy_echo)
logger = logging.getLogger(__name__)

app = FastAPI(title=settings.app_name, lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=settings.cors_origin_regex,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if settings.log_requests:
    app.add_middleware(
        RequestLoggingMiddleware,
        logger=logging.getLogger("zoris.request"),
        log_body=settings.log_request_body,
    )

app.include_router(api_router)


@app.get("/")
async def root() -> dict:
    return {"app": settings.app_name}


@app.head("/")
async def root_head() -> None:
    """FastAPI does not always auto-generate a HEAD route; define explicitly."""
    return None
