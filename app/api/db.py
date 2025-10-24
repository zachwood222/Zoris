"""Database session management."""
from __future__ import annotations

import logging
from collections.abc import AsyncIterator

from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from .config import get_settings
from .utils.logging import sanitize_connection_url

settings = get_settings()
logger = logging.getLogger(__name__)


def _ensure_async_driver(database_url: str, *, require_tls: bool = False) -> str:
    """Return a URL that uses an async driver suitable for ``create_async_engine``."""

    url = make_url(database_url)
    drivername = url.drivername

    dialect, _, driver = drivername.partition("+")
    if dialect in {"postgresql", "postgres"}:
        if driver != "psycopg_async":
            url = url.set(drivername="postgresql+psycopg_async")
        if require_tls:
            query = dict(url.query)
            query.setdefault("sslmode", "require")
            url = url.set(query=query)
    elif dialect == "sqlite" and driver != "aiosqlite":
        url = url.set(drivername="sqlite+aiosqlite")

    return str(url)


engine = create_async_engine(
    _ensure_async_driver(
        settings.database_url,
        require_tls=settings.database_require_tls,
    ),
    echo=settings.sqlalchemy_echo,
    future=True,
)
logger.debug(
    "Configured async engine", extra={"database_url": sanitize_connection_url(settings.database_url)}
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)


async def get_session() -> AsyncIterator[AsyncSession]:
    """Provide an async SQLAlchemy session for request scope."""

    session = SessionLocal()
    try:
        yield session
        await session.commit()
    except Exception:
        await session.rollback()
        raise
    finally:
        await session.close()
