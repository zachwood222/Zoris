"""Minimal stub of :mod:`pytest_asyncio` for offline test environments."""

from __future__ import annotations

from .plugin import fixture

__all__ = ["fixture"]

# Ensure pytest discovers the hook implementations defined in ``plugin`` when
# this package is imported from tests.
pytest_plugins = ("pytest_asyncio.plugin",)
