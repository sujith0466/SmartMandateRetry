# SmartMandateRetry — Changelog & Revision History

All notable changes to the SmartMandateRetry codebase, specifications, and architecture are documented in this file.

---

## [Phase 15 Complete] - 2026-08-26
### Added
- **Merchant Policy Governance Subsystem:** Implemented `PolicyManagementService` for safe, atomic merchant recovery policy mutation, server-side validation against database check constraints, and deterministic safety change previews.
- **Governance APIs:** Added `PUT /api/v1/policies`, `POST /api/v1/policies/preview`, and `GET /api/v1/policies/history`.
- **Append-Only Governance Audit Trail:** Added `POLICY_CONFIGURATION_UPDATED` to `AuditEventType` recording changed fields, previous states, new states, actors, and correlation IDs.
- **Multi-Step Policy Editor Modal:** Added `PolicyEditorModal.tsx` in React with parameter inputs, field bounds validation, and before/after diff preview with deterministic safety impact alerts.
- **Policy Revision Timeline:** Added chronological revision history timeline in `PoliciesPage.tsx` displaying all policy changes recorded in the audit trail.
- **Case Governance Explanations:** Added policy evaluation decisions breakdown ("Why was this blocked?") to `CaseDetailPage.tsx`.
- **Phase Documentation:** Authored `docs/09_Program/PHASE_15_COMPLETION_REPORT.md`.

---

## [Phase 14 Complete] - 2026-08-26
### Added
- **Dark Fintech Design System:** Established obsidian canvas (`#090D16`), slate glass surfaces (`#0F172A`), emerald recovery glows, and electric violet accents across all 7 console routes.
- **Framer Motion Micro-Interactions:** Added staggered card entrances, page transitions, interactive badge pulses, and timeline progressions with reduced-motion support.
- **Shared UI Toolkit:** Created reusable `Badge`, `StatCard`, `SkeletonLoader`, `PayloadModal`, and `ToastContainer` components.
- **Executive Case Detail Workspace:** Built split-pane layout with interactive recovery lifecycle track, sanitized customer context, execution actions timeline, settlement reconciliation card, and copyable identifiers with instant toast feedback.
- **Visual Safety Policies:** Rebuilt `PoliciesPage.tsx` with high-contrast threshold meters and auto-stop rule badges.
- **Infrastructure Readiness Diagnostics:** Rebuilt `ObservabilityPage.tsx` with live component readiness matrix (PostgreSQL, Redis, OpenRouter) and latency distribution histogram bars.
- **Phase Documentation:** Authored `docs/09_Program/PHASE_14_COMPLETION_REPORT.md`.

---

## [Phase 13 Complete] - 2026-08-26
### Added
- **Merchant Console Frontend:** Built production-quality React/TypeScript/Tailwind CSS console consuming authenticated `/api/v1/*` Merchant APIs.
- **Centralized API Client:** Created typed REST client (`frontend/src/services/api.ts`) supporting `X-Merchant-ID` and `X-Correlation-ID` header injection and structured `ApiError` normalization.
- **Recovery Dashboard:** Implemented `DashboardPage.tsx` with macro revenue KPI cards, recovery success rate, case lifecycle distribution, and system readiness indicators.
- **Recovery Cases Inbox:** Implemented `CasesPage.tsx` with bounded pagination, multi-state filtering, stage filtering, and derived presentation priorities.
- **Case Detail & Lifecycle Progression:** Implemented `CaseDetailPage.tsx` with visual lifecycle progression steps, sanitized customer details, historical actions list, and settlement reconciliation card.
- **Immutable Audit Trail:** Implemented `AuditPage.tsx` with paginated event table, event type filter, and JSON payload inspector modal.
- **Safety Policies View:** Implemented `PoliciesPage.tsx` with read-only visibility into recovery limits and auto-stop safeguards.
- **Analytics & Observability Views:** Implemented `AnalyticsPage.tsx` and `ObservabilityPage.tsx` showing macro conversion metrics, operation timing distributions, and infrastructure health.
- **Phase Documentation:** Authored `docs/09_Program/PHASE_13_COMPLETION_REPORT.md`.

---

