"""OCR provider abstraction."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol


@dataclass
class OcrWord:
    text: str
    confidence: float
    bbox: tuple[int, int, int, int] | None = None


@dataclass
class OcrDocument:
    words: list[OcrWord]

    def text(self) -> str:
        return " ".join(word.text for word in self.words)


class OcrProvider(Protocol):
    """Interface all OCR providers must satisfy."""

    async def analyze(self, image_path: str) -> OcrDocument:
        ...
