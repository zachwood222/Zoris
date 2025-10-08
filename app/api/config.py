"""Application configuration via Pydantic settings."""
from __future__ import annotations

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
    cors_origins: list[str] = Field(
        default_factory=lambda: ["http://localhost:3000"],
        alias="CORS_ORIGINS",
        description="Comma-separated list of origins allowed to call the API.",

        description="Comma-separated list of allowed CORS origins for the API.",
    )

    @field_validator("cors_origins", mode="before")
    @classmethod
    def _split_cors_origins(cls, value: str | list[str]) -> list[str]:
        """Ensure ``cors_origins`` can be provided as comma separated string."""

        if isinstance(value, str):
            return [origin.strip() for origin in value.split(",") if origin.strip()]
    def _split_cors_origins(cls, value: Any) -> Any:
        """Parse a comma separated string of origins into a list."""

        if value is None or value == "":
            return value

        if isinstance(value, str):
            origins = [origin.strip() for origin in value.split(",")]
            return [origin for origin in origins if origin]

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

@lru_cache(1)
def get_settings() -> Settings:
    """Return cached settings instance."""

    return Settings()  # type: ignore[arg-type]
