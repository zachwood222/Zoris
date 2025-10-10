FROM python:3.11-slim

WORKDIR /workspace
COPY pyproject.toml poetry.lock* requirements*.txt* ./
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
