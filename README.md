# Zoris

Production-grade starter kit replacing STORIS workflows with a FastAPI + Next.js stack.

## Features
- Sales kiosk optimized for Zebra handhelds and DYMO printing
- Inventory, purchase orders, receiving, and bill drafts
- OCR pipeline for handwritten carbon tickets with Celery workers
- Zapier webhooks and QuickBooks stub integration
- Docker Compose orchestration with Postgres, Redis, MinIO, and Nginx proxy

## Running locally
See [app/docs/GETTING_STARTED.md](app/docs/GETTING_STARTED.md) for detailed steps.

## Configuring Celery connectivity

Celery relies on Redis for both its broker and result backend. When deploying to
platforms such as Render you must point the workers at a managed Redis
instance—`localhost:6379` is only available when running the full stack with
Docker Compose. Configure the connection via one of the following environment
variable sets:

- Provide a single `REDIS_URL` (or `REDIS_TLS_URL`) environment variable.
- Or provide discrete parts such as `REDIS_HOST`, `REDIS_PORT`,
  `REDIS_USERNAME`, `REDIS_PASSWORD`, `REDIS_DB`, and `REDIS_USE_TLS=true`.

If neither option is present the application now fails fast with a clear
configuration error so that you can supply the appropriate Redis endpoint
instead of getting repeated `Connection refused` messages during deployments.
