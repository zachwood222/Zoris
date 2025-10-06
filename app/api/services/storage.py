"""S3 helper for storing attachments."""
from __future__ import annotations

from typing import BinaryIO

import boto3

from ..config import get_settings

settings = get_settings()


class StorageService:
    def __init__(self) -> None:
        self.client = boto3.client(
            "s3",
            endpoint_url=settings.s3_endpoint,
            aws_access_key_id=settings.s3_access_key,
            aws_secret_access_key=settings.s3_secret_key,
        )
        self.bucket = settings.s3_bucket

    def upload_file(self, *, key: str, fileobj: BinaryIO, content_type: str) -> str:
        self.client.upload_fileobj(fileobj, self.bucket, key, ExtraArgs={"ContentType": content_type})
        return f"{settings.s3_endpoint}/{self.bucket}/{key}"

    def ensure_bucket(self) -> None:
        buckets = [b["Name"] for b in self.client.list_buckets().get("Buckets", [])]
        if self.bucket not in buckets:
            self.client.create_bucket(Bucket=self.bucket)


storage_service = StorageService()
