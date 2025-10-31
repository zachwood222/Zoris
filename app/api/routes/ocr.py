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
from ..services.storage import StorageError, storage_service

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
    filename = image.filename or "upload"
    content_type = image.content_type or ""
    suffix = Path(filename).suffix.lower()
    image_suffixes = {".png", ".jpg", ".jpeg", ".tif", ".tiff", ".bmp", ".gif"}
    is_pdf = suffix == ".pdf" or content_type == "application/pdf"
    is_image = content_type.startswith("image/") or suffix in image_suffixes
    if not is_pdf and not is_image:
        raise HTTPException(status_code=400, detail="unsupported_file_type")

    tmp_suffix = suffix if suffix else ""
    with tempfile.NamedTemporaryFile(delete=False, suffix=tmp_suffix) as tmp:
        content = await image.read()
        tmp.write(content)
        tmp.flush()
        upload_path = Path(tmp.name)

    ocr_input_path = upload_path
    if is_pdf:
        try:
            import fitz  # type: ignore
        except ImportError as exc:  # pragma: no cover - import guard
            raise HTTPException(status_code=500, detail="pdf_processing_unavailable") from exc

        pdf = fitz.open(str(upload_path))
        try:
            if pdf.page_count == 0:
                raise HTTPException(status_code=400, detail="empty_pdf")
            page = pdf.load_page(0)
            pix = page.get_pixmap(dpi=300)
            with tempfile.NamedTemporaryFile(delete=False, suffix=".png") as pdf_image:
                pdf_image.write(pix.tobytes("png"))
                pdf_image.flush()
                ocr_input_path = Path(pdf_image.name)
        finally:
            pdf.close()

    storage_content_type = "application/pdf" if is_pdf else (content_type or "image/jpeg")
    with open(upload_path, "rb") as fh:
        try:
            doc_url = storage_service.upload_file(
                key=f"tickets/{upload_path.name}",
                fileobj=fh,
                content_type=storage_content_type,
            )
        except StorageError as exc:
            raise HTTPException(status_code=503, detail="storage_unavailable") from exc
    document: OcrDocument = await provider.analyze(str(ocr_input_path))
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
    attachment_kind = "document_ticket" if is_pdf else "photo_ticket"
    session.add(
        Attachment(ref_type="sale", ref_id=sale.sale_id, file_url=doc_url, kind=attachment_kind)
    )
    await session.flush()
    for path in {ocr_input_path, upload_path}:
        try:
            path.unlink()
        except FileNotFoundError:
            pass
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
