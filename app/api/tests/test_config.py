from __future__ import annotations

import pytest

from app.api import config


def _clear_settings_cache() -> None:
    config.get_settings.cache_clear()


def _clear_redis_env(monkeypatch: pytest.MonkeyPatch) -> None:
    for key in (
        "REDIS_URL",
        "REDIS_TLS_URL",
        "REDIS_HOST",
        "REDIS_PORT",
        "REDIS_USERNAME",
        "REDIS_PASSWORD",
        "REDIS_DB",
        "REDIS_USE_TLS",
    ):
        monkeypatch.delenv(key, raising=False)


def test_get_settings_defaults_to_local_redis(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    _clear_redis_env(monkeypatch)
    _clear_settings_cache()

    settings = config.get_settings()

    assert settings.redis_url == "redis://localhost:6379/0"


def test_get_settings_respects_explicit_redis_url(monkeypatch: pytest.MonkeyPatch) -> None:
    _clear_settings_cache()
    _clear_redis_env(monkeypatch)
    monkeypatch.delenv("ENVIRONMENT", raising=False)
    monkeypatch.setenv("REDIS_URL", "redis://example.com:6380/2")

    settings = config.get_settings()

    assert settings.redis_url == "redis://example.com:6380/2"


def test_get_settings_requires_redis_in_production(monkeypatch: pytest.MonkeyPatch) -> None:
    _clear_redis_env(monkeypatch)
    monkeypatch.setenv("ENVIRONMENT", "production")
    _clear_settings_cache()

    with pytest.raises(ValueError):
        config.get_settings()
