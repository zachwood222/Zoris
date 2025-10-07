import pytest

from app.api.services.ocr.base import OcrDocument, OcrWord
from app.api.services.ocr import parser


@pytest.mark.asyncio
async def test_parse_ticket_extracts_customer_name():
    document = OcrDocument(
        words=[
            OcrWord(text="Customer", confidence=0.99),
            OcrWord(text="Name:", confidence=0.98),
            OcrWord(text="John", confidence=0.97),
            OcrWord(text="Doe", confidence=0.96),
            OcrWord(text="Subtotal", confidence=0.95),
            OcrWord(text="$10.00", confidence=0.94),
        ]
    )

    parsed = await parser.parse_ticket(document)

    assert parsed.customer_name == "John Doe"
