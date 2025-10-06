from __future__ import annotations

from ..services.shortcode import generate_short_code


def test_generate_short_code_unique():
    existing = {"0001", "0002"}
    code = generate_short_code(existing)
    assert code not in existing
    assert len(code) == 4
