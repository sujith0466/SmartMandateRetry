# SmartMandateRetry — Observability & Monitoring

> **Document ID:** DOC-OPS-001  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## 1. Structured Logging Standard

All logs are emitted in structured JSON format with a mandatory `correlation_id` propagated across the request/worker lifecycle.

```json
{
  "timestamp": "2026-08-23T14:32:00.102Z",
  "level": "INFO",
  "logger": "recovery.policy_engine",
  "correlation_id": "corr_9a8b7c6d5e",
  "merchant_id": "merch_001",
  "recovery_case_id": "rec_01J8F94KC",
  "event": "POLICY_EVALUATION_COMPLETED",
  "gate_result": "APPROVED",
  "executed_rules": ["HARD_DECLINE_CHECK:PASS", "MAX_RETRIES:PASS", "INTERVAL_CHECK:PASS"],
  "recommended_action": "GENERATE_PAYMENT_LINK"
}
```

---

## 2. Key Operational Metrics

- `webhook_ingestion_rate`: Total webhooks received per second.
- `webhook_signature_failures_total`: Counter for invalid HMAC signatures.
- `ai_decision_latency_seconds`: Histogram of LLM call round-trip times.
- `policy_veto_total`: Counter of AI recommendations vetoed by Policy Engine.
- `recovered_revenue_inr_total`: Gauge tracking total attributed recovered revenue.
