# SmartMandateRetry — Product Requirements Document (PRD)

> **Document ID:** DOC-PROD-002  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## 1. Objectives & Evaluation Goals

### 1.1 Core Objectives
- **OBJ-01:** Ingest and authenticate 100% of successfully delivered Razorpay recurring payment webhooks via HMAC-SHA256 signature verification with zero duplicate processing.
- **OBJ-02:** Measure whether SmartMandateRetry produces statistically and economically meaningful recovery improvement over native fixed-schedule and simple rule-based baselines.
- **OBJ-03:** Maintain **Zero Policy Violations** across all automated actions via an independent, fail-closed deterministic policy engine.
- **OBJ-04:** Provide complete end-to-end auditability and revenue attribution for every recovery decision.

### 1.2 Non-Goals (MVP Exclusions)
- Not a standalone billing engine or subscription creation portal.
- Not a multi-gateway routing platform (strictly scoped to Razorpay for MVP).
- Not an unrestricted autonomous agent executing direct debit mutations.
- Single-merchant architecture for MVP (with clean `merchant_id` domain separation for future multi-tenancy).

---

## 2. Functional Requirements

### 2.1 Webhook & Event Ingestion (FR-ING-xxx)
- **FR-ING-001:** System SHALL expose an HTTPS webhook endpoint `/api/v1/webhooks/razorpay` to ingest `payment.failed`, `subscription.pending`, `subscription.halted`, `subscription.charged`, `payment.captured`, and `payment_link.paid`.
- **FR-ING-002:** System SHALL verify webhook authenticity using HMAC-SHA256 signatures via the `X-Razorpay-Signature` header against the raw unparsed request body.
- **FR-ING-003:** System SHALL enforce idempotency on `event_id`, persisting raw event payloads in an immutable `webhook_events` table before dispatching downstream background tasks.

### 2.2 Payment Failure Intelligence (FR-INT-xxx)
- **FR-INT-001:** System SHALL extract error metadata (`code`, `reason`, `source`, `description`, `step`) from payment failure payloads.
- **FR-INT-002:** System SHALL deterministically map known failure reasons to standardized categories:
  - `insufficient_funds` -> `TEMPORARY` (Liquidity issue)
  - `card_expired` / `expired_card` -> `ACTION_REQUIRED` (Mandate update)
  - `do_not_honour` / `account_closed` -> `PERMANENT` (Hard decline)
  - `gateway_technical_error` / `server_error` -> `TEMPORARY` (Network/Gateway transient)
  - `authentication_failed` -> `ACTION_REQUIRED` (Customer authentication)
- **FR-INT-003:** System SHALL classify unknown/ambiguous error codes using the AI Decision Layer with confidence scoring.

### 2.3 Customer & Mandate Context Engine (FR-CTX-xxx)
- **FR-CTX-001:** System SHALL aggregate historical context per recovery case:
  - Customer lifetime value, tenure, and historical subscription payment success rate.
  - Previous recovery attempts, timestamps, and outcomes within the current billing cycle.
  - Contact frequency (number of notifications/links dispatched to the customer in the last 30 days).
  - Outstanding invoice amount and currency (INR).

### 2.4 AI Recovery Decision Engine (FR-AI-xxx)
- **FR-AI-001:** System SHALL assemble a structured context payload and request a strategy recommendation via an abstracted LLM Provider interfacing with OpenRouter.
- **FR-AI-002:** AI output SHALL strictly adhere to the structured JSON schema containing `failure_class`, `recommended_action`, `delay_hours`, `confidence` (0.0 to 1.0), `reasoning`, and `risk_flags`.
- **FR-AI-003:** Permitted AI-recommended actions are strictly bounded to: `SCHEDULE_RECOVERY_CHECK`, `PAYMENT_LINK_RECOVERY`, `PAYMENT_METHOD_RECOVERY`, `MANUAL_ESCALATION`, and `STOP`.
- **FR-AI-004:** System SHALL automatically route decisions with `confidence < policy.min_confidence_threshold` to `MANUAL_ESCALATION` (Human Review Queue).

