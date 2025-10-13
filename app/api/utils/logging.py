"""Application logging utilities."""
from __future__ import annotations

import json
import logging
from logging.config import dictConfig
from time import perf_counter
from typing import Any, Iterable

from fastapi import Request
from sqlalchemy.engine import make_url
from sqlalchemy.exc import ArgumentError
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response
from starlette.types import Message

DEFAULT_LOG_FORMAT = "%(asctime)s | %(levelname)-8s | %(name)s | %(message)s"
_SENSITIVE_SETTINGS_KEYS = {
    "auth_shared_secret",
    "s3_secret_key",
    "zap_ticket_finalized_url",
    "zap_po_received_url",
    "zap_delivery_completed_url",
}


def _coerce_level(level: str | int) -> int:
    """Convert a configured level into a numeric logging level."""

    if isinstance(level, int):
        return level

    numeric = logging.getLevelName(level.upper())
    if isinstance(numeric, str):  # Unknown level name, fall back to INFO.
        return logging.INFO

    return int(numeric)


def configure_logging(*, level: str | int = "INFO") -> None:
    """Configure structured console logging for the application."""

    dictConfig(
        {
            "version": 1,
            "disable_existing_loggers": False,
            "formatters": {
                "default": {
                    "format": DEFAULT_LOG_FORMAT,
                    "datefmt": "%Y-%m-%d %H:%M:%S",
                }
            },
            "handlers": {
                "console": {
                    "class": "logging.StreamHandler",
                    "formatter": "default",
                    "stream": "ext://sys.stdout",
                }
            },
            "root": {
                "level": _coerce_level(level),
                "handlers": ["console"],
            },
        }
    )
    logging.captureWarnings(True)


def configure_sqlalchemy_logging(*, echo: bool) -> None:
    """Ensure SQLAlchemy engine logs respect the configured echo preference."""

    logger = logging.getLogger("sqlalchemy.engine")
    logger.setLevel(logging.INFO if echo else logging.WARNING)


def sanitize_connection_url(url: str | None) -> str | None:
    """Return a redacted representation of a connection URL."""

    if not url:
        return None

    try:
        return str(make_url(url).set(password="***"))
    except ArgumentError:  # pragma: no cover - defensive guard for custom schemes.
        return url


def _redact_sensitive_settings(settings_dict: dict[str, Any], keys: Iterable[str]) -> dict[str, Any]:
    """Return a shallow copy of ``settings_dict`` with secrets redacted."""

    sanitized = settings_dict.copy()
    for key in keys:
        if sanitized.get(key):
            sanitized[key] = "***"
    return sanitized


def log_startup_settings(settings: Any, *, logger: logging.Logger | None = None) -> None:
    """Emit a sanitized summary of key settings for troubleshooting."""

    if logger is None:
        logger = logging.getLogger("zoris.startup")

    data = _redact_sensitive_settings(settings.model_dump(), _SENSITIVE_SETTINGS_KEYS)
    summary = {
        "app_name": data.get("app_name"),
        "environment": data.get("environment"),
        "log_level": data.get("log_level"),
        "log_requests": data.get("log_requests"),
        "sqlalchemy_echo": data.get("sqlalchemy_echo"),
        "database_url": sanitize_connection_url(data.get("database_url")),
        "redis_url": sanitize_connection_url(data.get("redis_url")),
        "auth_provider": data.get("auth_provider"),
        "features": {
            "auto_approve_ocr": data.get("feature_auto_approve_ocr"),
            "qbo_enabled": data.get("qbo_enabled"),
        },
    }

    logger.info("Active configuration:\n%s", json.dumps(summary, indent=2, sort_keys=True))


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Middleware that logs concise request/response summaries."""

    def __init__(
        self,
        app,
        *,
        logger: logging.Logger | None = None,
        log_body: bool = False,
        max_body_length: int = 2048,
    ) -> None:
        super().__init__(app)
        self._logger = logger or logging.getLogger("zoris.request")
        self._log_body = log_body
        self._max_body_length = max_body_length

    async def dispatch(self, request: Request, call_next) -> Response:  # type: ignore[override]
        start_time = perf_counter()
        body_preview: str | None = None

        if self._log_body and request.method in {"POST", "PUT", "PATCH", "DELETE"}:
            body_bytes = await request.body()
            if body_bytes:
                truncated = body_bytes[: self._max_body_length]
                body_preview = truncated.decode("utf-8", errors="replace")
                if len(body_bytes) > self._max_body_length:
                    body_preview += "… (truncated)"

            async def receive() -> Message:
                nonlocal body_bytes
                message = {"type": "http.request", "body": body_bytes, "more_body": False}
                body_bytes = b""
                return message

            request._receive = receive  # type: ignore[attr-defined]

        try:
            response = await call_next(request)
        except Exception:
            duration_ms = (perf_counter() - start_time) * 1000
            self._logger.exception(
                "Unhandled exception during %s %s",
                request.method,
                request.url.path,
                extra={
                    "method": request.method,
                    "path": request.url.path,
                    "query": str(request.url.query),
                    "duration_ms": round(duration_ms, 2),
                    "client": request.client.host if request.client else None,
                    "body": body_preview,
                },
            )
            raise

        duration_ms = (perf_counter() - start_time) * 1000
        log_level = logging.INFO if response.status_code < 400 else logging.WARNING
        self._logger.log(
            log_level,
            "%s %s -> %s (%.2f ms)",
            request.method,
            request.url.path,
            response.status_code,
            duration_ms,
            extra={
                "method": request.method,
                "path": request.url.path,
                "query": str(request.url.query),
                "status_code": response.status_code,
                "duration_ms": round(duration_ms, 2),
                "client": request.client.host if request.client else None,
                "body": body_preview,
            },
        )

        return response
