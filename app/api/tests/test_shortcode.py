from __future__ import annotations

import pytest

from ..services import shortcode
from ..services.shortcode import generate_short_code


def test_generate_short_code_unique():
    existing = {"0001", "0002"}
    code = generate_short_code(existing)
    assert code not in existing
    assert len(code) == 4


def test_generate_short_code_exhausted_pool():
    existing = {f"{value:03d}" for value in range(1000)}

    with pytest.raises(RuntimeError):
        generate_short_code(existing, length=3)


def test_generate_short_code_deterministic_fallback(monkeypatch: pytest.MonkeyPatch):
    attempts: list[int] = []

    def always_collide(_: int) -> int:
        attempts.append(1)
        return 0

    monkeypatch.setattr(shortcode, "randbelow", always_collide)

    existing = {"0000"}
    code = generate_short_code(existing)

    assert code != "0000"
    assert attempts  # ensure the random path was exercised first
