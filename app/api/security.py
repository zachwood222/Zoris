"""Simple role-based security primitives."""
from __future__ import annotations

import base64
import hashlib
import hmac
import json
import time
from dataclasses import dataclass
from typing import Annotated, Any, Mapping

import httpx
from fastapi import Depends, Header, HTTPException, status

from .config import Settings, get_settings

WWW_AUTH_HEADER = {"WWW-Authenticate": "Bearer"}
_JWKS_CACHE: dict[str, tuple[float, dict[str, Any]]] = {}
_JWK_KEY_CACHE: dict[tuple[str, str], Mapping[str, Any]] = {}
_HMAC_ALGORITHMS = {
    "HS256": hashlib.sha256,
    "HS384": hashlib.sha384,
    "HS512": hashlib.sha512,
}
_RSA_ALGORITHMS = {
    "RS256": hashlib.sha256,
    "RS384": hashlib.sha384,
    "RS512": hashlib.sha512,
}
_RSA_DIGEST_INFOS = {
    "RS256": bytes.fromhex("3031300d060960864801650304020105000420"),
    "RS384": bytes.fromhex("3041300d060960864801650304020205000430"),
    "RS512": bytes.fromhex("3051300d060960864801650304020305000440"),
}


def _b64url_decode(segment: str) -> bytes:
    padding = "=" * (-len(segment) % 4)
    return base64.urlsafe_b64decode(segment + padding)


@dataclass
class User:
    id: str
    roles: set[str]


