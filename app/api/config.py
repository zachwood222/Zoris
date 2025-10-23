"""Application configuration via Pydantic settings."""
from __future__ import annotations

import json
import re
from functools import lru_cache
from typing import Any, Literal

from pydantic import AliasChoices, Field, field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central settings object loaded from environment variables."""

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="allow")

    app_name: str = "Zoris API"
    environment: Literal["local", "staging", "production"] = "local"
    database_url: str = Field(
        default="sqlite+aiosqlite:///./zoris.db",
        alias="DATABASE_URL",
        description="SQLAlchemy connection string for the primary database.",
    )
    redis_url: str | None = Field(
        default=None,
        validation_alias=AliasChoices("REDIS_URL", "REDIS_TLS_URL"),
        description="Redis connection string for Celery broker/backend.",
    )
    redis_host: str | None = Field(
        default=None,
        alias="REDIS_HOST",
        description="Redis hostname used when building a URL from discrete parts.",
    )
    redis_port: int | None = Field(
        default=None,
        alias="REDIS_PORT",
        description="Redis port used when building a URL from discrete parts.",
    )
    redis_username: str | None = Field(
        default=None,
        alias="REDIS_USERNAME",
        description="Redis username used when building a URL from discrete parts.",
    )
    redis_password: str | None = Field(
        default=None,
        alias="REDIS_PASSWORD",
        description="Redis password used when building a URL from discrete parts.",
    )
    redis_db: int = Field(
        default=0,
        alias="REDIS_DB",
        description="Redis database index used for Celery broker/backend.",
    )
    redis_use_tls: bool = Field(
        default=False,
        alias="REDIS_USE_TLS",
        description="Whether to require TLS when building the Redis URL.",
    )
    s3_endpoint: str = Field(
        default="http://localhost:9000",
        alias="S3_ENDPOINT",
        description="Endpoint for the S3-compatible object store.",
    )
    s3_access_key: str = Field(
        default="minio",
        alias="S3_ACCESS_KEY",
        description="Access key for the S3-compatible object store.",
    )
    s3_secret_key: str = Field(
        default="miniosecret",
        alias="S3_SECRET_KEY",
        description="Secret key for the S3-compatible object store.",
    )
    s3_bucket: str = Field(
        default="zoris-local",
        alias="S3_BUCKET",
        description="Bucket used for storing uploaded assets.",
    )
    ocr_provider: Literal["tesseract", "textract"] = Field(
        default="tesseract", alias="OCR_PROVIDER"
    )
    zap_ticket_finalized_url: str | None = Field(default=None, alias="ZAP_TICKET_FINALIZED_URL")
    zap_po_received_url: str | None = Field(default=None, alias="ZAP_PO_RECEIVED_URL")
    zap_delivery_completed_url: str | None = Field(default=None, alias="ZAP_DELIVERY_COMPLETED_URL")
    qbo_enabled: bool = Field(default=False, alias="QBO_ENABLED")
    station_pin_rotate_minutes: int = Field(default=1440, alias="STATION_PIN_ROTATE_MINUTES")
    feature_auto_approve_ocr: bool = Field(default=True, alias="AUTO_APPROVE_OCR")
    log_level: str = Field(
        default="INFO",
        alias="LOG_LEVEL",
        description="Base logging level for the application.",
    )
    log_requests: bool = Field(
        default=True,
        alias="LOG_REQUESTS",
        description="Whether to emit structured request/response summaries.",
    )
    log_request_body: bool = Field(
        default=False,
        alias="LOG_REQUEST_BODY",
        description="Whether to include a truncated body preview in request logs.",
    )
    log_startup_summary: bool = Field(
        default=True,
        alias="LOG_STARTUP_SUMMARY",
        description="Log a sanitized summary of key settings during application startup.",
    )
    sqlalchemy_echo: bool = Field(
        default=False,
        alias="SQLALCHEMY_ECHO",
        description="Enable SQLAlchemy engine echo logging for troubleshooting queries.",
    )
    cors_origins: list[str] = Field(
        default_factory=lambda: [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://0.0.0.0:3000",
        ],
        alias="CORS_ORIGINS",
        json_schema_extra={
            "description": "Comma-separated list of allowed CORS origins for the API.",
        },
    )
    auth_provider: Literal["mock", "shared_secret", "jwks"] = Field(
        default="mock",
        alias="AUTH_PROVIDER",
        description="Authentication backend to use for validating API requests.",
    )
    auth_shared_secret: str | None = Field(
        default=None,
        alias="AUTH_SHARED_SECRET",
        description="Shared secret used when AUTH_PROVIDER=shared_secret.",
    )
    auth_algorithms: list[str] | str = Field(
        default_factory=lambda: ["RS256"],
        alias="AUTH_ALGORITHMS",
        description="Allowed JWT signing algorithms.",
    )
    auth_audience: str | None = Field(
        default=None,
        alias="AUTH_AUDIENCE",
        description="Expected JWT audience claim when verifying access tokens.",
    )
    auth_issuer: str | None = Field(
        default=None,
        alias="AUTH_ISSUER",
        description="Expected JWT issuer claim when verifying access tokens.",
    )
    auth_roles_claim: str = Field(
        default="roles",
        alias="AUTH_ROLES_CLAIM",
        description="Claim path (dot notation) containing provider role identifiers.",
    )
    auth_user_id_claim: str = Field(
        default="sub",
        alias="AUTH_USER_ID_CLAIM",
        description="Claim path (dot notation) used for the internal user identifier.",
    )
    auth_role_mapping: dict[str, list[str] | str] = Field(
        default_factory=dict,
        alias="AUTH_ROLE_MAPPING",
        description="JSON object mapping provider roles to internal role names.",
    )
    auth_default_roles: list[str] | str = Field(
        default_factory=list,
        alias="AUTH_DEFAULT_ROLES",
        description="Roles granted to every authenticated user.",
    )
    auth_mock_roles: list[str] | str = Field(
        default_factory=lambda: ["Admin", "Purchasing", "Floor", "AP", "Driver"],
        alias="AUTH_MOCK_ROLES",
        description="Roles assigned by the mock authentication provider.",
    )
    auth_jwks_url: str | None = Field(
        default=None,
        alias="AUTH_JWKS_URL",
        description="JWKS endpoint for fetching signing keys when AUTH_PROVIDER=jwks.",
    )
    auth_jwks_cache_seconds: int = Field(
        default=300,
        alias="AUTH_JWKS_CACHE_SECONDS",
        description="How long JWKS responses are cached in seconds.",
    )
    auth_jwks_static: str | None = Field(
        default=None,
        alias="AUTH_JWKS_STATIC",
        description="Optional JSON string containing a JWKS document used for offline testing.",
    )
    auth_require_exp: bool = Field(
        default=True,
        alias="AUTH_REQUIRE_EXP",
        description="Whether to require the exp claim on incoming JWTs.",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors_origins(cls, value: Any) -> Any:
        """Normalise origin configuration into a list of strings."""

        if value is None or value == "":
            return value

        if isinstance(value, str):
            stripped = value.strip()

            if not stripped:
                return []

            # Support JSON-style configuration such as
            # ``["https://app.example.com", "https://admin.example.com"]``.
            try:
                parsed = json.loads(stripped)
            except json.JSONDecodeError:
                parsed = None
            else:
                if isinstance(parsed, str):
                    parsed = [parsed]
                if isinstance(parsed, (list, tuple)):
                    origins = [str(item).strip() for item in parsed if isinstance(item, str)]
                    return [origin for origin in origins if origin]

            tokens = re.split(r"[,\s]+", stripped)
            origins = [token.strip().strip("\"'") for token in tokens]
            return [origin for origin in origins if origin]

        return value

    @field_validator(
        "auth_algorithms",
        "auth_mock_roles",
        "auth_default_roles",
        mode="before",
    )
    @classmethod
    def _split_str_list(cls, value: Any) -> Any:
        """Allow comma separated strings for list based settings."""

        if value is None:
            return []

        if value == "":
            return []

        if isinstance(value, str):
            items = [item.strip() for item in value.split(",")]
            return [item for item in items if item]

        return value

    @field_validator("log_level", mode="before")
    @classmethod
    def _normalize_log_level(cls, value: Any) -> Any:
        """Normalize configured log level names."""

        if isinstance(value, str):
            return value.upper()

        return value

    @field_validator("auth_role_mapping", mode="before")
    @classmethod
    def _parse_role_mapping(cls, value: Any) -> Any:
        """Parse JSON string role mapping into a dictionary."""

        if value is None or value == "":
            return {}

        if isinstance(value, str):
            try:
                parsed = json.loads(value)
            except json.JSONDecodeError as exc:  # pragma: no cover - defensive
                raise ValueError("AUTH_ROLE_MAPPING must be valid JSON") from exc
            return parsed

        return value

    @model_validator(mode="after")
    def _ensure_redis_url(self) -> "Settings":
        """Populate ``redis_url`` from discrete fields when necessary."""

        if self.redis_url:
            return self

        if self.redis_host:
            scheme = "rediss" if self.redis_use_tls else "redis"
            port = self.redis_port or (6380 if self.redis_use_tls else 6379)
            auth = ""
            if self.redis_username and self.redis_password:
                auth = f"{self.redis_username}:{self.redis_password}@"
            elif self.redis_password and not self.redis_username:
                auth = f":{self.redis_password}@"
            elif self.redis_username:
                auth = f"{self.redis_username}@"
            self.redis_url = f"{scheme}://{auth}{self.redis_host}:{port}/{self.redis_db}"
            return self

        if self.environment == "production":
            raise ValueError(
                "Redis connection details are required. Set REDIS_URL/REDIS_TLS_URL "
                "or the discrete REDIS_* variables so Celery can reach Redis."
            )

        self.redis_url = "redis://localhost:6379/0"
        return self

    @model_validator(mode="after")
    def _validate_auth(self) -> "Settings":
        """Ensure authentication configuration is coherent."""

        if self.environment != "local" and self.auth_provider == "mock":
            raise ValueError("Mock authentication cannot be used outside local environments.")

        if self.auth_provider == "shared_secret" and not self.auth_shared_secret:
            raise ValueError("AUTH_SHARED_SECRET is required when AUTH_PROVIDER=shared_secret.")

        if self.auth_provider == "jwks" and not (self.auth_jwks_url or self.auth_jwks_static):
            raise ValueError(
                "Either AUTH_JWKS_URL or AUTH_JWKS_STATIC must be set when AUTH_PROVIDER=jwks."
            )

        if not self.auth_algorithms:
            raise ValueError("At least one JWT algorithm must be configured via AUTH_ALGORITHMS.")

        return self

@lru_cache(1)
def get_settings() -> Settings:
    """Return cached settings instance."""

    return Settings()  # type: ignore[arg-type]
