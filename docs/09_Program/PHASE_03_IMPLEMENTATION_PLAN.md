# SmartMandateRetry — Phase 3 Implementation Plan: Razorpay Webhook Integration & Event Ingestion

> **Document ID:** DOC-PROG-014  
> **Phase:** Phase 3 — Razorpay Webhook Integration & Event Ingestion  
> **Status:** PLANNING (Awaiting User Approval)  
> **Authoritative References:**  
> - [`docs/03_API/WEBHOOK_SPECIFICATION.md`](../03_API/WEBHOOK_SPECIFICATION.md) [DOC-API-002]  
> - [`docs/01_Architecture/INTEGRATION_ARCHITECTURE.md`](../01_Architecture/INTEGRATION_ARCHITECTURE.md) [DOC-ARCH-004]  
> - [`docs/01_Architecture/RAZORPAY_CAPABILITY_MATRIX.md`](../01_Architecture/RAZORPAY_CAPABILITY_MATRIX.md) [DOC-ARCH-007]  
> - [`docs/04_Data/DATABASE_DESIGN.md`](../04_Data/DATABASE_DESIGN.md) [DOC-DATA-001]  
> - [`docs/09_Program/PHASE_02_COMPLETION_REPORT.md`](PHASE_02_COMPLETION_REPORT.md) [DOC-PROG-013]  

---

## 1. Phase Objective

Build the reliable, secure, and idempotent inbound event ingestion subsystem through which SmartMandateRetry captures, authenticates, deduplicates, persists, normalizes, and routes incoming Razorpay webhook events.

Phase 3 establishes the **event ingress boundary**. It does NOT implement downstream AI decisions, policy rules, failure categorization, or recovery action dispatching.

```
┌─────────────────────────┐
│     Razorpay Webhook    │
└────────────┬────────────┘
             │ POST /api/v1/webhooks/razorpay (Raw JSON + X-Razorpay-Signature)
             ▼
┌─────────────────────────┐
│   Raw Request Capture   │ (Preserves unparsed bytes before JSON decoding)
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   Signature Verifier    │ (Constant-time HMAC-SHA256 comparison)
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Idempotency & Storage  │ (Atomic insert into PostgreSQL `webhook_events`)
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   Event Normalization   │ (Transforms Razorpay payload to `NormalizedWebhookEvent`)
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│   Ingress Event Router  │ (Routes to Stage 1 / Stage 2 / Settlement / Ignored queues)
└─────────────────────────┘
```

---

## 2. Scope & Strict Non-Scope

### 2.1 Scope of Phase 3
1. **HTTP Ingress Endpoint:** Flask route handler `POST /api/v1/webhooks/razorpay`.
2. **Raw Body Capture:** Framework hook guaranteeing signature check runs over exact wire bytes (`request.get_data(as_text=False)`).
3. **HMAC-SHA256 Verifier:** Constant-time signature verification using `hmac.compare_digest`.
4. **Idempotent Persistence:** Using `WebhookEventRepository.insert_if_not_exists` to prevent duplicate processing on gateway retries.
5. **Event Catalog & Schema Validation:** Strict Pydantic parsing of supported payload structures (`subscription.pending`, `subscription.halted`, `payment.failed`, `payment.captured`, `payment_link.paid`, `subscription.charged`).
6. **Provider-Neutral Normalization:** `RazorpayWebhookAdapter` transforming raw JSON into a standardized `NormalizedWebhookEvent` contract.
7. **Ingress Event Router:** Routing boundary delivering normalized events to downstream interface stubs (without executing business logic).
8. **Observability & Security:** Correlation IDs, structured JSON logging (with secrets redaction), latency metrics, and 1MB request size enforcement.
9. **Comprehensive Webhook Test Suite:** 15+ automated integration tests covering tampering, duplicates, invalid signatures, malformed payloads, and out-of-order deliveries.

### 2.2 Strict Non-Scope (Deferred to Subsequent Phases)
- ❌ Payment failure reason classification or taxonomy categorization (Phase 4).
- ❌ Customer context calculation or historical profile enrichment (Phase 5).
- ❌ OpenRouter / LLM decision prompts or API calls (Phase 6).
- ❌ Deterministic Policy Engine rule evaluation (Phase 7).
- ❌ Payment link creation or Celery recovery task dispatch (Phase 8).
- ❌ Settlement webhook outcome reconciliation logic (Phase 9).
- ❌ State machine transition execution on `recovery_cases` (Phase 10).

---

## 3. Authoritative Razorpay Integration Findings

Verified against official Razorpay developer documentation (`https://razorpay.com/docs/webhooks/`):

