from __future__ import annotations

from datetime import datetime, timedelta, timezone
import base64
import hashlib
import hmac
import json

import pytest
from fastapi import Depends

from .. import security
from ..config import get_settings
from ..main import app
from ..security import User, require_roles


@app.get("/__test/protected")
async def protected_endpoint(user: User = Depends(require_roles("Purchasing"))) -> dict[str, object]:
    return {"user_id": user.id, "roles": sorted(user.roles)}


@pytest.fixture
def configure_auth(monkeypatch: pytest.MonkeyPatch):
    def _configure(**env: str) -> None:
        for key, value in env.items():
            monkeypatch.setenv(key, value)
        security.reset_security_state()
        get_settings.cache_clear()

    yield _configure

    security.reset_security_state()
    get_settings.cache_clear()


def _b64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b"=").decode("ascii")


def _issue_token(secret: str, *, subject: str = "user-123", **claims: object) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    payload: dict[str, object] = {
        "sub": subject,
        "exp": int((datetime.now(timezone.utc) + timedelta(minutes=5)).timestamp()),
    }
    payload.update(claims)

    header_segment = _b64url_encode(
        json.dumps(header, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    payload_segment = _b64url_encode(
        json.dumps(payload, separators=(",", ":"), sort_keys=True).encode("utf-8")
    )
    signing_input = f"{header_segment}.{payload_segment}".encode("ascii")
    signature = hmac.new(secret.encode("utf-8"), signing_input, hashlib.sha256).digest()
    signature_segment = _b64url_encode(signature)

    return f"{header_segment}.{payload_segment}.{signature_segment}"


@pytest.mark.asyncio
async def test_missing_token_returns_unauthorized(client, configure_auth) -> None:
    configure_auth(
        AUTH_PROVIDER="shared_secret",
        AUTH_SHARED_SECRET="supersecret",
        AUTH_ALGORITHMS="HS256",
        AUTH_ROLES_CLAIM="roles",
    )

    response = await client.get("/__test/protected")

    assert response.status_code == 401
    assert response.json()["detail"] == "missing_token"


@pytest.mark.asyncio
async def test_invalid_signature_is_rejected(client, configure_auth) -> None:
    secret = "correct-secret"
    configure_auth(
        AUTH_PROVIDER="shared_secret",
        AUTH_SHARED_SECRET=secret,
        AUTH_ALGORITHMS="HS256",
        AUTH_ROLES_CLAIM="roles",
    )

    bad_token = _issue_token("wrong-secret", roles=["Purchasing"])
    response = await client.get(
        "/__test/protected", headers={"Authorization": f"Bearer {bad_token}"}
    )

    assert response.status_code == 401
    assert response.json()["detail"] == "invalid_token"


@pytest.mark.asyncio
async def test_valid_token_with_mapped_role_allows_access(client, configure_auth) -> None:
    secret = "mapped-secret"
    configure_auth(
        AUTH_PROVIDER="shared_secret",
        AUTH_SHARED_SECRET=secret,
        AUTH_ALGORITHMS="HS256",
        AUTH_ROLES_CLAIM="app_metadata.roles",
        AUTH_ROLE_MAPPING=json.dumps({"clerk:purchasing": ["Purchasing"]}),
        AUTH_DEFAULT_ROLES="Floor",
    )

    token = _issue_token(secret, app_metadata={"roles": ["clerk:purchasing"]})
    response = await client.get(
        "/__test/protected", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    payload = response.json()
    assert payload["user_id"] == "user-123"
    assert "Purchasing" in payload["roles"]
    assert "Floor" in payload["roles"]


@pytest.mark.asyncio
async def test_missing_required_role_returns_forbidden(client, configure_auth) -> None:
    secret = "no-role-secret"
    configure_auth(
        AUTH_PROVIDER="shared_secret",
        AUTH_SHARED_SECRET=secret,
        AUTH_ALGORITHMS="HS256",
        AUTH_ROLES_CLAIM="roles",
    )

    token = _issue_token(secret, roles=["Viewer"])
    response = await client.get(
        "/__test/protected", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 403
    assert response.json()["detail"] == "insufficient_role"
