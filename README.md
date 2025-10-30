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

### Render configuration checklist

When hosting both services on Render, provision **two Web Services**—one for
FastAPI (Python) and one for the Next.js dashboard (Node). Deploy the repository
to each service and configure the following environment variables and build
steps:

#### FastAPI service

- **Runtime & build:** Use the pre-installed Poetry/pip workflow by keeping the
  provided `runtime.txt` (Python 3.12) and set the build command to
  `pip install -r requirements.txt` followed by `alembic upgrade head` in a
  post-deploy command if you want automatic migrations.
- **Core environment:** Supply your `DATABASE_URL`, `REDIS_URL`, any S3
  credentials, and authentication configuration just as you would locally.
- **CORS:** The default configuration now allows requests from any
  `https://*.onrender.com` origin, covering separate dashboard services.
  Add `CORS_ORIGINS` with a comma-separated list if you serve the dashboard from
  a custom domain, or set `CORS_ORIGIN_REGEX=` (empty) to disable the wildcard
  and provide an explicit pattern of your own.
- **Importer uploads:** Ensure the service plan allows file uploads (Render's
  standard Web Service tiers do). No additional settings are required for the
  XLSX importer besides the defaults.

#### Next.js service

- **Build command:** `npm install && npm run build` (the default `render-build.sh`
  script from Next.js templates works as well).
- **Runtime variables:**
  - `NEXT_PUBLIC_API_URL=https://<your-fastapi-service>.onrender.com` so browser
    requests reach the API.
  - `API_PROXY_TARGET=https://<your-fastapi-service>.onrender.com` so Next.js
    API routes proxy uploads and server-rendered data to the backend.
  - Optionally set `API_INTERNAL_URL` to the same value; Render does not expose
    private networking between services, so the public hostname is usually the
    correct target for both browser and server.
- **Auth headers:** Leave the default mock headers in place until you integrate
  a real identity provider. The dashboard will include the mock `Authorization`
  header automatically when no external token is configured.

Redeploy both services after updating the environment variables. Once Render
applies the new settings, spreadsheet uploads from the dashboard will reach the
FastAPI importer without CORS errors.

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
- Override the Celery defaults entirely with `CELERY_BROKER_URL` and
  `CELERY_RESULT_BACKEND` when broker and backend live on different hosts.

When none of the variables above are present Celery falls back to the local
development default (`redis://localhost:6379/0`) so that `docker-compose up`
continues to work out of the box.

If neither option is present the application now fails fast with a clear
configuration error so that you can supply the appropriate Redis endpoint
instead of getting repeated `Connection refused` messages during deployments.
