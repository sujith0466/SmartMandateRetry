# SmartMandateRetry — Integration Architecture (Razorpay)

> **Document ID:** DOC-ARCH-004  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## 1. Razorpay API Integration Matrix

All external integration assumptions have been validated against official Razorpay developer documentation:

| Domain Area | API / Webhook | Method | Purpose in SmartMandateRetry |
|---|---|---|---|
| **Webhooks** | `/api/v1/webhooks/razorpay` | `POST` (Inbound) | Receives `payment.failed`, `subscription.pending`, `subscription.halted`, `payment.captured`, `payment_link.paid`. |
| **Verification** | `X-Razorpay-Signature` | Header | HMAC-SHA256 digest calculation over raw request byte stream using webhook secret. |
| **Subscriptions** | `GET /v1/subscriptions/:id` | `GET` | Context retrieval: current status, plan ID, customer ID, total count, paid count. |
| **Invoices** | `GET /v1/invoices/:id` | `GET` | Fetches outstanding invoice amount and line items for failed billing cycle. |
| **Payment Links** | `POST /v1/payment_links` | `POST` | Generates out-of-band recovery payment links for alternative payment methods. |
| **Payments** | `GET /v1/payments/:id` | `GET` | Reconciles detailed payment method and error breakdown. |

---

## 2. Webhook Signature Verification Architecture

```python
# Standard Verification Pattern (HMAC-SHA256)
import hmac, hashlib

def verify_razorpay_signature(raw_body: bytes, signature_header: str, webhook_secret: str) -> bool:
    generated_signature = hmac.new(
        key=webhook_secret.encode('utf-8'),
        msg=raw_body,
        digestmod=hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(generated_signature, signature_header)
```

**Critical Verification Guardrails:**
- Never parse incoming JSON prior to signature validation.
- Reject requests with missing or non-matching signatures with HTTP 400 Bad Request.
- Store raw unparsed payload in `webhook_events` for auditing and replay capabilities.
