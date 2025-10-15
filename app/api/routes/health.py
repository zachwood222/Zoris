"""Health endpoints."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from redis.exceptions import RedisError
from sqlalchemy import text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.ext.asyncio import AsyncSession

from ..db import get_session
from ..sample_data import ensure_sample_data
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

    try:
        sample_summary = await ensure_sample_data(session)
        detail["sample_data"] = sample_summary.model_dump()
    except Exception as exc:  # pragma: no cover - defensive safeguard
        sample_ok = False
        detail["sample_data_error"] = str(exc)

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
