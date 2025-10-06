"""OCR task definitions."""
from __future__ import annotations

import asyncio

from . import celery_app
from ..services.ocr import parser
from ..services.ocr.tesseract import TesseractProvider


@celery_app.task(name="ocr.process_ticket")
def process_ticket(image_path: str) -> dict:
    provider = TesseractProvider()

    async def _run() -> dict:
        document = await provider.analyze(image_path)
        parsed = await parser.parse_ticket(document)
        return {"path": image_path, "parsed": parsed.__dict__}

    return asyncio.run(_run())
