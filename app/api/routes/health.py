"""Health endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from redis.exceptions import RedisError
from sqlalchemy import func, select, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import engine, get_session
from ..models import domain
from ..models.base import Base
from ..schemas.common import HealthResponse
from ..services.redis import get_redis_client

router = APIRouter(tags=["health"])


@router.get("/health", response_model=HealthResponse)
async def health(session: AsyncSession = Depends(get_session)) -> HealthResponse:
    fastapi_ok = True
    db_ok = True
    sample_ok = True
    detail: dict[str, object] = {}

    try:
        await session.execute(text("SELECT 1"))
    except SQLAlchemyError as exc:  # pragma: no cover - unexpected in tests
        db_ok = False
        detail["database_error"] = str(exc)
    else:
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        except SQLAlchemyError as exc:  # pragma: no cover - defensive safeguard
            db_ok = False
            detail["database_error"] = str(exc)

    try:
        dataset_totals = {
            "vendors": int(
                await session.scalar(select(func.count(domain.Vendor.vendor_id))) or 0
            ),
            "locations": int(
                await session.scalar(select(func.count(domain.Location.location_id))) or 0
            ),
            "items": int(await session.scalar(select(func.count(domain.Item.item_id))) or 0),
            "customers": int(
                await session.scalar(select(func.count(domain.Customer.customer_id))) or 0
            ),
        }
        detail["dataset"] = dataset_totals
    except Exception as exc:  # pragma: no cover - defensive safeguard
        sample_ok = False
        detail["dataset_error"] = str(exc)

    redis_status: bool | None = None
    client = get_redis_client()
    if client is not None:
        try:
            await client.ping()
            redis_status = True
        except RedisError as exc:
            redis_status = False
            detail["redis_error"] = str(exc)
        except Exception as exc:  # pragma: no cover - defensive safeguard
            redis_status = False
            detail["redis_error"] = str(exc)

    ok = fastapi_ok and db_ok and sample_ok

    return HealthResponse(
        ok=ok,
        fastapi=fastapi_ok,
        database=db_ok,
        redis=redis_status,
        detail=detail,
    )
