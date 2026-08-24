# SmartMandateRetry — Changelog & Revision History

All notable changes to the SmartMandateRetry codebase, specifications, and architecture are documented in this file.

---

## [Phase 3 Complete] - 2026-08-24
### Added
- **Webhook Ingress Route:** Implemented `POST /api/v1/webhooks/razorpay` endpoint capturing raw unparsed request bytes prior to JSON decoding.
- **Constant-Time Signature Verifier:** Implemented `RazorpaySignatureVerifier` with constant-time `hmac.compare_digest` for HMAC-SHA256 verification.
- **Pydantic Webhook Schemas:** Implemented strict models (`RazorpayWebhookEnvelope`, `RazorpayPaymentEntity`, `RazorpaySubscriptionEntity`, `RazorpayPaymentLinkEntity`).
- **Database Idempotency Integration:** Wired `WebhookIngestionService` with `WebhookEventRepository.insert_if_not_exists` to acknowledge duplicate gateway deliveries safely with HTTP 200 without duplicate execution.
- **Normalization Adapter:** Created `RazorpayWebhookAdapter` converting raw payloads into standardized `NormalizedWebhookEvent` dataclasses with paise-to-INR conversions.
- **Ingress Event Router:** Implemented `IngressEventRouter` routing events to Stage 1 observation, Stage 2 recovery, failure intelligence, outcome verification, or ignored queues.
- **Synthetic Webhook Simulator:** Built CLI simulator `app.infrastructure.webhook_simulator` for local developer testing and automated integration testing.
- **Observability & Logging Redaction:** Upgraded structured logger adapter with automatic secret and credential redaction.
- **Webhook Test Suite:** Authored 16 new unit and integration tests across verifier, adapter, router, and HTTP endpoints (**37 total passing backend tests**).
- **Phase Documentation:** Created `docs/09_Program/PHASE_03_COMPLETION_REPORT.md`.

---

## [Phase 2 Complete] - 2026-08-24
### Added
- **SQLAlchemy 2.0 ORM Models:** Implemented declarative type-annotated models for all 11 tables.
- **Alembic Baseline Migration:** Initialized Alembic migration infrastructure with `001_initial_schema.py`.
- **Repositories & Unit of Work:** Implemented `UnitOfWork` and repositories with optimistic concurrency control.
- **Seed Data Factory:** Created deterministic synthetic seed CLI (`python -m app.infrastructure.seed`).
- **Database Test Suite:** Created 12 database tests covering schema constraints and OCC race conditions.

---

## [v1.0.0-FROZEN] - 2026-08-24
### Baseline Freeze & Foundation Scaffolding
- Initialized repository foundation across `backend/`, `frontend/`, `docker/`, and `shared/`.
- Finalized and froze 37 specifications across product, architecture, domain, API, data, AI, QA, operations, and program management.
- Implemented OpenRouter AI Gateway integration abstraction.
- Built initial health check endpoints, structured logging, and frontend React console shell.
