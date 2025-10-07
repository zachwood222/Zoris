"""OCR ticket parsing utilities."""
from __future__ import annotations

import re
from dataclasses import dataclass
from statistics import mean

from .base import OcrDocument

MONEY_RE = re.compile(r"\$?\s?(\d{1,3}(?:,\d{3})*(?:\.\d{2})?)")
PHONE_RE = re.compile(r"\(?(\d{3})\)?[-.\s]?(\d{3})[-.\s]?(\d{4})")


@dataclass
class ParsedTicket:
    customer_name: str | None
    phone: str | None
    subtotal: float | None
    tax: float | None
    total: float | None
    lines: list[dict]
    confidence: float
    review_required: bool


def _extract_money(token: str) -> float | None:
    match = MONEY_RE.search(token)
    if not match:
        return None
    return float(match.group(1).replace(",", ""))


def _extract_phone(token: str) -> str | None:
    match = PHONE_RE.search(token)
    if not match:
        return None
    return f"{match.group(1)}-{match.group(2)}-{match.group(3)}"


async def parse_ticket(document: OcrDocument) -> ParsedTicket:
    words = document.words
    name_tokens: list[str] = []
    totals: dict[str, float] = {}
    confidences: list[float] = []
    collecting_name = False
    for word in words:
        raw_text = word.text
        token = raw_text.lower()
        confidences.append(word.confidence)
        if token.startswith("customer"):
            name_tokens.clear()
            collecting_name = True
            continue
        elif token.startswith("phone"):
            phone = _extract_phone(word.text)
            if phone:
                totals["phone"] = phone  # type: ignore[assignment]
            collecting_name = False
        elif any(marker in token for marker in ("subtotal", "tax", "total")):
            collecting_name = False
        elif collecting_name:
            stripped = raw_text.strip().strip(":")
            if not stripped:
                continue
            lowered = stripped.lower()
            if lowered.startswith("customer") or lowered.startswith("phone"):
                collecting_name = False
                continue
            if lowered.startswith("name") and len(lowered) <= 5:
                continue
            name_tokens.append(stripped)
        money = _extract_money(word.text)
        if money is not None:
            if "subtotal" in token:
                totals["subtotal"] = money
            elif "tax" in token and "total" not in token:
                totals["tax"] = money
            elif "total" in token:
                totals["total"] = money
    confidence = mean(confidences) if confidences else 0.0
    return ParsedTicket(
        customer_name=" ".join(name_tokens) or None,
        phone=totals.get("phone"),
        subtotal=totals.get("subtotal"),
        tax=totals.get("tax"),
        total=totals.get("total"),
        lines=[],
        confidence=confidence,
        review_required=confidence < 0.95,
    )
