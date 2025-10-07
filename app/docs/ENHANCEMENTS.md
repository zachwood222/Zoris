# Enhancement Opportunities

## API & Workers
- **Asynchronous OCR ingestion.** `app/api/routes/ocr.py` currently performs OCR parsing and file uploads inline during the request lifecycle, which blocks the client while Celery is idle. Pushing the heavy lifting into a Celery task with progress polling would improve responsiveness and keeps compute near the worker tier.
- **Add Redis-aware health checks.** Extend the existing `/health` route in `app/api/routes/health.py` to verify connectivity to Redis and the SQL database. Surfacing broker failures early prevents silent Celery outages.
- **Structured task instrumentation.** `app/api/workers/__init__.py` wires Celery with only the default queue. Adding task-level retry policies, logging, and metrics emission (e.g., OpenTelemetry events) would harden long-running OCR jobs.

## Front-end
- **Centralize API access.** Pages such as `app/web/app/kiosk/page.tsx` make ad-hoc Axios calls and manually stitch together URLs. Introducing a typed API client with environment-aware configuration would reduce repetition and improve error handling.
- **Expand end-to-end coverage.** Only `app/web/tests/home.spec.ts` exists today. Capturing kiosk checkout flows and OCR review workflows in Playwright will guard against regressions in the new theme and future UX changes.

## Infrastructure
- **Managed Redis defaults.** With the new Redis configuration options, add environment templates for common hosts (e.g., Render, Upstash) and document TLS certificate expectations. Pairing this with automated smoke tests ensures Celery boots successfully after deploys.
