# OCR Pipeline

The OCR pipeline is pluggable via `OCR_PROVIDER` environment variable.

## Providers
- `tesseract`: Uses local `pytesseract`. Suitable for local demos.
- `textract`: Wraps AWS Textract `AnalyzeDocument`. Provide credentials via environment variables.

## Confidence Rules
- Required fields (customer, phone, subtotal, tax, total) must exceed 0.9 confidence.
- Weighted mean emphasises totals and phone numbers.
- Automatic approval triggers when all required fields exceed 0.95 and totals reconcile.

## Adding New Fields
1. Extend `app/api/services/ocr/parser.py` with new extraction logic.
2. Update response models in `app/api/schemas/common.py` if the field is exposed.
3. Add tests under `app/api/tests` covering the new parsing scenario.
