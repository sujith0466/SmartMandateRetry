# SmartMandateRetry — Razorpay Capability & Integration Matrix

> **Document ID:** DOC-ARCH-007  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE (Revalidated against official Razorpay developer documentation)  

---

## 1. Capability Verification Matrix

| Capability | Razorpay Support | Official Evidence / Source | SmartMandateRetry Usage | MVP Status | Assumptions | Risks |
|---|---|---|---|---|---|---|
| **Subscription Creation & Plans** | Native Supported | `POST /v1/plans`, `POST /v1/subscriptions` | Pre-requisite for merchant setup; read-only context in SmartMandateRetry. | Verified Read | Plans exist before failure ingestion. | None |
| **Subscription Failure: Pending Event** | Native Supported | Webhook `subscription.pending` fired on charge failure; Razorpay auto-retries once a day for 3 days. | Stage 1 (`PENDING_OBSERVATION`): triggers context lookup & non-conflicting observation. | Verified Ingestion | Ingested via authenticated webhook. | Webhook delay or drop (handled by poller fallback). |
| **Subscription Failure: Halted Event** | Native Supported | Webhook `subscription.halted` fired when all 3 daily retries exhaust. Auto-charges stop. | Stage 2 (`HALTED_RECOVERY`): triggers primary SmartMandateRetry recovery workflow. | Verified Ingestion | Ingested via authenticated webhook. | Subscription cannot be PATCHed while halted; requires payment link or card update. |
| **Individual Payment Failure** | Native Supported | Webhook `payment.failed` with payload `error.reason`, `error.source`, `error.code`, `error.description`. | Failure Intelligence categorization (TEMPORARY vs PERMANENT vs ACTION_REQUIRED). | Verified Ingestion | Error reason string is populated by gateway/bank. | Non-standard or generic bank descriptions (handled by AI fallback). |
| **Payment Settlement Reconciliation** | Native Supported | Webhook `payment.captured`, `payment_link.paid`, `subscription.charged`. | Outcome Verification: marks `RecoveryCase` as `RECOVERED` and attributes recovered revenue. | Verified Ingestion | Settlement webhooks arrive reliably upon customer payment. | Out-of-order webhook delivery (handled by state machine guards). |
| **Out-of-Band Payment Links** | Native Supported | `POST /v1/payment_links` with customer contact prefill, amount, invoice ref, expiry timestamp. | Action Executor: Dispatches dynamic payment link allowing payment via UPI, card, or netbanking. | Verified Mutation | Payment Links API generates distinct payment entity linked via notes/reference_id. | Payment via Link settles invoice but does not automatically swap recurring card token. |
| **Customer Mandate Update** | Native Customer Flow | Razorpay auto-sends hosted card update link upon halt; customer updates mandate in Razorpay UI. | Action Executor: Prompts customer to use Razorpay-hosted update screen for expired cards. | Verified Read/Guide | Customer must self-authenticate card replacement. | Merchant cannot programmatically overwrite card PAN via backend API. |
| **Webhook Signature Verification** | Native Supported | `X-Razorpay-Signature` HMAC-SHA256 computed on raw unparsed request body using Webhook Secret. | Webhook Ingestion Layer: Verifies authenticity of 100% of inbound payloads. | Verified Security | Secret matches dashboard configuration. | JSON parsing before verification corrupts signature (prevented by design). |
| **Test Mode & Failure Simulation** | Native Supported | Razorpay Sandbox (`rzp_test_...`), Mock Bank Page with explicit Success/Failure buttons, Dashboard Webhook Test. | Local integration testing and synthetic scenario validation. | Verified Test | Public HTTPS endpoint available for webhook delivery (via tunnel). | Public webhook delivery requires tunnel (e.g. zrok/reverse proxy). |
| **Idempotency Headers** | Product Specific | Operation-specific headers (`X-Payout-Idempotency`, `X-Refund-Idempotency`); Payment Links rely on `reference_id`. | Action Executor: Generates unique UUID `idempotency_key` and passes `reference_id` to Payment Links API. | Verified Guard | Unique reference prevents double charge. | In-flight duplicate requests (handled by Redis distributed lock). |

---

## 2. Critical Distinction Matrix

| Action Type | Financial / Mandate Impact | Gateway Mechanism | What It IS | What It IS NOT |
|---|---|---|---|---|
| **Razorpay Native Retry** | Automatic charge on existing mandate token during T+1..T+3 days. | Gateway internal scheduler. | Native gateway mandate auto-retry during `pending`. | Not controlled or modified by SmartMandateRetry. |
| **SmartMandateRetry Payment Link Recovery** | Out-of-band one-time payment for outstanding invoice balance. | Razorpay `POST /v1/payment_links` API. | Alternative payment method recovery (UPI, new card, netbanking). | **NOT a mandate retry.** Does not alter stored subscription mandate token. |
| **Customer Mandate Update** | Replaces invalid/expired card token on existing subscription. | Razorpay-hosted customer update checkout. | Customer self-service token refresh. | Not an automated backend card swap. |
| **Manual Escalation** | Alerts merchant operations team. | SmartMandateRetry internal queue. | Human-in-the-loop triage for high-value or low-confidence cases. | Not an automated financial action. |
| **Terminal Stop** | Halts all automated re-engagement. | SmartMandateRetry state machine transition. | Deterministic cessation of automated recovery. | Does not delete subscription history on gateway. |
