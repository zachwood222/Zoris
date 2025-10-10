from datetime import timedelta, timezone

from ..utils.datetime import utc_now


def test_utc_now_returns_timezone_aware() -> None:
    now = utc_now()
    assert now.tzinfo is timezone.utc
    assert now.utcoffset() == timedelta(0)
