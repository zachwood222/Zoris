"""FastAPI entry point."""
from __future__ import annotations

from fastapi import FastAPI

from .config import get_settings
from .routes import api_router

settings = get_settings()

app = FastAPI(title=settings.app_name)
app.include_router(api_router)


@app.get("/")
async def root() -> dict:
    return {"app": settings.app_name}
