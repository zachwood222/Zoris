"""Application configuration via Pydantic settings."""
from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import AliasChoices, Field
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
    redis_url: str = Field(
        default="redis://localhost:6379/0",
        validation_alias=AliasChoices("REDIS_URL", "REDIS_TLS_URL"),
        description="Redis connection string for Celery broker/backend.",
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

@lru_cache(1)
def get_settings() -> Settings:
    """Return cached settings instance."""

    return Settings()  # type: ignore[arg-type]
