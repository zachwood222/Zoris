# Zoris

Production-grade starter kit replacing STORIS workflows with a FastAPI + Next.js stack.

## Features
- Sales kiosk optimized for Zebra handhelds and DYMO printing
- Inventory, purchase orders, receiving, and bill drafts
- OCR pipeline for handwritten carbon tickets with Celery workers
- Zapier webhooks and QuickBooks stub integration
- Docker Compose orchestration with Postgres, Redis, MinIO, and Nginx proxy

## Installing dependencies

The API stack now ships with pinned dependencies for reproducible installs.

```bash
pip install -r requirements.txt
```

When working on tests or other development tooling install the extended set:

```bash
pip install -r requirements-dev.txt
```

> **Render deployments:** The hosted environment currently defaults to Python
> 3.13, but several upstream libraries in this project do not yet publish wheels
> for that runtime.  Pin the runtime to Python 3.12 by keeping the
> repository's `runtime.txt` file up to date so that `pip install -r
> requirements.txt` succeeds during builds.

> **Connecting the dashboard to FastAPI (Render/hosted builds):** The Next.js
> UI proxies API calls through `/api/*`. Configure either `NEXT_PUBLIC_API_URL`
> (for browser requests) or `API_PROXY_TARGET` (for server-side rewrites) with
> the base URL of your FastAPI deployment, for example
> `https://zoris.onrender.com`. Without one of these environment variables, the
> dashboard falls back to mocked responses and spreadsheet uploads will not
> reach the backend.

## Running locally
See [app/docs/GETTING_STARTED.md](app/docs/GETTING_STARTED.md) for detailed steps.

## Demo data and connectivity checks

Load a lightweight dataset for manual testing by running:

```bash
python -m app.api.sample_data
```

The `/health` endpoint now verifies database connectivity, attempts a Redis
`PING` when a URL is configured, and ensures the demo records above exist. A
successful response includes component flags plus a `sample_data` summary that
lists how many demo vendors, items, customers, and sales are present.

To replace the demo fixtures with real operational data, prepare an XLSX workbook
with `Products`, `Customers`, `Orders`, and `Purchase Orders` sheets and use the
importer CLI:

```bash
python -m app.api.scripts.import_spreadsheet path/to/your_export.xlsx
```

The command uses the same cleaning pipeline as the dashboard upload form,
removes any remaining demo data, and prints a summary of what changed. Add
`--dry-run` to preview the import without committing changes.

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
