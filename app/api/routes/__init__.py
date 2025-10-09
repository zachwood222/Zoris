"""API routers."""
from fastapi import APIRouter

from . import (
    config,
    dashboard,
    health,
    incoming_trucks,
    inventory,
    items,
    labels,
    ocr,
    po,
    sales,
)

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(config.router)
api_router.include_router(items.router, prefix="/items", tags=["items"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
api_router.include_router(po.router, prefix="/po", tags=["po"])
api_router.include_router(sales.router, prefix="/sales", tags=["sales"])
api_router.include_router(labels.router, prefix="/labels", tags=["labels"])
api_router.include_router(ocr.router, prefix="/ocr", tags=["ocr"])
api_router.include_router(
    incoming_trucks.router, prefix="/incoming-trucks", tags=["incoming-trucks"]
)
api_router.include_router(dashboard.router)
