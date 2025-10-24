"""Celery performance tuning defaults."""
from __future__ import annotations

import os

from kombu import Queue

BROKER_URL = "redis://localhost:6379/0"
RESULT_BACKEND = "redis://localhost:6379/1"


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