## [Phase 12 Complete] - 2026-08-26
### Added
- **Merchant Authentication Decorator:** Implemented `@require_merchant_auth` validating API Keys (`X-API-Key`), Merchant IDs (`X-Merchant-ID`), and Bearer tokens against PostgreSQL.
- **Strict Anti-IDOR Tenant Isolation:** Scoped all case, action, audit, and analytics database queries to `merchant_id == g.merchant_id` with 404 resource-enumeration defense.
- **Recovery Cases REST API:** Implemented `GET /api/v1/cases` (bounded pagination $1 \le \text{limit} \le 100$, state filtering), `GET /api/v1/cases/<case_id>` (deep case, customer, and subscription context), and `GET /api/v1/cases/<case_id>/actions`.
- **Settlement Reconciliation REST API:** Implemented `GET /api/v1/cases/<case_id>/reconciliation` exposing authoritative settlement status without mutation risk.
- **Safety Policies & Analytics REST APIs:** Implemented `GET /api/v1/policies` and `GET /api/v1/analytics/overview`.
- **Append-Only Audit REST API:** Implemented `GET /api/v1/audit-events` with deep PII/credential sanitization.
- **Correlation ID Middleware:** Integrated Flask `before_request` and `after_request` hooks for `X-Correlation-ID` capture and propagation.
- **Phase 12 Test Suite:** Created 14 unit, auth, IDOR, and REST integration tests (**166 total passing backend tests** with 91% overall coverage).
- **Phase Documentation:** Authored `docs/09_Program/PHASE_12_COMPLETION_REPORT.md`.

---

## [Phase 11 Complete] - 2026-08-26
### Added
- **Observability Contracts & Constants:** Defined `AuditEventType` (12 authoritative lifecycle events), `MetricName`, and `LogLevel` enums.
- **Recursive PII & Secret Redactor:** Implemented `sanitize_data`, `mask_email`, and `mask_phone` preventing leaks of passwords, API keys, webhook secrets, tokens, PAN, and CVV across telemetry.
- **Correlation ID Context Manager:** Implemented `CorrelationContext`, `get_correlation_id`, `set_correlation_id`, and `generate_correlation_id` propagating correlation context from webhook to settlement.
- **Enhanced Structured JSON Logging:** Upgraded `JSONFormatter` with automated context-local correlation ID injection and deep dictionary sanitization.
- **Centralized In-Memory Metrics Collector:** Built thread-safe `MetricsRegistry` supporting counters, gauges, and latency histograms with `sanitize_labels` stripping high-cardinality keys.
- **Timing Instrumentation:** Built `timed_operation` context manager providing non-blocking execution duration measurements with exception tolerance.
- **Operational Summary & Health Hardening:** Added operational KPI summary service (`ObservabilityService`) and endpoints (`/healthz`, `/readyz`, `/metrics`, `/observability/summary`).
- **Phase 11 Test Suite:** Created 13 unit and integration tests across sanitizer, logging, metrics, timers, and health endpoints (**152 total passing backend tests** with 91% overall coverage).
- **Phase Documentation:** Authored `docs/09_Program/PHASE_11_COMPLETION_REPORT.md`.

---

## [Phase 10 Complete] - 2026-08-26
### Added
- **Formal State Machine Contracts:** Formalized `CaseState` enum, `TERMINAL_STATES` (`RECOVERED`, `STOPPED`, `EXPIRED`), `VALID_TRANSITIONS` lifecycle matrix, and `StateTransitionResult` schema.
- **State Transition Validator:** Built `StateTransitionValidator` validating state transitions against the formal lifecycle graph and rejecting invalid transitions with `InvalidStateTransitionError` and terminal violations with `TerminalStateError`.
- **Cross-Aggregate Consistency Guard:** Built `CrossAggregateConsistencyGuard` guaranteeing invariants between `RecoveryCase` and `RecoveryAction` aggregates (such as rejecting active actions on `STOPPED` cases).
- **Centralized State Transition Service:** Implemented `StateTransitionService` providing atomic lifecycle updates with UnitOfWork boundaries, OCC version checks, `ALREADY_APPLIED` idempotent duplicate no-op returns, and append-only `RECOVERY_STATE_TRANSITIONED` audit event logging in PostgreSQL.
- **Concurrency & Race Test Suite:** Implemented unit, concurrency, and integration tests for OCC conflict detection, stale worker rejection, Celery vs. webhook race resolution, and terminal state immutability (**139 total passing backend tests** with 92% overall coverage).
- **Phase Documentation:** Authored `docs/09_Program/PHASE_10_COMPLETION_REPORT.md`.

