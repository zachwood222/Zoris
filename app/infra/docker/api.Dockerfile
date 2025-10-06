FROM python:3.11-slim

WORKDIR /workspace
COPY pyproject.toml poetry.lock* requirements*.txt* ./
RUN pip install --no-cache-dir fastapi uvicorn[standard] sqlalchemy[asyncio] asyncpg alembic pydantic-settings celery redis boto3 pytesseract pillow httpx
COPY . .