class AuthBackend:
    """Validate Authorization headers and map claims to internal roles."""

    def __init__(self, settings: Settings):
        self.settings = settings
        self._role_mapping = self._normalise_role_mapping(settings.auth_role_mapping)
        self._static_jwks = self._parse_static_jwks(settings.auth_jwks_static)

    def __call__(self, authorization: str | None) -> User:
        provider = self.settings.auth_provider

        if provider == "mock":
            return self._mock_user()

        token = self._extract_token(authorization)

        if provider == "shared_secret":
            payload = self._decode_with_key(token, self.settings.auth_shared_secret)
        elif provider == "jwks":
            payload = self._decode_with_key(token, self._resolve_jwk_key(token))
        else:  # pragma: no cover - defensive guard
            raise HTTPException(
                status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="unsupported_auth_provider",
            )

        return self._user_from_payload(payload)

    def _mock_user(self) -> User:
        roles = set(self.settings.auth_mock_roles)
        roles.update(self.settings.auth_default_roles)
        return User(id="demo", roles=roles)

    def _extract_token(self, authorization: str | None) -> str:
        if not authorization:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="missing_token", headers=WWW_AUTH_HEADER)

        try:
            scheme, token = authorization.split(" ", 1)
        except ValueError as exc:  # pragma: no cover - defensive guard
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED,
                detail="invalid_authorization_header",
                headers=WWW_AUTH_HEADER,
            ) from exc

        if scheme.lower() != "bearer" or not token.strip():
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED, detail="invalid_token", headers=WWW_AUTH_HEADER
            )

        return token.strip()

    def _parse_header(self, token: str) -> dict[str, Any]:
        parts = token.split(".")
        if len(parts) != 3:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid_token", headers=WWW_AUTH_HEADER)
        return self._decode_segment(parts[0])

    def _parse_token(self, token: str) -> tuple[dict[str, Any], dict[str, Any], bytes, str]:
        parts = token.split(".")
        if len(parts) != 3:
            raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="invalid_token", headers=WWW_AUTH_HEADER)

        header = self._decode_segment(parts[0])
        payload = self._decode_segment(parts[1])
        signature = _b64url_decode(parts[2])
        signing_input = f"{parts[0]}.{parts[1]}"

        return header, payload, signature, signing_input

    def _decode_segment(self, segment: str) -> dict[str, Any]:
        try:
            decoded = _b64url_decode(segment)
            return json.loads(decoded.decode("utf-8"))
        except (ValueError, json.JSONDecodeError) as exc:
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED, detail="invalid_token", headers=WWW_AUTH_HEADER
            ) from exc

    def _decode_with_key(self, token: str, key: Any | None) -> dict[str, Any]:
        if key is None:
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED, detail="missing_signing_key", headers=WWW_AUTH_HEADER
            )

        header, payload, signature, signing_input = self._parse_token(token)
        algorithm = header.get("alg")
        allowed_algorithms = self.settings.auth_algorithms or ["RS256"]

        if not algorithm:
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED, detail="invalid_token", headers=WWW_AUTH_HEADER
            )

        if algorithm not in allowed_algorithms:
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED,
                detail="disallowed_algorithm",
                headers=WWW_AUTH_HEADER,
            )

        if algorithm in _HMAC_ALGORITHMS:
            if not isinstance(key, str):
                raise HTTPException(
                    status.HTTP_401_UNAUTHORIZED, detail="missing_signing_key", headers=WWW_AUTH_HEADER
                )
            self._verify_hmac(signing_input, signature, key, algorithm)
        elif algorithm in _RSA_ALGORITHMS:
            if not isinstance(key, Mapping):
                raise HTTPException(
                    status.HTTP_401_UNAUTHORIZED, detail="missing_signing_key", headers=WWW_AUTH_HEADER
                )
            self._verify_rsa(signing_input, signature, key, algorithm)
        else:
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED, detail="disallowed_algorithm", headers=WWW_AUTH_HEADER
            )

        self._validate_claims(payload)
        return payload

    def _verify_hmac(self, signing_input: str, signature: bytes, secret: str, algorithm: str) -> None:
        digest = _HMAC_ALGORITHMS[algorithm]
        expected = hmac.new(secret.encode("utf-8"), signing_input.encode("utf-8"), digest).digest()
        if not hmac.compare_digest(expected, signature):
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED, detail="invalid_token", headers=WWW_AUTH_HEADER
            )

    def _verify_rsa(self, signing_input: str, signature: bytes, jwk_data: Mapping[str, Any], algorithm: str) -> None:
        if jwk_data.get("kty") != "RSA":
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED, detail="invalid_token", headers=WWW_AUTH_HEADER
            )

        modulus_b64 = jwk_data.get("n")
        exponent_b64 = jwk_data.get("e")

        if not isinstance(modulus_b64, str) or not isinstance(exponent_b64, str):
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED, detail="invalid_token", headers=WWW_AUTH_HEADER
            )

        modulus = int.from_bytes(_b64url_decode(modulus_b64), "big")
        exponent = int.from_bytes(_b64url_decode(exponent_b64), "big")

        hash_func = _RSA_ALGORITHMS[algorithm]
        digest = hash_func(signing_input.encode("utf-8")).digest()
        key_size = (modulus.bit_length() + 7) // 8

        if len(signature) != key_size:
            signature = signature.rjust(key_size, b"\x00")

        signature_int = int.from_bytes(signature, "big")
        if signature_int >= modulus:
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED, detail="invalid_token", headers=WWW_AUTH_HEADER
            )

        em_int = pow(signature_int, exponent, modulus)
        em = em_int.to_bytes(key_size, "big")

        if len(em) < 11 or not em.startswith(b"\x00\x01"):
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED, detail="invalid_token", headers=WWW_AUTH_HEADER
            )

        try:
            separator_index = em.index(b"\x00", 2)
        except ValueError as exc:
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED, detail="invalid_token", headers=WWW_AUTH_HEADER
            ) from exc

        padding = em[2:separator_index]
        if any(byte != 0xFF for byte in padding):
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED, detail="invalid_token", headers=WWW_AUTH_HEADER
            )

        digest_info = em[separator_index + 1 :]
        expected_info = _RSA_DIGEST_INFOS[algorithm] + digest

        if digest_info != expected_info:
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED, detail="invalid_token", headers=WWW_AUTH_HEADER
            )

    def _validate_claims(self, payload: Mapping[str, Any]) -> None:
        exp = payload.get("exp")
        now = time.time()

        if exp is None:
            if self.settings.auth_require_exp:
                raise HTTPException(
                    status.HTTP_401_UNAUTHORIZED, detail="invalid_token", headers=WWW_AUTH_HEADER
                )
        else:
            exp_value = self._coerce_int(exp)
            if exp_value is None:
                raise HTTPException(
                    status.HTTP_401_UNAUTHORIZED, detail="invalid_token", headers=WWW_AUTH_HEADER
                )
            if exp_value <= now:
                raise HTTPException(
                    status.HTTP_401_UNAUTHORIZED, detail="token_expired", headers=WWW_AUTH_HEADER
                )

        audience = self.settings.auth_audience
        if audience:
            audiences = self._normalise_audience(payload.get("aud"))
            if audience not in audiences:
                raise HTTPException(
                    status.HTTP_401_UNAUTHORIZED, detail="invalid_token", headers=WWW_AUTH_HEADER
                )

        issuer = self.settings.auth_issuer
        if issuer:
            iss_claim = payload.get("iss")
            if not isinstance(iss_claim, str) or iss_claim != issuer:
                raise HTTPException(
                    status.HTTP_401_UNAUTHORIZED, detail="invalid_token", headers=WWW_AUTH_HEADER
                )

    def _coerce_int(self, value: Any) -> int | None:
        if isinstance(value, int):
            return value
        if isinstance(value, float):
            return int(value)
        if isinstance(value, str):
            try:
                return int(value)
            except ValueError:
                return None
        return None

    def _normalise_audience(self, value: Any) -> set[str]:
        if value is None:
            return set()
        if isinstance(value, str):
            return {value}
        if isinstance(value, (list, tuple, set)):
            return {str(item) for item in value if isinstance(item, str)}
        return set()

    def _resolve_jwk_key(self, token: str) -> Mapping[str, Any]:
        header = self._parse_header(token)
        kid = header.get("kid")

        if not kid:
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED, detail="missing_kid", headers=WWW_AUTH_HEADER
            )

        if kid in self._static_jwks:
            return self._static_jwks[kid]

        jwks_url = self.settings.auth_jwks_url
        if not jwks_url:
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED, detail="missing_signing_key", headers=WWW_AUTH_HEADER
            )

        cached_key = _JWK_KEY_CACHE.get((jwks_url, kid))
        if cached_key is not None:
            return cached_key

        jwks = _fetch_jwks(jwks_url, self.settings.auth_jwks_cache_seconds)
        keys = jwks.get("keys", []) if isinstance(jwks, Mapping) else []

        for jwk_data in keys:
            if not isinstance(jwk_data, Mapping):
                continue
            key_id = jwk_data.get("kid")
            parsed_key = self._jwk_to_key(jwk_data)
            if key_id and parsed_key:
                _JWK_KEY_CACHE[(jwks_url, str(key_id))] = parsed_key

        resolved = _JWK_KEY_CACHE.get((jwks_url, kid))
        if resolved is None:
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED, detail="unknown_kid", headers=WWW_AUTH_HEADER
            )

        return resolved

    def _jwk_to_key(self, jwk_data: Mapping[str, Any]) -> Mapping[str, Any] | None:
        allowed_algorithms = self.settings.auth_algorithms or ["RS256"]
        algorithm_name = jwk_data.get("alg")

        if algorithm_name and algorithm_name not in allowed_algorithms:
            return None

        if jwk_data.get("kty") != "RSA":
            return None

        if not isinstance(jwk_data.get("n"), str) or not isinstance(jwk_data.get("e"), str):
            return None

        return dict(jwk_data)

    def _user_from_payload(self, payload: Mapping[str, Any]) -> User:
        user_id_claim = self.settings.auth_user_id_claim
        user_identifier = self._extract_claim(payload, user_id_claim)

        if user_identifier is None:
            raise HTTPException(
                status.HTTP_401_UNAUTHORIZED, detail="missing_user_id", headers=WWW_AUTH_HEADER
            )

        roles_claim = self.settings.auth_roles_claim
        raw_roles = self._extract_claim(payload, roles_claim)
        roles = self._normalise_roles(raw_roles)
        mapped_roles = self._map_roles(roles)
        mapped_roles.update(self.settings.auth_default_roles)

        return User(id=str(user_identifier), roles=mapped_roles)

    def _extract_claim(self, payload: Mapping[str, Any], path: str) -> Any:
        if not path:
            return None

        current: Any = payload
        for part in path.split("."):
            if not part:
                return None
            if isinstance(current, Mapping):
                current = current.get(part)
            else:
                return None

        return current

    def _normalise_roles(self, raw: Any) -> set[str]:
        if raw is None:
            return set()

        if isinstance(raw, str):
            if "," in raw:
                items = [piece.strip() for piece in raw.split(",")]
            else:
                items = [raw.strip()]
        elif isinstance(raw, (list, tuple, set)):
            items = []
            for value in raw:
                if isinstance(value, str):
                    stripped = value.strip()
                    if stripped:
                        items.append(stripped)
        else:
            items = []

        return {item for item in items if item}

    def _map_roles(self, roles: set[str]) -> set[str]:
        mapped: set[str] = set()
        for role in roles:
            replacements = self._role_mapping.get(role)
            if replacements:
                mapped.update(replacements)
            else:
                mapped.add(role)

        return mapped

    def _normalise_role_mapping(self, mapping: Mapping[str, Any]) -> dict[str, set[str]]:
        normalised: dict[str, set[str]] = {}
        for provider_role, values in mapping.items():
            if isinstance(values, str):
                normalised[str(provider_role)] = {values}
            elif isinstance(values, (list, tuple, set)):
                converted = {str(item).strip() for item in values if isinstance(item, str) and item.strip()}
                if converted:
                    normalised[str(provider_role)] = converted
            else:  # pragma: no cover - ignore unsupported mapping values
                continue

        return normalised

    def _parse_static_jwks(self, raw: str | None) -> dict[str, Mapping[str, Any]]:
        if not raw:
            return {}

        try:
            jwks = json.loads(raw)
        except json.JSONDecodeError as exc:  # pragma: no cover - defensive guard
            raise ValueError("AUTH_JWKS_STATIC must be valid JSON") from exc

        keys = jwks.get("keys", []) if isinstance(jwks, Mapping) else []
        parsed: dict[str, Mapping[str, Any]] = {}

        for key_data in keys:
            if not isinstance(key_data, Mapping):
                continue
            kid = key_data.get("kid")
            if not kid:
                continue
            parsed_key = self._jwk_to_key(key_data)
            if parsed_key:
                parsed[str(kid)] = parsed_key

        return parsed


def _fetch_jwks(url: str, cache_seconds: int) -> dict[str, Any]:
    now = time.monotonic()
    cached = _JWKS_CACHE.get(url)

    if cached and now < cached[0]:
        return cached[1]

    try:
        response = httpx.get(url, timeout=5.0)
        response.raise_for_status()
        jwks = response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(
            status.HTTP_401_UNAUTHORIZED, detail="jwks_fetch_error", headers=WWW_AUTH_HEADER
        ) from exc

    _JWKS_CACHE[url] = (now + cache_seconds, jwks)
    return jwks


def _get_user(
    authorization: Annotated[str | None, Header()] = None,
    settings: Settings = Depends(get_settings),
) -> User:
    return AuthBackend(settings)(authorization)


def require_roles(*required: str):
    async def dependency(user: User = Depends(_get_user)) -> User:
        if not set(required).intersection(user.roles):
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="insufficient_role")
        return user

    return dependency


def reset_security_state() -> None:
    """Clear cached authentication state (intended for testing)."""

    _JWKS_CACHE.clear()
    _JWK_KEY_CACHE.clear()


CurrentUser = Annotated[User, Depends(_get_user)]
