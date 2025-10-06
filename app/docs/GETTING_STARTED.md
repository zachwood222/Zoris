# Getting Started

1. Copy `.env.example` to `.env` and adjust secrets.
2. Run `docker compose up --build` from the repository root. This starts:
   - FastAPI at http://localhost:8000
   - Next.js at http://localhost:3000
   - PostgreSQL, Redis, MinIO, and Celery workers
3. Run migrations and seed data inside the API container:
   ```bash
   docker compose exec api alembic upgrade head
   docker compose exec api python -m app.api.seed
   ```
4. Visit http://localhost:3000 to explore the demo flows. The kiosk page ships with sample inventory and rotating station PIN from `/config`.
