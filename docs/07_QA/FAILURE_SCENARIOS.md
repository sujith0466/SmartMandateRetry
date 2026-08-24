# SmartMandateRetry — Failure & Chaos Scenarios

> **Document ID:** DOC-QA-003  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## 1. Chaos & Fault Scenarios

| Scenario ID | Fault Injected | Expected System Behavior | Verification Assertion |
|---|---|---|---|
| `FS-001` | Duplicate Webhook Ingestion | Webhook receiver detects duplicate `event_id`. Returns HTTP 200 immediately. | Exactly 1 `RecoveryCase` created; 0 duplicate Celery tasks. |
| `FS-002` | Razorpay API Timeout / 500 Error | Action executor catches HTTP timeout; marks action `RETRY_QUEUED` with exponential backoff. | No orphaned case; audit log captures retry attempt. |
| `FS-003` | LLM Timeout / Invalid JSON | LLM client timeout (3.0s); fallback to deterministic category mapper with default conservative strategy. | Case state remains valid; no crash; fallback audit logged. |
| `FS-004` | Malicious / Hallucinated AI Output | AI recommends an unauthorized action string (e.g., `TRIGGER_DIRECT_REFUND`). | Policy Engine catches schema violation; returns `DENIED`; halts action. |
| `FS-005` | Concurrent Webhook Arrival | Simultaneous `payment.failed` and `payment.captured` on same subscription. | Database row-level locking ensures deterministic terminal state. |
