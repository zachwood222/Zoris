"""Declarative base and mixins."""
from __future__ import annotations

from datetime import datetime

from sqlalchemy import DateTime
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column

from ..utils.datetime import utc_now


class Base(DeclarativeBase):
    """Base declarative class."""

    type_annotation_map = {}


class TimestampMixin:
    """Mixin providing created/updated timestamps."""

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
