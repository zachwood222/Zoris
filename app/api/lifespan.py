from collections.abc import AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI


@asynccontextmanager
def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Initialize shared clients and tear them down on shutdown."""
    # TODO: Replace with actual pools/clients for DB, Redis, S3, etc.
    app.state.db_pool = None
    app.state.redis = None
    app.state.object_store = None

    try:
        yield
    finally:
        # TODO: Gracefully close connections here.
        app.state.db_pool = None
        app.state.redis = None
        app.state.object_store = None
