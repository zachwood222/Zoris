from __future__ import annotations

import io

from types import SimpleNamespace

from app.api.services import storage


class _StubClient:
    def __init__(self) -> None:
        self.created_bucket: str | None = None
        self.uploads: list[dict[str, str]] = []

    def list_buckets(self) -> dict:
        return {"Buckets": []}

    def create_bucket(self, Bucket: str) -> None:  # noqa: N802 - upstream casing
        self.created_bucket = Bucket

    def upload_fileobj(self, fileobj, bucket: str, key: str, ExtraArgs: dict) -> None:  # noqa: N803 - boto style
        self.uploads.append(
            {
                "bucket": bucket,
                "key": key,
                "content_type": ExtraArgs.get("ContentType", ""),
                "size": len(fileobj.read()),
            }
        )


def test_upload_file_ensures_bucket_creation(monkeypatch) -> None:
    service = storage.StorageService.__new__(storage.StorageService)
    stub_client = _StubClient()
    service.client = stub_client  # type: ignore[attr-defined]
    service.bucket = "test-bucket"  # type: ignore[attr-defined]
    service._bucket_verified = False  # type: ignore[attr-defined]

    monkeypatch.setattr(
        storage,
        "settings",
        SimpleNamespace(s3_endpoint="https://example.com", s3_bucket="test-bucket"),
    )

    file_bytes = io.BytesIO(b"data")
    url = storage.StorageService.upload_file(service, key="tickets/test", fileobj=file_bytes, content_type="image/png")

    assert stub_client.created_bucket == "test-bucket"
    assert stub_client.uploads == [
        {
            "bucket": "test-bucket",
            "key": "tickets/test",
            "content_type": "image/png",
            "size": 4,
        }
    ]
    assert service._bucket_verified is True  # type: ignore[attr-defined]
    assert url.endswith("/test-bucket/tickets/test")
