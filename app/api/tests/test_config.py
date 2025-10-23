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


def test_log_level_normalization(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("LOG_LEVEL", "debug")
    _clear_settings_cache()

    settings = config.get_settings()

    assert settings.log_level == "DEBUG"

    monkeypatch.delenv("LOG_LEVEL", raising=False)


def test_default_cors_origins_cover_local_hosts(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    _clear_settings_cache()

    settings = config.get_settings()

    assert "http://localhost:3000" in settings.cors_origins
    assert "http://127.0.0.1:3000" in settings.cors_origins
    assert "http://0.0.0.0:3000" in settings.cors_origins


def test_cors_origins_accepts_json_array(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(
        "CORS_ORIGINS",
        "[\"https://app.example.com\", \"https://admin.example.com\"]",
    )
    _clear_settings_cache()

    settings = config.get_settings()

    assert settings.cors_origins == [
        "https://app.example.com",
        "https://admin.example.com",
    ]


def test_cors_origins_accepts_json_string(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", '"https://solo.example.com"')
    _clear_settings_cache()

    settings = config.get_settings()

    assert settings.cors_origins == ["https://solo.example.com"]


def test_cors_origins_strip_trailing_slashes(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("CORS_ORIGINS", "https://app.example.com/ , https://api.example.com///")
    _clear_settings_cache()

    settings = config.get_settings()

    assert settings.cors_origins == [
        "https://app.example.com",
        "https://api.example.com",
    ]


def test_cors_origins_normalize_paths_and_case(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv(
        "CORS_ORIGINS",
        "https://Admin.EXAMPLE.com:8443/dashboard, https://app.example.com/base/path",
    )
    _clear_settings_cache()

    settings = config.get_settings()

    assert settings.cors_origins == [
        "https://admin.example.com:8443",
        "https://app.example.com",
    ]
