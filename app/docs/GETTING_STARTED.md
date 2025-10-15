# Getting Started

1. Copy `.env.example` to `.env` and adjust secrets. When running the API outside of
   Docker, install dependencies with `pip install -r requirements-dev.txt` to pick
   up the pinned runtime and test packages.
2. Run `docker compose up --build` from the repository root. This starts:
   - FastAPI at http://localhost:8000
   - Next.js at http://localhost:3000
   - PostgreSQL, Redis, MinIO, and Celery workers
   - Configure browser access to the API with the `CORS_ORIGINS` env var (defaults to `http://localhost:3000`).
3. Run migrations and seed data inside the API container:
   ```bash
   docker compose exec api alembic upgrade head
   docker compose exec api python -m app.api.seed
   ```
   To load only the lightweight demo dataset used by the health check run
   `docker compose exec api python -m app.api.sample_data` instead of the full
   seed script.
4. If your Next.js client runs on a different host, set `CORS_ORIGINS` in `.env` (comma separated) so browsers can call the FastAPI backend. The default allows `http://localhost:3000` for local development.
5. Visit http://localhost:3000 to explore the demo flows. The kiosk page ships with sample inventory and rotating station PIN from `/config`.