---

## [Phase 9 Complete] - 2026-08-26
### Added
- **Reconciliation Domain Schemas:** Defined `PaymentOutcome` (`PAYMENT_SUCCEEDED`, `PAYMENT_FAILED`, `PAYMENT_PENDING`, `PAYMENT_NOT_FOUND`, `PAYMENT_CANCELLED`, `UNKNOWN`), `ReconciliationStatus` (`RECONCILED`, `PENDING_VERIFICATION`, `MISMATCH`, `FAILED`, `DUPLICATE_IGNORED`, `UNKNOWN`), `ReconciliationEvidence`, and `ReconciliationResult` typed domain contracts with serialization.
- **Correlation Engine:** Built `CorrelationEngine` with prioritized multi-key matching (`plink_id` > `invoice_id` > `subscription_id` > `payment_id`).
- **Reconciliation Engine:** Built `ReconciliationEngine` enforcing exact Decimal amount matching, currency matching, duplicate ignoring, and late-failure rejection on `RECOVERED` cases.
- **Reconciliation Service:** Implemented `ReconciliationService` orchestrating UnitOfWork transactions, transitioning `RecoveryCase` to `RECOVERED` (`recovered_amount_inr`, `resolved_at`), updating `RecoveryAction` to `RECONCILED`, and recording append-only `AuditEvent` (`PAYMENT_OUTCOME_RECONCILED`, `PAYMENT_OUTCOME_FAILED`, `PAYMENT_OUTCOME_MISMATCH`, `PAYMENT_OUTCOME_UNKNOWN`).
- **Direct Gateway Polling Fallback:** Enhanced `RazorpayClient` with `fetch_payment` and `fetch_payment_link` providing direct status check fallbacks with timeout and error protection.
- **Phase 9 Test Suite:** Created 19 unit, integration, and idempotency tests across schemas, outcome mapping, correlation hierarchy, and database persistence (**128 total passing backend tests** with 91% overall coverage).
- **Phase Documentation:** Authored `docs/09_Program/PHASE_09_COMPLETION_REPORT.md`.

---

## [Phase 8 Complete] - 2026-08-26
### Added
- **Action Execution Domain Contracts:** Defined `ActionExecutionRequest`, `ActionExecutionResult`, and `ActionExecutionStatus` (`PENDING`, `EXECUTED`, `SCHEDULED`, `BLOCKED`, `FAILED`, `NOT_SUPPORTED`, `SKIPPED`) domain contracts.
- **Base Recovery Adapter Interface:** Built `BaseRecoveryAdapter` standardizing action execution signatures across all strategies.
- **Schedule Recovery Adapter:** Implemented `ScheduleRecoveryAdapter` enforcing Phase 7 `adjusted_delay_hours` and dispatching asynchronous Celery countdown tasks.
- **Payment Link Recovery Adapter:** Implemented `PaymentLinkAdapter` interfacing with `RazorpayClient` (paise conversion, customer prefill, error and timeout handling).
- **Payment Method Recovery Adapter:** Implemented `PaymentMethodAdapter` safely returning `NOT_SUPPORTED` without fabricating unsupported gateway APIs or handling card details.
- **Manual Escalation Adapter:** Implemented `ManualEscalationAdapter` routing cases to operator queue with audit references and zero financial side effects.
- **Stop Recovery Adapter:** Implemented `StopRecoveryAdapter` terminating recovery cycles without re-scheduling.
- **Action Dispatcher:** Built `ActionDispatcher` with a fail-closed guard preventing any external call when `execution_allowed == False`.
- **Recovery Execution Service & Audit Trail:** Implemented `RecoveryExecutionService` with UnitOfWork isolation, database idempotency cache checks (`phase8:{case_id}:{policy_decision_id}:{action}`), and `AuditEvent` recording (`RECOVERY_ACTION_EXECUTED`, `RECOVERY_ACTION_SCHEDULED`, `RECOVERY_ACTION_BLOCKED`, `RECOVERY_ACTION_FAILED`).
- **Phase 8 Test Suite:** Built 11 unit, integration, and idempotency tests across adapters, dispatcher, and database persistence (109 total passing backend tests with 91% overall coverage).
- **Phase Documentation:** Authored `docs/09_Program/PHASE_08_COMPLETION_REPORT.md`.

