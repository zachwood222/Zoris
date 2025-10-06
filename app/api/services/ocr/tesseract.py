"""Local pytesseract provider."""
from __future__ import annotations

import asyncio

import pytesseract
from PIL import Image

from .base import OcrDocument, OcrProvider, OcrWord


class TesseractProvider(OcrProvider):
    """Simple pytesseract wrapper returning words with confidence."""

    async def analyze(self, image_path: str) -> OcrDocument:
        def _process() -> OcrDocument:
            image = Image.open(image_path)
            data = pytesseract.image_to_data(image, output_type=pytesseract.Output.DICT)
            words = []
            for text, conf in zip(data.get("text", []), data.get("conf", [])):
                try:
                    conf_value = float(conf) / 100 if conf not in {"-1", ""} else 0.0
                except ValueError:
                    conf_value = 0.0
                if text.strip():
                    words.append(OcrWord(text=text.strip(), confidence=conf_value))
            return OcrDocument(words=words)

        return await asyncio.to_thread(_process)
