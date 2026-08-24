# SmartMandateRetry — Inbound Webhook Specification & Event Catalog

> **Document ID:** DOC-API-002  
> **Version:** 1.1.0  
> **Status:** APPROVED BASELINE  
> **Authoritative Sources:** Official Razorpay Webhooks Documentation (`https://razorpay.com/docs/webhooks/`)  

---

## 1. Webhook Ingress Contract

- **Endpoint URL:** `POST /api/v1/webhooks/razorpay`
- **Authentication Header:** `X-Razorpay-Signature` (HMAC-SHA256 calculated over raw unparsed request bytes)
- **Content-Type:** `application/json`
- **Response Expectation:** Immediate HTTP `200 OK` with JSON `{"status": "received", "event_id": "<id>"}` within 250ms.
- **Retry & Redelivery Policy:** Razorpay retries webhook deliveries upon non-2xx responses with exponential backoff (up to 24 hours). The endpoint MUST be idempotent.

```
┌─────────────────┐       POST (Raw JSON + X-Razorpay-Signature)       ┌───────────────────────────────┐
│ Razorpay Engine ├───────────────────────────────────────────────────►│ POST /api/v1/webhooks/razorpay │
└─────────────────┘                                                    └───────────────┬───────────────┘
                                                                                       │
                                                                         1. Raw Body Capture
                                                                         2. HMAC-SHA256 Verifier
                                                                         3. DB-Level Idempotency Check
                                                                         4. WebhookEvent Persistence
                                                                         5. Normalization & Dispatch
                                                                                       │
                                                                                       ▼
                                                                       HTTP 200 {"status":"received"}
```

---

## 2. Webhook Event Catalog (Taxonomy)

### 2.1 SUPPORTED Events (Core Inbound Recovery Pipeline)

| Event Name | Source | Purpose & Downstream Routing | Required Payload Fields | Idempotency Key |
|---|---|---|---|---|
| `subscription.pending` | Razorpay Gateway | Initial recurring charge failure. Creates/updates `RecoveryCase` in `PENDING_OBSERVATION` stage. | `payload.subscription.entity.id`, `account_id`, `created_at` | `event.id` / `event.created_at` |
| `subscription.halted` | Razorpay Gateway | Native retries (T+1..T+3) exhausted. Transitions `RecoveryCase` to `HALTED_RECOVERY` stage. | `payload.subscription.entity.id`, `account_id`, `created_at` | `event.id` / `event.created_at` |
| `payment.failed` | Razorpay Gateway | Extracts error metadata (`error_code`, `error_description`, `error_source`, `error_reason`, `invoice_id`). | `payload.payment.entity.id`, `error_code`, `amount`, `currency` | `payload.payment.entity.id` |
| `payment.captured` | Razorpay Gateway | Auto-charge or mandate settlement succeeded. Reconciles outcome -> Transitions case to `RECOVERED`. | `payload.payment.entity.id`, `amount`, `currency`, `invoice_id` | `payload.payment.entity.id` |
| `payment_link.paid` | Razorpay Gateway | Out-of-band payment link settled by customer. Reconciles outcome -> Transitions case to `RECOVERED`. | `payload.payment_link.entity.id`, `amount_paid`, `reference_id` | `payload.payment_link.entity.id`|
| `subscription.charged`| Razorpay Gateway | Native mandate charge succeeded on recurring cycle. Reconciles outcome -> Transitions case to `RECOVERED`. | `payload.subscription.entity.id`, `payload.payment.entity.id` | `payload.payment.entity.id` |

### 2.2 IGNORED Events (Parsed, Persisted, Logged, No Recovery Mutation)

| Event Name | Handling Action | Rationale |
|---|---|---|
| `subscription.authenticated` | Persist in `webhook_events`, return HTTP 200. | Mandate created/authorized; no failure state. |
| `subscription.activated` | Persist in `webhook_events`, return HTTP 200. | Subscription live; normal lifecycle. |
| `subscription.paused` | Persist in `webhook_events`, return HTTP 200. | Merchant/customer initiated pause; not a failure. |
| `subscription.resumed` | Persist in `webhook_events`, return HTTP 200. | Resumed subscription; normal lifecycle. |
| `invoice.paid` | Persist in `webhook_events`, return HTTP 200. | Redundant with `payment.captured` or `payment_link.paid`. |
| `order.paid` | Persist in `webhook_events`, return HTTP 200. | Handled via underlying payment entity. |

### 2.3 UNSUPPORTED Events (Non-Subscription / Ignored by Ingress Router)

- `transfer.processed`, `settlement.processed`, `refund.processed`, `virtual_account.credited`, `fund_account.validation`
- **Behavior:** Verified for signature, logged at DEBUG level, acknowledged with HTTP `200 OK` to prevent gateway retry loops.

### 2.4 FUTURE Events (Post-MVP Roadmap)

- `subscription.cancelled` (Handle merchant churn analytics)
- `subscription.completed` (Handle end-of-term mandate completion)
- `payment.disputed` (Handle chargeback risk engine)

---

## 3. Normalized Internal Webhook Event Contract

To insulate downstream services from provider-specific payload schemas, all supported webhook events are normalized into a typed `NormalizedWebhookEvent` structure:

```json
{
  "provider": "razorpay",
  "event_id": "evt_rzp_1234567890",
  "event_type": "PAYMENT_FAILED",
  "occurred_at": "2026-08-24T16:30:00Z",
  "merchant_account_id": "acc_rzp_demo_merchant_001",
  "entity_type": "PAYMENT",
  "entity_id": "pay_Kx9281726354",
  "subscription_id": "sub_Kx1234567890",
  "invoice_id": "inv_M982312",
  "amount_inr": "1499.00",
  "currency": "INR",
  "error_metadata": {
    "error_code": "BAD_REQUEST_ERROR",
    "error_description": "The card has insufficient funds",
    "error_source": "customer",
    "error_step": "payment_authorization",
    "error_reason": "insufficient_funds"
  },
  "raw_event_id": "evt_rec_982374982374"
}
```

---

## 4. Ingress Security & Safety Specifications

1. **Signature Verification:**  
   Computed as `hmac_sha256(raw_bytes, secret)`. Evaluated using `hmac.compare_digest()` to prevent timing attacks.
2. **Payload Size Limit:**  
   Strict 1MB limit on request bodies to prevent memory exhaustion attacks.
3. **No Credential Leaks:**  
   Webhook secrets and API keys are strictly excluded from structured logs, error responses, and audit entries.
4. **Idempotent Ingestion Guarantee:**  
   `webhook_events.event_id` unique constraint ensures duplicate HTTP deliveries from Razorpay return HTTP `200 OK` without triggering duplicate downstream processing.