---

## [AI Provider Hardening Complete] - 2026-08-26
### Added
- **Free Model Registry & Discovery:** Built `FreeModelRegistry` dynamically querying OpenRouter `/api/v1/models` and enforcing strict $0.00 cost filters (`input_price == 0` and `output_price == 0`).
- **Free-Only Safety Guard:** Enforced runtime pre-call assertion rejecting any non-free model invocation.
- **Dynamic Failover & Rotation:** Implemented multi-model rotation across healthy free models upon 429 rate limits, 5xx server errors, or timeouts.
- **Model Health & Cooldown Engine:** Implemented `ModelHealth` with temporary cooldowns upon transient failures.
- **Deterministic Offline Mock:** Preserved offline `MockLLMProvider` for unit tests and CI without external API consumption.
- **Catalog Snapshot & Hardening Report:** Authored `docs/09_Program/FREE_MODEL_CATALOG.md` and `docs/09_Program/AI_PROVIDER_HARDENING_REPORT.md`.

---

## [Phase 7 Complete] - 2026-08-26
### Added
- **Policy Decision Contract:** Defined `PolicyDecision` domain model and `PolicyStatusEnum` (`ALLOWED`, `MODIFIED`, `BLOCKED`) with complete dictionary serialization.
- **Prioritized Policy Rule Registry:** Built `PolicyRuleRegistry` implementing 8 declarative deterministic safety rules ordered by precedence.
- **Hard Decline Safety Veto (POL-RULE-001):** Enforced fail-closed `STOP` veto for all permanent declines (`DO_NOT_HONOUR`, `ACCOUNT_CLOSED`, `FRAUD_BLOCK`, etc.) with zero exceptions.
- **Terminal State & Expiration Gate (POL-RULE-004):** Implemented check blocking recovery on already resolved or expired ($>14\text{d}$) cases.
- **Max Retries Cap (POL-RULE-002):** Enforced merchant retry attempt limits (default: 3).
- **High-Value Exposure Gate (POL-RULE-006):** Deterministically modified automated actions to `MANUAL_ESCALATION` for invoices exceeding 10,000 INR.
- **Low AI Confidence Gate (POL-RULE-005):** Modified actions with AI confidence $< 0.75$ to `MANUAL_ESCALATION`.
- **Contact Frequency Protection (POL-RULE-007):** Prevented customer spamming when cycle contact limit (default: 3) is reached.
- **Strategy & Stage Compatibility Enforcer (POL-RULE-008):** Guaranteed action-to-stage and action-to-taxonomy compatibility.
- **Minimum Interval Floor (POL-RULE-003):** Automatically extended short delay proposals to merchant minimum interval (default: 24h).
- **Policy Engine Service & Audit Trail:** Implemented `PolicyEngineService` recording append-only `AuditEvent` (`POLICY_DECISION_EVALUATED`) in PostgreSQL with UnitOfWork isolation.
- **Phase 7 Test Suite:** Built 12 unit and integration tests across rules, precedence, evaluator engine, and database persistence (91 total passing backend tests with 90% overall coverage).
- **Phase Documentation:** Authored `docs/09_Program/PHASE_07_COMPLETION_REPORT.md`.

---