1. **Authentication Header:** `X-Razorpay-Signature`.
2. **Signature Algorithm:** `hmac_sha256(raw_request_bytes, webhook_secret)`. Must be computed over raw request body prior to JSON parsing.
3. **Delivery Redeliveries:** Razorpay re-attempts delivery if the server returns non-2xx status or exceeds 5.0s timeout. Re-deliveries occur over a 24-hour exponential backoff window.
4. **Duplicate Handling:** Gateway may send duplicate events under network retries. `event_id` (or `payload.<entity>.entity.id`) uniquely identifies deliveries.
5. **Subscription Failure Lifecycle Events:**
   - `subscription.pending`: First auto-charge failure; gateway native retries scheduled for T+1, T+2, T+3.
   - `subscription.halted`: Native retries exhausted; auto-charging permanently stops.
   - `payment.failed`: Contains detailed error breakdown (`error_code`, `error_description`, `error_source`, `error_step`, `error_reason`).

---

## 4. Ingress Security & Verification Architecture

### 4.1 Raw Body Preservation
In Flask, calling `request.json` can consume or re-serialize JSON, corrupting whitespace and HMAC hashes. Phase 3 enforces:
```python
raw_body: bytes = request.get_data(cache=True, as_text=False)
signature: str = request.headers.get("X-Razorpay-Signature", "")
```

### 4.2 Signature Verifier Boundary
Implemented in `backend/app/infrastructure/webhook_verifier.py`:
```python
class RazorpaySignatureVerifier:
    def __init__(self, secret: str) -> None:
        self._secret = secret.encode("utf-8")

    def verify(self, raw_body: bytes, signature: str) -> bool:
        if not signature or not self._secret:
            return False
        expected = hmac.new(self._secret, raw_body, hashlib.sha256).hexdigest()
        return hmac.compare_digest(expected, signature)
```
- Constant-time comparison protects against timing side-channel attacks.
- Secrets are NEVER logged or echoed in responses.

---

## 5. Idempotency & Persistence Lifecycle

```
[Inbound Webhook HTTP POST]
             │
             ▼
[Signature Verified?] ──(No)──► [Log Warning] ──► Return HTTP 400 {"error": "INVALID_SIGNATURE"}
             │ (Yes)
             ▼
[Insert into `webhook_events`]
             ├── If Duplicate (event_id exists):
             │   └── [Log Duplicate] ──► Return HTTP 200 {"status": "already_processed"} (Idempotent ACK)
             │
             └── If New Record Created:
                 ├── [Normalize to `NormalizedWebhookEvent`]
                 ├── [Dispatch to Ingress Event Router]
                 ├── [Mark processed = True]
                 └── Return HTTP 200 {"status": "received", "event_id": event_id}
```

---

## 6. Provider-Neutral Event Normalization

Defined in `backend/app/domain/normalized_event.py`:

```python
from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Optional

@dataclass(frozen=True)
class NormalizedWebhookEvent:
    provider: str                      # "razorpay"
    event_id: str                      # "evt_rzp_..."
    event_type: str                    # "SUBSCRIPTION_PENDING", "SUBSCRIPTION_HALTED", "PAYMENT_FAILED", "PAYMENT_CAPTURED", etc.
    occurred_at: datetime              # UTC timestamp
    merchant_account_id: str           # "acc_rzp_..."
    entity_type: str                   # "subscription", "payment", "payment_link"
    entity_id: str                     # "sub_...", "pay_...", "plink_..."
    subscription_id: Optional[str]     # Associated subscription ID if present
    invoice_id: Optional[str]          # Associated invoice ID if present
    amount_inr: Optional[Decimal]      # Amount in INR
    currency: str                      # "INR"
    error_metadata: Dict[str, Any]     # Extracted failure reasons/codes
    raw_payload: Dict[str, Any]        # Complete unparsed payload for auditing
```

---

## 7. Error Handling & Gateway Response Matrix

| Scenario | HTTP Response | Body | Persistence Action | Log Level |
|---|---|---|---|---|
| **Valid Supported Event** | `200 OK` | `{"status": "received", "event_id": "..."}` | Persisted in `webhook_events` as processed | INFO |
| **Duplicate Delivery** | `200 OK` | `{"status": "duplicate_ignored"}` | Skipped (existing record preserved) | INFO |
| **Valid Ignored/Unsupported** | `200 OK` | `{"status": "ignored"}` | Persisted for audit/debugging | DEBUG |
| **Missing Signature Header** | `400 Bad Request` | `{"error": "MISSING_SIGNATURE"}` | Not persisted | WARNING |
| **Invalid/Tampered Signature** | `400 Bad Request` | `{"error": "INVALID_SIGNATURE"}` | Not persisted | WARNING |
| **Malformed JSON Body** | `400 Bad Request` | `{"error": "MALFORMED_JSON"}` | Not persisted | WARNING |
| **Oversized Body (>1MB)** | `413 Payload Too Large` | `{"error": "PAYLOAD_TOO_LARGE"}` | Not persisted | WARNING |
| **Database Failure (500)** | `500 Server Error` | `{"error": "INTERNAL_ERROR"}` | Rollback (forces gateway redelivery)| ERROR |

---

## 8. Observability, Telemetry & Privacy

