from __future__ import annotations

from sqlalchemy.engine import make_url

from app.api.db import _ensure_async_driver


def test_ensure_async_driver_upgrades_postgres_and_adds_tls() -> None:
    url = _ensure_async_driver(
        "postgresql://user:pass@example.com:5432/zoris",
        require_tls=True,
    )

    parsed = make_url(url)
    assert parsed.drivername == "postgresql+psycopg_async"
    assert parsed.query.get("sslmode") == "require"


def test_ensure_async_driver_preserves_existing_sslmode() -> None:
    url = _ensure_async_driver(
        "postgresql://user:pass@example.com/zoris?sslmode=verify-full",
        require_tls=True,
    )

    parsed = make_url(url)
    assert parsed.query.get("sslmode") == "verify-full"


def test_ensure_async_driver_upgrades_sqlite_driver() -> None:
    url = _ensure_async_driver("sqlite:///./zoris.db")

    parsed = make_url(url)
    assert parsed.drivername == "sqlite+aiosqlite"
