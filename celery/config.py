"""Celery performance tuning defaults."""
from __future__ import annotations

import os
from functools import lru_cache
from urllib.parse import urlparse, urlunparse

from kombu import Queue

try:  # pragma: no cover - import guard for worker-only dependency chain
    from app.api.config import get_settings
except Exception:  # pragma: no cover - Celery still works without FastAPI settings
    get_settings = None  # type: ignore[assignment]


@lru_cache(1)
def _default_redis_url() -> str:
    """Return the Redis URL shared with the FastAPI application."""

    explicit = os.getenv("REDIS_URL") or os.getenv("REDIS_TLS_URL")
    if explicit:
        return explicit

    if get_settings is not None:
        try:
            settings = get_settings()
        except Exception:  # pragma: no cover - defensive for worker bootstrapping
            pass
        else:
            if settings.redis_url:
                return settings.redis_url

    return "redis://localhost:6379/0"


def _maybe_swap_db(url: str, default_db: int) -> str:
    """Ensure the Redis URL includes a database component."""

    parsed = urlparse(url)
    if parsed.path and parsed.path not in {"", "/"}:
        return url

    new_path = f"/{default_db}"
    return urlunparse(parsed._replace(path=new_path))


BROKER_URL = os.getenv("CELERY_BROKER_URL", _default_redis_url())
RESULT_BACKEND = os.getenv(
    "CELERY_RESULT_BACKEND",
    _maybe_swap_db(BROKER_URL if BROKER_URL else _default_redis_url(), 1),
)


def _int_env(name: str, default: str) -> int:
    """Fetch an integer from the environment with a default."""

    return int(os.getenv(name, default))


# Prefetch only one task per worker process to reduce latency spikes.
worker_prefetch_multiplier = _int_env("CELERY_PREFETCH", "1")

task_acks_late = True
worker_concurrency = _int_env("CELERY_CONCURRENCY", "4")
worker_max_tasks_per_child = _int_env("CELERY_MAX_TASKS_PER_CHILD", "1000")

# Hard/soft time limits for runaway tasks.
task_soft_time_limit = _int_env("CELERY_SOFT_TIME_LIMIT", "300")
task_time_limit = _int_env("CELERY_TIME_LIMIT", "600")

# Route critical queues first.
task_queues = (
    Queue("critical", routing_key="critical"),
    Queue("default", routing_key="default"),
)

# Ensure visibility timeout is long enough to acknowledge late tasks.
broker_transport_options = {"visibility_timeout": 3600}
