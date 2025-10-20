# STORIS Integration Epic

> Goal: replace demo fixtures with authoritative STORIS data so the dashboard surfaces real operational metrics.

## Phase 0 — Project Setup
- [ ] Confirm access to STORIS sandbox/production environment and credentials.
- [ ] Create shared integration runbook in `app/docs/` for ongoing notes.
- [ ] Schedule cross-team kickoff (data engineering + product analytics) to review scope and dependencies.

## Phase 1 — Document STORIS → Zoris Data Mapping
**Deliverables**: `app/docs/STORIS_IMPORT.md`, appendix diagrams, validation checklist.
- [ ] Inventory STORIS entities (vendors, items, locations, inventory, purchase orders, receivings, customers, sales, tax tables).
- [ ] For each entity, document source tables/fields, transforms, and target SQLAlchemy models.
- [ ] Define key constraints (unique SKU, location+item uniqueness, primary keys) and default behaviors (tax codes, currencies, statuses).
- [ ] Capture sample records and worked examples illustrating transforms (e.g., generating `short_code`).
- [ ] Review mapping doc with stakeholders and secure sign-off.

## Phase 2 — Build STORIS Export Pipeline
**Deliverables**: `scripts/storis/export.py`, configuration template, README updates.
- [ ] Decide export format (JSONL vs CSV) per entity and justify storage layout.
- [ ] Implement authenticated client to pull required fields, handling pagination and rate limits.
- [ ] Normalize data and write entity-specific exports (`vendors.jsonl`, `items.jsonl`, etc.) respecting the mapping contract.
- [ ] Add CLI options for date filters, incremental runs, and output directory.
- [ ] Document environment variables/credentials and add sample `.env.storis` file.
- [ ] Add unit tests/mocks around API client and serialization routines.

## Phase 3 — Import STORIS Export into Zoris Database
**Deliverables**: `app/api/scripts/import_storis.py`, integration tests, logging configuration.
- [ ] Load exports in streaming batches to avoid high memory usage.
- [ ] Upsert vendors, items, locations, inventory, purchase orders, receivings, customers, and sales using idempotent patterns from `ensure_sample_data`.
- [ ] Generate or validate `short_code` fields with `generate_short_code` helper.
- [ ] Wrap entity writes in transactions with retry/backoff on transient errors.
- [ ] Emit structured logs summarizing inserted/updated counts per entity.
- [ ] Provide dry-run flag that performs validation without committing changes.

## Phase 4 — Validate Dashboard Reflects Imported Data
**Deliverables**: Fixture dataset, automated test coverage, QA sign-off.
- [ ] Create representative STORIS fixture covering vendors, inventory, purchase orders, receivings, and sales scenarios.
- [ ] Write API test (`app/api/tests/test_dashboard_storis.py`) that loads fixture, runs importer, and asserts `/dashboard/summary` metrics.
- [ ] Add regression test for edge cases (inactive items, zero-inventory locations, cancelled sales orders).
- [ ] Update onboarding guide with importer command, fixture location, and verification steps.
- [ ] Coordinate manual UAT review with dashboard stakeholders.

## Phase 5 — Operational Readiness
**Deliverables**: Scheduled job plan, monitoring hooks, rollback strategy.
- [ ] Define execution cadence (nightly vs hourly) and schedule job in deployment environment.
- [ ] Integrate monitoring/alerting for export/import failures and data freshness SLA breaches.
- [ ] Document rollback procedures and data reconciliation steps.
- [ ] Train support team on rerunning import and interpreting logs.

---

### Tracking & Milestones
- Milestone A: Mapping document approved (Phase 1 complete).
- Milestone B: Export pipeline delivers full dataset in staging (Phase 2 complete).
- Milestone C: Importer populates staging dashboard with verified metrics (Phases 3–4 complete).
- Milestone D: Automated job live with monitoring and runbook (Phase 5 complete).

Assign owners and due dates to each checklist item in your project tracker to maintain visibility.
