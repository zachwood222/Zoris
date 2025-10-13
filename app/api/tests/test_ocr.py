from __future__ import annotations

import sys
import types
from typing import BinaryIO

import pytest
from httpx import AsyncClient
from sqlalchemy import select

from app.api.db import SessionLocal, engine
from app.api.main import app
from app.api.models.base import Base
from app.api.models.domain import Attachment, Sale
from app.api.routes import ocr
from app.api.services.ocr.base import OcrDocument, OcrWord


class _StubPixmap:
    def tobytes(self, fmt: str) -> bytes:
        assert fmt == "png"
        return b"PNGDATA"


class _StubPage:
    def get_pixmap(self, dpi: int) -> _StubPixmap:
        assert dpi == 300
        return _StubPixmap()


class _StubPdf:
    page_count = 1

    def __init__(self, _path: str) -> None:
        self._closed = False

    def load_page(self, index: int) -> _StubPage:
        assert index == 0
        return _StubPage()

    def close(self) -> None:
        self._closed = True


class _StubProvider:
    async def analyze(self, _image_path: str) -> OcrDocument:
        return OcrDocument(
            words=[
                OcrWord(text="Customer", confidence=0.99),
                OcrWord(text="Name:", confidence=0.98),
                OcrWord(text="Jane", confidence=0.97),
                OcrWord(text="Doe", confidence=0.96),
                OcrWord(text="Subtotal", confidence=0.95),
                OcrWord(text="$10.00", confidence=0.94),
                OcrWord(text="Tax", confidence=0.93),
                OcrWord(text="$1.00", confidence=0.92),
                OcrWord(text="Total", confidence=0.91),
                OcrWord(text="$11.00", confidence=0.90),
            ]
        )


@pytest.mark.asyncio
async def test_upload_pdf_ticket_uses_document_attachment_kind(
    monkeypatch: pytest.MonkeyPatch, client: AsyncClient
) -> None:
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)

    uploaded: dict[str, object] = {}

    def fake_upload_file(*, key: str, fileobj: BinaryIO, content_type: str) -> str:
        uploaded["key"] = key
        uploaded["content_type"] = content_type
        uploaded["size"] = len(fileobj.read())
        return f"https://example.com/{key}"

    monkeypatch.setattr(ocr.storage_service, "upload_file", fake_upload_file)

    stub_fitz = types.ModuleType("fitz")
    stub_fitz.open = lambda _path: _StubPdf(_path)  # type: ignore[attr-defined]
    monkeypatch.setitem(sys.modules, "fitz", stub_fitz)

    async def override_provider() -> _StubProvider:
        return _StubProvider()

    app.dependency_overrides[ocr.get_provider] = override_provider

    try:
        pdf_bytes = b"%PDF-1.4\n1 0 obj<<>>\nendobj\ntrailer<<>>\n%%EOF"
        response = await client.post(
            "/ocr/sale-ticket",
            files={"image": ("ticket.pdf", pdf_bytes, "application/pdf")},
            data={"ticket_id": "TICKET-123"},
        )
    finally:
        app.dependency_overrides.pop(ocr.get_provider, None)

    assert response.status_code == 200
    payload = response.json()

    assert uploaded["content_type"] == "application/pdf"

    sale_id = payload["sale_id"]
    async with SessionLocal() as session:
        attachment = await session.scalar(
            select(Attachment).where(Attachment.ref_type == "sale", Attachment.ref_id == sale_id)
        )
        sale = await session.get(Sale, sale_id)

    assert sale is not None
    assert attachment is not None
    assert attachment.kind == "document_ticket"
    assert sale.ocr_payload is not None
    assert sale.ocr_payload.get("ticket_id") == "TICKET-123"
