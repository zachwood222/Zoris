from __future__ import annotations

import logging

from app.api.utils import logging as logging_utils


def test_sanitize_connection_url_masks_password() -> None:
    redacted = logging_utils.sanitize_connection_url("postgresql://user:secret@example.com:5432/db")

    assert redacted == "postgresql://user:***@example.com:5432/db"


def test_sanitize_connection_url_handles_invalid() -> None:
    # Unknown URLs should be returned unchanged so debugging information is not lost.
    assert logging_utils.sanitize_connection_url("not-a-url") == "not-a-url"


def test_configure_logging_sets_root_level() -> None:
    logging_utils.configure_logging(level="WARNING")

    assert logging.getLogger().level == logging.WARNING
