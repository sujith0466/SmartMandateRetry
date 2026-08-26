# SmartMandateRetry — Changelog & Revision History

All notable changes to the SmartMandateRetry codebase, specifications, and architecture are documented in this file.

---

## [Phase 4 Complete] - 2026-08-26
### Added
- **Failure Evidence Extractor:** Implemented `FailureEvidenceExtractor` safely parsing and sanitizing gateway error metadata.
- **Provider-Neutral Failure Taxonomy:** Defined `FailureCategory` (`TEMPORARY_LIQUIDITY`, `TEMPORARY_TECHNICAL`, `ACTION_REQUIRED_INSTRUMENT`, `ACTION_REQUIRED_AUTH`, `PERMANENT_HARD_DECLINE`, `UNKNOWN_AMBIGUOUS`), `Recoverability`, and `Severity` enums.
- **Declarative Rule Registry:** Implemented `FailureRuleRegistry` mapping 20+ Razorpay error reasons deterministically with description keyword fallbacks and composite error matching.
- **Deterministic Confidence Calculator:** Built confidence scoring engine assigning reproducible scores from $0.50$ to $1.00$.
- **Structured Failure Assessment:** Created immutable `FailureAssessment` domain contract with versioning (`1.0.0`) and explainable evidence dictionary.
- **Failure Intelligence Service:** Implemented `FailureIntelligenceService` updating `RecoveryCase.failure_category`/`failure_code` and recording append-only `AuditEvent` (`PAYMENT_FAILURE_CLASSIFIED`).
- **Failure Intelligence Test Suite:** Created 13 unit and integration tests across extractor, rule registry, classifier, and E2E webhook pipeline (**50 total passing backend tests** with 100% rule branch coverage).
- **Phase Documentation:** Created `docs/09_Program/PHASE_04_COMPLETION_REPORT.md`.

---

## [Phase 3 Complete] - 2026-08-24
### Added
- **Webhook Ingress Route:** Implemented `POST /api/v1/webhooks/razorpay` endpoint capturing raw unparsed request bytes prior to JSON decoding.
- **Constant-Time Signature Verifier:** Implemented `RazorpaySignatureVerifier` with constant-time `hmac.compare_digest` for HMAC-SHA256 verification.
- **Pydantic Webhook Schemas:** Implemented strict models (`RazorpayWebhookEnvelope`, `RazorpayPaymentEntity`, `RazorpaySubscriptionEntity`, `RazorpayPaymentLinkEntity`).
- **Database Idempotency Integration:** Wired `WebhookIngestionService` with `WebhookEventRepository.insert_if_not_exists` to acknowledge duplicate gateway deliveries safely with HTTP 200 without duplicate execution.
- **Normalization Adapter:** Created `RazorpayWebhookAdapter` converting raw payloads into standardized `NormalizedWebhookEvent` dataclasses with paise-to-INR conversions.
- **Ingress Event Router:** Implemented `IngressEventRouter` routing events to Stage 1 observation, Stage 2 recovery, failure intelligence, outcome verification, or ignored queues.

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
