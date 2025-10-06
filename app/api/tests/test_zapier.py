from __future__ import annotations

import pytest

from ..services import zapier


@pytest.mark.asyncio
async def test_post_with_retry(monkeypatch):
    attempts = []

    class DummyResponse:
        def raise_for_status(self):
            if len(attempts) < 2:
                raise RuntimeError("boom")

    async def fake_post(url, json, timeout):  # noqa: A002 - shadowing json arg is intentional
        attempts.append(1)
        if len(attempts) < 3:
            raise RuntimeError("boom")
        return DummyResponse()

    class DummyClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        post = fake_post

    monkeypatch.setattr(zapier.httpx, "AsyncClient", lambda: DummyClient())

    await zapier.post_with_retry("http://example.com", {"ok": True}, attempts=3)
    assert len(attempts) == 3
