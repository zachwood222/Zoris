"""Database session management."""
from __future__ import annotations

from collections.abc import AsyncIterator

from sqlalchemy.engine import make_url
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from .config import get_settings

settings = get_settings()


def _ensure_async_driver(database_url: str) -> str:
    """Return a URL that uses an async driver suitable for ``create_async_engine``."""

    url = make_url(database_url)
    drivername = url.drivername

    dialect, _, driver = drivername.partition("+")
    if dialect in {"postgresql", "postgres"} and driver != "asyncpg":
        url = url.set(drivername="postgresql+asyncpg")
    elif dialect == "sqlite" and driver != "aiosqlite":
        url = url.set(drivername="sqlite+aiosqlite")

    return str(url)


engine = create_async_engine(_ensure_async_driver(settings.database_url), echo=False, future=True)
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