## [Phase 6 Complete] - 2026-08-26
### Added
- **AI Decision Output & Result Contracts:** Defined `AIDecisionOutput` (Pydantic model) and `AIDecisionResult` domain contracts supporting 5 failure classes and 5 recommended recovery actions with delay/confidence bounds.
- **AIPromptBuilder:** Implemented versioned system prompt (`1.0.0`) and structured user prompt consuming sanitized `CustomerRecoveryContext` (zero PII, zero credentials).
- **OpenRouter Provider & Mock Provider:** Updated `OpenRouterProvider` with JSON mode, authentication headers, and 5s timeout, alongside `MockLLMProvider` for deterministic offline testing.
- **AIDecisionValidator:** Implemented strict schema validation for raw LLM dictionary responses.
- **AIRiskEvaluator:** Implemented contextual risk evaluator computing `LOW_CONFIDENCE`, `HIGH_VALUE_EXPOSURE`, `CONSECUTIVE_FAILURES_HIGH`, and `HARD_DECLINE_SUSPECTED`.
- **FallbackDecisionEngine:** Built deterministic safe fallback routing hard declines to `STOP` (confidence 1.00) and timeouts/errors/low confidence ($<0.75$) to `MANUAL_ESCALATION` (confidence 0.50).
- **AIDecisionEngine & AIDecisionService:** Implemented orchestration engine and service layer persisting `RecoveryDecision` in PostgreSQL with UnitOfWork isolation and logging append-only `AuditEvent` (`AI_DECISION_PRODUCED`).
- **Phase 6 Test Suite:** Built 13 unit and integration tests across prompts, schemas, validators, risk evaluators, engines, and persistence (79 total passing backend tests with 89% overall coverage).
- **Phase Documentation:** Authored `docs/09_Program/PHASE_06_COMPLETION_REPORT.md`.

---

## [Phase 5 Complete] - 2026-08-26
### Added
- **Customer Recovery Context Contract:** Defined `CustomerRecoveryContext`, `CaseContext`, `SubscriptionContext`, `CustomerProfileContext`, `PaymentHistoryContext`, `RecoveryHistoryContext`, and `DataQualityContext` domain models with full serialization.
- **Context Sanitizer:** Built `ContextSanitizer` providing deterministic PII masking (emails `j***e@example.com`, phone numbers `+91******3210`) and sensitive key scrubbing.
- **Derived Metric Calculator:** Built `DerivedMetricCalculator` computing payment success rates, recovery success rates, confidence tiers (`HIGH`, `LOW`, `INSUFFICIENT`), and age metrics.
- **Payment & Recovery History Aggregators:** Implemented `HistoryAggregator` analyzing lifetime subscription cycles, 30-day failure recency, consecutive failure streaks, and prior recovery interventions.
- **Customer Context Builder & Quality Evaluator:** Built `CustomerContextBuilder` with graceful Razorpay API enrichment fallback and `DataQualityEvaluator` computing completeness scores.
- **Customer Context Service & Audit Trail:** Implemented `CustomerContextService` with UnitOfWork isolation, logging append-only `AuditEvent` (`CUSTOMER_CONTEXT_AGGREGATED`) in PostgreSQL.
- **Phase 5 Test Suite:** Built 16 unit and integration tests across sanitizers, metrics, history aggregators, context builder, and service layer (66 total passing backend tests with 87% overall coverage).
- **Phase Documentation:** Authored `docs/09_Program/PHASE_05_COMPLETION_REPORT.md`.

---

## [Phase 4 Complete] - 2026-08-26
### Added
- **Failure Evidence Extractor:** Implemented `FailureEvidenceExtractor` safely parsing and sanitizing gateway error metadata.
- **Provider-Neutral Failure Taxonomy:** Defined `FailureCategory` (`TEMPORARY_LIQUIDITY`, `TEMPORARY_TECHNICAL`, `ACTION_REQUIRED_INSTRUMENT`, `ACTION_REQUIRED_AUTH`, `PERMANENT_HARD_DECLINE`, `UNKNOWN_AMBIGUOUS`), `Recoverability`, and `Severity` enums.
- **Declarative Rule Registry:** Implemented `FailureRuleRegistry` mapping 20+ Razorpay error reasons deterministically with description keyword fallbacks and composite error matching.
- **Deterministic Confidence Calculator:** Built confidence scoring engine assigning reproducible scores from $0.50$ to $1.00$.
- **Structured Failure Assessment:** Created immutable `FailureAssessment` domain contract with versioning (`1.0.0`) and explainable evidence dictionary.
- **Failure Intelligence Service:** Implemented `FailureIntelligenceService` updating `RecoveryCase.failure_category`/`failure_code` and recording append-only `AuditEvent` (`PAYMENT_FAILURE_CLASSIFIED`).
- **Failure Intelligence Test Suite:** Created 13 unit and integration tests across extractor, rule registry, classifier, and E2E webhook pipeline (50 total passing backend tests with 100% rule branch coverage).

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
