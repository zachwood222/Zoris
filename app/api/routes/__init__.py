"""API routers."""
from fastapi import APIRouter

from . import health, config, items, inventory, sales, po, labels, ocr

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(config.router)
api_router.include_router(items.router, prefix="/items", tags=["items"])
api_router.include_router(inventory.router, prefix="/inventory", tags=["inventory"])
api_router.include_router(po.router, prefix="/po", tags=["po"])
api_router.include_router(sales.router, prefix="/sales", tags=["sales"])
api_router.include_router(labels.router, prefix="/labels", tags=["labels"])
api_router.include_router(ocr.router, prefix="/ocr", tags=["ocr"])
