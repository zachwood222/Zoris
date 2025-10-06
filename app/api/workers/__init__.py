"""Celery app initialization."""
from __future__ import annotations

from celery import Celery

from ..config import get_settings

settings = get_settings()

celery_app = Celery(
    "zoris",
    broker=settings.redis_url,
    backend=settings.redis_url,
)
celery_app.conf.update(task_default_queue="default")


@celery_app.task
def ping() -> str:
    return "pong"
