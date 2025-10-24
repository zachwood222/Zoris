# Performance Optimization Plan

This PR adds safe, **additive** scaffolding and configs to improve performance without breaking behavior:

1. FastAPI lifespan scaffold for pooled DB/Redis/S3 clients.
2. Celery tuned config (prefetch=1, acks_late, time limits).
3. SQL indexes for common lookups.
4. Docker Compose example overrides for resource limits.

Wire `app/api/lifespan.py` in your FastAPI app:

```python
from fastapi import FastAPI
from app.api.lifespan import lifespan
app = FastAPI(lifespan=lifespan)
```

See `celery/config.py` for production defaults and override via env vars.

Run `sql/migrations/202404010000_add_indexes.sql` with your migration tool.

Reference `.github/workflows/perf-check.yml` for CI ideas.
