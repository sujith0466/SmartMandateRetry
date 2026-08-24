# SmartMandateRetry — Architecture Decision Records (ADR Log)

> **Document ID:** DOC-ARCH-006  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## ADR-001: Backend Framework Selection
- **Status:** APPROVED
- **Context:** Need a robust, lightweight Python web framework capable of high-throughput webhook ingestion and integration with Celery/SQLAlchemy.
- **Decision:** Use **Flask 3.x** with Blueprints and Application Factory pattern.
- **Consequences:** Simple, modular architecture, proven ecosystem compatibility, minimal overhead.

## ADR-002: Relational Database & ORM
- **Status:** APPROVED
- **Context:** High consistency, ACID transactions, and relational integrity required for financial tracking and audit trails.
- **Decision:** Use **PostgreSQL 16** with **SQLAlchemy 2.x** and **Alembic** migrations.
- **Consequences:** Strong relational guarantees, JSONB support for raw event storage, append-only table enforcement.

## ADR-003: Asynchronous Task Queue & Scheduling
- **Status:** APPROVED
- **Context:** Webhook acknowledgment must be sub-250ms. AI calls, policy checks, and delayed recovery schedules must run out-of-band.
- **Decision:** Use **Redis 7** as broker with **Celery 5.x** worker processes.
- **Consequences:** Reliable background execution, countdown-based task scheduling for delayed re-engagement.

## ADR-004: Frontend Architecture
- **Status:** APPROVED
- **Context:** Need a fast, responsive, type-safe operations dashboard.
- **Decision:** Use **React 18 + TypeScript + Vite + Tailwind CSS**.
- **Consequences:** Modern developer experience, type safety across API models, fast hot-reloading.

## ADR-005: AI Gateway & Provider Abstraction via OpenRouter
- **Status:** APPROVED
- **Context:** Prevent lock-in to a single AI provider or model; support flexible, zero-downtime model switching (e.g. Gemini 2.0 Flash, Claude 3.5 Haiku, GPT-4o-mini) with unified OpenAI-compatible schemas.
- **Decision:** Use **OpenRouter** as the unified gateway behind an abstract `LLMProvider` interface. Configure the active model dynamically via `OPENROUTER_MODEL`.
- **Consequences:** Provider or model changes require zero domain code updates; testing can swap in deterministic in-memory mock providers.

## ADR-006: Deterministic Policy Gate Isolation
- **Status:** APPROVED
- **Context:** LLMs are non-deterministic and must not possess financial execution authority.
- **Decision:** Implement the Policy Engine in 100% deterministic Python code with fail-closed gating.
- **Consequences:** Absolute safety guarantee; 100% test coverage achievable on safety rules.

## ADR-007: Single-Merchant MVP with Tenancy Abstraction
- **Status:** APPROVED
- **Context:** Avoid multi-tenant operational overhead during MVP buildathon while ensuring smooth future migration.
- **Decision:** Include `merchant_id` on all database tables and API scopes; default to single active merchant in MVP.
- **Consequences:** Zero multi-tenant complexity for MVP; zero schema refactoring needed when adding multi-tenancy later.

## ADR-008: Dual-Stage Pending/Halted Orchestration
- **Status:** APPROVED
- **Context:** Razorpay provides native auto-retries during `pending` and stops during `halted`.
- **Decision:** Observe and perform early non-conflicting actions during `pending`; execute primary recovery strategy post-`halted`.
- **Consequences:** Zero conflict with Razorpay's native engine; maximal revenue recovery opportunity.
