# SmartMandateRetry — Changelog & Revision History

All notable changes to the SmartMandateRetry codebase, specifications, and architecture are documented in this file.

---

## [Phase 2 Complete] - 2026-08-24
### Added
- **SQLAlchemy 2.0 ORM Models:** Implemented declarative type-annotated models for all 11 tables (`merchants`, `recovery_policies`, `webhook_events`, `customers`, `subscriptions`, `recovery_cases`, `recovery_decisions`, `recovery_actions`, `audit_events`, `evaluation_runs`, `evaluation_scenario_results`).
- **Alembic Baseline Migration:** Initialized Alembic migration infrastructure with `001_initial_schema.py` verified bidirectionally (`upgrade head` -> `downgrade base` -> `upgrade head`).
- **Repositories & Unit of Work:** Implemented `UnitOfWork` context manager with atomic transaction management and specialized repositories (`RecoveryCaseRepository` with OCC, `WebhookEventRepository`, `AuditEventRepository`, `MerchantRepository`, `RecoveryPolicyRepository`, etc.).
- **Optimistic Concurrency Control:** Implemented `OptimisticLockError` and version-increment state transitions preventing race conditions during concurrent webhook/recovery processing.
- **Seed Data Factory:** Created deterministic synthetic seed CLI (`python -m app.infrastructure.seed`).
- **Database Test Suite:** Created 12 new database tests covering schema constraints, FK cascades, unique keys, OCC race conditions, UoW commit/rollback, and seed data execution (21 total passing tests).
- **Phase Documentation:** Added `docs/09_Program/PHASE_02_COMPLETION_REPORT.md`.

---

## [v1.0.0-FROZEN] - 2026-08-24
### Baseline Freeze & Foundation Scaffolding
- Initialized repository foundation across `backend/`, `frontend/`, `docker/`, and `shared/`.
- Finalized and froze 37 specifications across product, architecture, domain, API, data, AI, QA, operations, and program management.
- Implemented OpenRouter AI Gateway integration abstraction.
- Built initial health check endpoints, structured logging, and frontend React console shell.
