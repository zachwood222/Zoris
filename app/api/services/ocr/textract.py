"""AWS Textract provider stub."""
from __future__ import annotations

import asyncio
from typing import Any

import boto3

from .base import OcrDocument, OcrProvider, OcrWord


class TextractProvider(OcrProvider):
    def __init__(self, *, region: str, access_key: str | None = None, secret_key: str | None = None):
        session = boto3.session.Session(
            aws_access_key_id=access_key,
            aws_secret_access_key=secret_key,
            region_name=region,
        )
        self.client = session.client("textract")

    async def analyze(self, image_path: str) -> OcrDocument:
        def _process() -> OcrDocument:
            with open(image_path, "rb") as fh:
                result = self.client.analyze_document(
                    Document={"Bytes": fh.read()}, FeatureTypes=["FORMS", "TABLES"]
                )
            words: list[OcrWord] = []
            for block in result.get("Blocks", []):
                if block.get("BlockType") == "WORD":
                    words.append(
                        OcrWord(
                            text=block.get("Text", ""),
                            confidence=float(block.get("Confidence", 0)) / 100,
                        )
                    )
            return OcrDocument(words=words)

        return await asyncio.to_thread(_process)
