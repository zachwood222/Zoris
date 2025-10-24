# Getting Started

1. Copy `.env.example` to `.env` and adjust secrets. The sample values default to
   local development services (`postgres://localhost`, `redis://localhost`) so the
   API and web app can talk to the stack started by Docker Compose. When running
   the API outside of Docker, install dependencies with `pip install -r
   requirements-dev.txt` to pick up the pinned runtime and test packages.
2. Run `docker compose up --build` from the repository root. This starts:
   - FastAPI at http://localhost:8000
   - Next.js at http://localhost:3000
   - PostgreSQL, Redis, MinIO, and Celery workers
   - Configure browser access to the API with the `CORS_ORIGINS` env var (defaults to
     the local Next.js host `http://localhost:3000` plus the hosted dashboard origin
     `https://zoris-dashboard.onrender.com`).
   The compose file now exports service-aware environment variables so the API,
   Celery workers, and the Next.js dev server all resolve each other by hostname.
   For example, the web container reads `API_INTERNAL_URL=http://api:8000` while
   exposing `NEXT_PUBLIC_API_URL=http://localhost:8000` to the browser bundle.
3. Run migrations and seed data inside the API container:
   ```bash
   docker compose exec api alembic upgrade head
   docker compose exec api python -m app.api.seed
   ```
   To load only the lightweight demo dataset used by the health check run
   `docker compose exec api python -m app.api.sample_data` instead of the full
   seed script. When you're ready to replace the demo records with your own data,
   prepare an XLSX workbook with `Products`, `Customers`, `Orders`, and
   `Purchase Orders` sheets, then run `docker compose exec api python -m
   app.api.scripts.import_spreadsheet path/to/export.xlsx`.
4. If your Next.js client runs on a different host, set `CORS_ORIGINS` in `.env` (comma separated) so browsers can call the FastAPI backend. The default allows `http://localhost:3000` for local development.
5. Visit http://localhost:3000 to explore the demo flows. The kiosk page ships with sample inventory and rotating station PIN from `/config`.
