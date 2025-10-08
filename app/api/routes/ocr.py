"""OCR endpoints."""
from __future__ import annotations

import tempfile
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import get_settings
from ..db import get_session
from ..models.domain import Attachment, Sale
from ..schemas.common import OCRSaleTicketResponse
from ..services.ocr import parser
from ..services.ocr.base import OcrDocument
from ..services.ocr.tesseract import TesseractProvider
from ..services.storage import storage_service

router = APIRouter()
settings = get_settings()


async def get_provider() -> TesseractProvider:
    # For brevity default to Tesseract. Textract wiring illustrated in docs.
    return TesseractProvider()


@router.post("/sale-ticket", response_model=OCRSaleTicketResponse)
async def upload_ticket(
    image: UploadFile = File(...),
    ticket_id: str | None = Form(default=None),
    session: AsyncSession = Depends(get_session),
    provider: TesseractProvider = Depends(get_provider),
) -> OCRSaleTicketResponse:
    with tempfile.NamedTemporaryFile(delete=False) as tmp:
        content = await image.read()
        tmp.write(content)
        tmp.flush()
    with open(tmp.name, "rb") as fh:
        doc_url = storage_service.upload_file(
            key=f"tickets/{Path(tmp.name).name}",
            fileobj=fh,
            content_type=image.content_type or "image/jpeg",
        )
    document: OcrDocument = await provider.analyze(tmp.name)
    parsed = await parser.parse_ticket(document)
    parsed_fields: dict[str, object | None] = {
        "customer_name": parsed.customer_name,
        "phone": parsed.phone,
        "subtotal": parsed.subtotal,
        "tax": parsed.tax,
        "total": parsed.total,
    }
    if ticket_id:
        parsed_fields["ticket_id"] = ticket_id
    sale = Sale(status="draft", source="ocr_ticket", ocr_confidence=parsed.confidence)
    sale.ocr_payload = parsed_fields
    if parsed.subtotal is not None:
        sale.subtotal = parsed.subtotal
    if parsed.tax is not None:
        sale.tax = parsed.tax
    if parsed.total is not None:
        sale.total = parsed.total
    session.add(sale)
    await session.flush()
    session.add(Attachment(ref_type="sale", ref_id=sale.sale_id, file_url=doc_url, kind="photo_ticket"))
    await session.flush()
    return OCRSaleTicketResponse(
        sale_id=sale.sale_id,
        parsed_fields=parsed_fields,
        confidence=parsed.confidence,
        review_required=parsed.review_required,
    )


@router.get("/sale-ticket/{sale_id}")
async def get_ticket(sale_id: int, session: AsyncSession = Depends(get_session)) -> dict:
    sale = await session.get(Sale, sale_id)
    if not sale:
        raise HTTPException(status_code=404, detail="not_found")
    attachment = await session.scalar(
        select(Attachment).where(Attachment.ref_type == "sale", Attachment.ref_id == sale_id)
    )
    return {
        "sale_id": sale.sale_id,
        "ocr_confidence": float(sale.ocr_confidence or 0),
        "attachment_url": attachment.file_url if attachment else None,
        "parsed_fields": sale.ocr_payload or {},
    }
