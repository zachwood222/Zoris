"""Short code generation utilities."""
from __future__ import annotations

import random


def generate_short_code(existing: set[str], length: int = 4) -> str:
    """Generate a unique numeric short code of a given length."""

    if length < 3:
        raise ValueError("length must be >= 3")
    max_attempts = 10_000
    for _ in range(max_attempts):
        code = f"{random.randint(0, 10**length - 1):0{length}d}"
        if code not in existing:
            return code
    raise RuntimeError("unable to allocate unique short code")
