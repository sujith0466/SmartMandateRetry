# SmartMandateRetry — Inbound Webhook Specification

> **Document ID:** DOC-API-002  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## 1. Webhook Endpoint Contract

- **URL:** `POST /api/v1/webhooks/razorpay`
- **Authentication:** `X-Razorpay-Signature` Header (HMAC-SHA256)
- **Response Contract:** HTTP 200 OK with `{"status": "received"}` within 250ms.

---

## 2. Supported Inbound Event Types

| Event Name | Source | Handler Action |
|---|---|---|
| `subscription.pending` | Razorpay Gateway | Initial failure detected. Creates `RecoveryCase` in `PENDING_OBSERVATION` stage. |
| `subscription.halted` | Razorpay Gateway | Native retries exhausted. Transitions case to `HALTED_RECOVERY` stage. |
| `payment.failed` | Razorpay Gateway | Extracts error metadata (`reason`, `description`, `source`). |
| `payment.captured` | Razorpay Gateway | Reconciles recovery outcome -> Marks case `RECOVERED`. |
| `payment_link.paid` | Razorpay Gateway | Out-of-band payment link settled -> Marks case `RECOVERED`. |
| `subscription.charged`| Razorpay Gateway | Subscription active cycle settled -> Marks case `RECOVERED`. |

---

## 3. Sample Inbound Payload (`payment.failed`)

```json
{
  "entity": "event",
  "account_id": "acc_00000000000001",
  "event": "payment.failed",
  "contains": ["payment"],
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_Kx9281726354",
        "amount": 149900,
        "currency": "INR",
        "status": "failed",
        "order_id": "order_H8912389",
        "invoice_id": "inv_M982312",
        "error_code": "BAD_REQUEST_ERROR",
        "error_description": "The card has insufficient funds",
        "error_source": "customer",
        "error_step": "payment_authorization",
        "error_reason": "insufficient_funds"
      }
    }
  },
  "created_at": 1787498400
}
```
