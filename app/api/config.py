"""Application configuration via Pydantic settings."""
from __future__ import annotations

from functools import lru_cache
from typing import Literal

from pydantic import Field
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Central settings object loaded from environment variables."""

    app_name: str = "Zoris API"
    environment: Literal["local", "staging", "production"] = "local"
    database_url: str = Field(..., alias="DATABASE_URL")
    redis_url: str = Field(..., alias="REDIS_URL")
    s3_endpoint: str = Field(..., alias="S3_ENDPOINT")
    s3_access_key: str = Field(..., alias="S3_ACCESS_KEY")
    s3_secret_key: str = Field(..., alias="S3_SECRET_KEY")
    s3_bucket: str = Field(..., alias="S3_BUCKET")
    ocr_provider: Literal["tesseract", "textract"] = Field(
        default="tesseract", alias="OCR_PROVIDER"
    )
    zap_ticket_finalized_url: str | None = Field(default=None, alias="ZAP_TICKET_FINALIZED_URL")
    zap_po_received_url: str | None = Field(default=None, alias="ZAP_PO_RECEIVED_URL")
    zap_delivery_completed_url: str | None = Field(default=None, alias="ZAP_DELIVERY_COMPLETED_URL")
    qbo_enabled: bool = Field(default=False, alias="QBO_ENABLED")
    station_pin_rotate_minutes: int = Field(default=1440, alias="STATION_PIN_ROTATE_MINUTES")
    feature_auto_approve_ocr: bool = Field(default=True, alias="AUTO_APPROVE_OCR")

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        extra = "allow"


@lru_cache(1)
def get_settings() -> Settings:
    """Return cached settings instance."""

    return Settings()  # type: ignore[arg-type]
