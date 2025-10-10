"""Config endpoints."""
from datetime import timedelta

from fastapi import APIRouter

from ..config import get_settings
from ..schemas.common import ConfigResponse, StationPinResponse
from ..utils.datetime import utc_now

router = APIRouter(tags=["config"])


@router.get("/config", response_model=ConfigResponse)
async def config() -> ConfigResponse:
    settings = get_settings()
    return ConfigResponse(
        ocr_provider=settings.ocr_provider,
        dymo_enabled=True,
        short_code_length=4,
        station_pin_rotate_minutes=settings.station_pin_rotate_minutes,
    )


@router.get("/station-pin", response_model=StationPinResponse)
async def station_pin() -> StationPinResponse:
    settings = get_settings()
    expires_at = utc_now() + timedelta(minutes=settings.station_pin_rotate_minutes)
    pin = "1234"
    return StationPinResponse(pin=pin, expires_at=expires_at)
