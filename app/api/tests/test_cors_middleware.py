import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from starlette.middleware.cors import CORSMiddleware

from app.api import config


def _clear_settings_cache() -> None:
    config.get_settings.cache_clear()


def _build_cors_app(settings: config.Settings) -> FastAPI:
    app = FastAPI()
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_origin_regex=settings.cors_origin_regex,
        allow_methods=["*"],
        allow_headers=["*"],
        allow_credentials=True,
    )

    @app.get("/dashboard/summary")
    async def summary() -> dict[str, str]:
        return {"status": "ok"}

    return app


@pytest.mark.parametrize(
    "origin,expected_status",
    [
        ("https://north.example.com", 200),
        ("https://api.example.net", 400),
    ],
)
def test_preflight_respects_wildcard_patterns(
    monkeypatch: pytest.MonkeyPatch, origin: str, expected_status: int
) -> None:
    monkeypatch.setenv("CORS_ORIGINS", "https://*.example.com")
    _clear_settings_cache()

    settings = config.get_settings()
    app = _build_cors_app(settings)
    client = TestClient(app)

    response = client.options(
        "/dashboard/summary",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == expected_status
    if expected_status == 200:
        assert response.headers.get("access-control-allow-origin") == origin

    _clear_settings_cache()


@pytest.mark.parametrize(
    "origin",
    [
        "https://zoris-dashboard.onrender.com",
        "https://zoris.onrender.com",
    ],
)
def test_preflight_allows_default_render_origins(
    monkeypatch: pytest.MonkeyPatch, origin: str
) -> None:
    monkeypatch.delenv("CORS_ORIGINS", raising=False)
    _clear_settings_cache()

    settings = config.get_settings()
    app = _build_cors_app(settings)
    client = TestClient(app)

    response = client.options(
        "/dashboard/summary",
        headers={
            "Origin": origin,
            "Access-Control-Request-Method": "GET",
        },
    )

    assert response.status_code == 200
    assert response.headers.get("access-control-allow-origin") == origin

    _clear_settings_cache()
