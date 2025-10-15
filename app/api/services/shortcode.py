"""Short code generation utilities."""
from __future__ import annotations

from secrets import randbelow


def generate_short_code(existing: set[str], length: int = 4) -> str:
    """Generate a unique numeric short code of a given length."""

    if length < 3:
        raise ValueError("length must be >= 3")

    total_codes = 10**length
    if len(existing) >= total_codes:
        raise RuntimeError("no short codes available for requested length")

    max_attempts = min(10_000, total_codes)
    for _ in range(max_attempts):
        code = f"{randbelow(total_codes):0{length}d}"
        if code not in existing:
            return code

    # Fall back to a deterministic scan to guarantee a result when the code
    # space is sparse but random sampling repeatedly hits existing values.
    for value in range(total_codes):
        code = f"{value:0{length}d}"
        if code not in existing:
            return code

    raise RuntimeError("unable to allocate unique short code")