- **Structured Log Fields:**
  - `correlation_id` (UUID generated per request or passed in header)
  - `event_id` (Gateway event identifier)
  - `event_type` (e.g. `subscription.pending`, `payment.failed`)
  - `merchant_account_id`
  - `processing_duration_ms`
  - `signature_valid` (`true`/`false`)
- **Redaction Rules:**
  - `RAZORPAY_WEBHOOK_SECRET` must NEVER appear in logs.
  - Card numbers (PAN), CVVs, and authorization tokens must NEVER appear in log files.

---

## 9. Local Development & Webhook Simulation

To test real webhook delivery locally:
1. Start infrastructure: `docker compose up -d postgres redis backend`.
2. Launch HTTPS reverse tunnel (e.g., `zrok share public http://localhost:5000` or `cloudflared`).
3. Add webhook URL in Razorpay Dashboard (Test Mode): `https://<tunnel-domain>/api/v1/webhooks/razorpay`.
4. Configure Secret in `.env`: `RAZORPAY_WEBHOOK_SECRET=<secret>`.
5. Trigger test events via Razorpay Dashboard or the automated test generator (`python -m app.infrastructure.webhook_simulator`).

---

## 10. Granular Phase 3 Task Breakdown

| Task ID | Epic | Feature | Task Description | Dependencies | Priority | Acceptance Criteria |
|---|---|---|---|---|---|---|
| `TSK-008-01` | Ingestion | Ingress Route | Implement Flask `POST /api/v1/webhooks/razorpay` route handler | Phase 2 | P0 | Accepts POST requests, captures raw bytes, returns structured JSON responses. |
| `TSK-008-02` | Ingestion | Verifier | Implement `RazorpaySignatureVerifier` with constant-time HMAC check | TSK-008-01 | P0 | Verified signatures return True; tampered/missing signatures return False. |
| `TSK-008-03` | Ingestion | Payload Schemas | Define Pydantic models for all supported Razorpay webhook event payloads | TSK-008-01 | P0 | Validates payload fields and types with strict schema validation. |
| `TSK-008-04` | Ingestion | Idempotency | Integrate `WebhookEventRepository.insert_if_not_exists` with UoW | TSK-008-02, 03 | P0 | First delivery inserts; duplicate delivery returns 200 without duplicate rows. |
| `TSK-008-05` | Ingestion | Normalizer | Implement `RazorpayWebhookAdapter` creating `NormalizedWebhookEvent` | TSK-008-03 | P0 | Normalizes `subscription.pending`, `subscription.halted`, `payment.failed`, etc. |
| `TSK-008-06` | Ingestion | Event Router | Implement `IngressEventRouter` dispatching normalized events to stubs | TSK-008-05 | P0 | Routes supported events to handler interfaces; logs ignored/unsupported events. |
| `TSK-008-07` | Ingestion | Error Handling | Implement global webhook error handlers & size limit middleware (1MB) | TSK-008-01 | P0 | Rejects oversized payloads with 413; malformed JSON with 400. |
| `TSK-008-08` | Ingestion | Simulator CLI | Implement `webhook_simulator.py` for local testing & synthetic event generation | TSK-008-05 | P1 | CLI generates validly signed synthetic Razorpay payloads for development. |
| `TSK-008-09` | Ingestion | Observability | Instrument webhook handler with structured logging & latency metrics | TSK-008-01 | P1 | Logs JSON metadata per event; redacts secrets and sensitive fields. |
| `TSK-008-10` | Ingestion | Testing | Comprehensive integration test suite (`tests/test_webhooks/`) | TSK-008-01..09 | P0 | 15+ automated tests passing with 100% verifier & router branch coverage. |

---

## 11. Definition of Done (DoD) for Phase 3

- [ ] Webhook endpoint `POST /api/v1/webhooks/razorpay` operational and responding in < 250ms.
- [ ] Raw request bytes preserved and verified via constant-time HMAC-SHA256.
- [ ] Idempotency verified at database constraint level (`webhook_events.event_id`).
- [ ] Supported event catalog validated against official Razorpay payload shapes.
- [ ] Provider-neutral `NormalizedWebhookEvent` constructed and dispatched via `IngressEventRouter`.
- [ ] Zero secrets logged in structured logs or returned in HTTP error bodies.
- [ ] Full webhook test suite passes with 0 failures (`pytest backend/tests/test_webhooks/`).
- [ ] Quality gates pass (`npm run build`, `python scripts/audit_docs.py`, `python scripts/security_scan.py`, `docker compose config`).
- [ ] Zero Phase 4+ business logic (failure classification, AI calls, recovery orchestration) implemented.

---

## 12. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **JSON Re-serialization Corruption** | Raw request bytes captured explicitly before any JSON decoding or Pydantic parsing. |
| **Webhook Flooding / DoS** | 1MB request body limit and fast-reject on invalid signature before database queries. |
| **Out-of-Order Webhook Delivery** | Webhook layer records raw gateway timestamps (`created_at`); downstream state machines enforce valid transitions. |