### 2.5 Deterministic Policy & Safety Engine (FR-POL-xxx)
- **FR-POL-001:** The Policy Engine SHALL be implemented in 100% deterministic Python code with zero LLM dependencies and SHALL execute in a fail-closed posture.
- **FR-POL-002:** Policy Engine SHALL enforce maximum recovery attempts (`max_retries_per_case`, default: 3 post-halt).
- **FR-POL-003:** Policy Engine SHALL enforce minimum action intervals (`min_retry_interval_hours`, default: 24h).
- **FR-POL-004:** Policy Engine SHALL enforce maximum recovery window duration (`max_recovery_window_days`, default: 14 days).
- **FR-POL-005:** Policy Engine SHALL immediately veto any retry/link actions and enforce `STOP` for `PERMANENT` hard declines (`DO_NOT_HONOUR`, `ACCOUNT_CLOSED`, `FRAUD_BLOCK`).
- **FR-POL-006:** Policy Engine SHALL enforce human review escalation (`REQUIRES_HUMAN_APPROVAL`) for invoice amounts exceeding `high_value_threshold_inr` (default: 10,000 INR).
- **FR-POL-007:** Policy Engine SHALL enforce contact limits (`max_customer_contacts_per_cycle`, default: 3).

### 2.6 Action Execution (FR-ACT-xxx)
- **FR-ACT-001:** Action Executor SHALL execute only approved recovery actions through asynchronous background workers.
- **FR-ACT-002:** `PAYMENT_LINK_RECOVERY` SHALL invoke Razorpay API `POST /v1/payment_links` with customer contact pre-fill, expiry timestamp, reference invoice ID, and notification flags.
- **FR-ACT-003:** `SCHEDULE_RECOVERY_CHECK` SHALL schedule delayed background tasks via Redis/Celery queue.
- **FR-ACT-004:** Every action execution SHALL generate an `idempotency_key` and record an immutable entry in `audit_events`.

### 2.7 Outcome Verification & Measurement (FR-OUT-xxx)
- **FR-OUT-001:** System SHALL reconcile recovery outcomes via inbound webhooks (`payment.captured`, `payment_link.paid`, `subscription.charged`).
- **FR-OUT-002:** When payment succeeds, System SHALL transition case state to `RECOVERED`, record recovered amount, compute time-to-recovery, and release locks.
- **FR-OUT-003:** If a payment link expires or subsequent charge fails, System SHALL transition case back to `DECISION_PENDING` if within policy caps, or `STOPPED`/`ESCALATED` if caps are exhausted.

### 2.8 Merchant Operations Console (FR-UI-xxx)
- **FR-UI-001:** Executive Dashboard displaying Real-time Revenue at Risk, Recovered Revenue, Recovery Rate (%), Recovery Uplift vs Baseline, and Active Cases.
- **FR-UI-002:** Recovery Cases Inbox supporting search, filtering by status/failure category, sort by amount/risk, and manual review action.
- **FR-UI-003:** Case Detail View displaying end-to-end timeline, failure diagnostics, AI proposal, policy validation breakdown, execution logs, and audit trail.
- **FR-UI-004:** Policy Configuration Interface allowing authorized merchants to adjust safety thresholds.
- **FR-UI-005:** Evaluation Lab interface allowing merchants to execute synthetic held-out benchmark runs and view comparative uplift metrics.

---

## 3. Non-Functional Requirements (NFR-xxx)

- **NFR-PERF-001 (Latency):** Webhook ingestion acknowledgment (< 250ms HTTP 200).
- **NFR-PERF-002 (AI Decision Latency):** Asynchronous AI decision resolution < 4.0s (p95).
- **NFR-REL-001 (Idempotency):** 100% deduplication of duplicate webhook events and retry dispatches.
- **NFR-SEC-001 (Zero Direct Financial Control):** LLMs shall not have network access or API credentials for payment gateway mutation endpoints.
- **NFR-SEC-002 (Data Minimization):** No raw card numbers (PAN), CVVs, or bank credentials stored. Only tokenized mandate references, masked identifiers, and transaction metadata.
- **NFR-AUD-001 (Immutability):** The `audit_events` log SHALL be append-only at the application layer.
