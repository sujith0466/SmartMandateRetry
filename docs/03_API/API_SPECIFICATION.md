# SmartMandateRetry — Merchant REST API Specification

> **Document ID:** DOC-API-001  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## 1. REST Endpoints Overview

All REST API endpoints are served under `/api/v1/` and accept/return JSON payloads.

```
/api/v1
├── /healthz                         (Liveness probe - HTTP 200)
├── /readyz                          (Readiness probe - DB & Redis connectivity)
├── /cases
│   ├── GET  /cases                  (List & filter recovery cases)
│   ├── GET  /cases/:id              (Get detailed case context & timeline)
│   ├── POST /cases/:id/review       (Submit merchant human review action)
│   └── POST /cases/:id/stop         (Force stop a recovery case)
├── /policies
│   ├── GET  /policies               (Fetch active merchant recovery policy)
│   └── PUT  /policies               (Update merchant recovery policy)
├── /analytics
│   ├── GET  /analytics/overview     (Macro dashboard metrics & revenue attribution)
│   └── GET  /analytics/trends       (Time-series at-risk vs recovered revenue)
├── /evaluation
│   ├── GET  /evaluation/datasets    (List available benchmark datasets)
│   ├── POST /evaluation/run         (Execute synthetic benchmark run)
│   └── GET  /evaluation/runs/:id    (Fetch detailed comparative run results)
└── /audit
    └── GET  /audit                  (Query append-only audit trail)
```

---

## 2. Selected Endpoint Schemas

### 2.1 `GET /api/v1/cases`
**Query Parameters:**
- `status`: `active | escalated | recovered | stopped | all`
- `stage`: `pending_observation | halted_recovery`
- `page`: integer (default: 1)
- `limit`: integer (default: 20)

**Response:**
```json
{
  "data": [
    {
      "id": "rec_01J8F94KC...",
      "subscription_id": "sub_N829skd92",
      "customer_email": "u***@example.com",
      "amount_inr": 1499.00,
      "failure_category": "TEMPORARY",
      "failure_code": "insufficient_funds",
      "stage": "HALTED_RECOVERY",
      "state": "SCHEDULED",
      "ai_recommended_action": "PAYMENT_LINK_RECOVERY",
      "ai_confidence": 0.92,
      "attempt_count": 1,
      "created_at": "2026-08-23T14:30:00Z"
    }
  ],
  "pagination": { "page": 1, "limit": 20, "total": 142 }
}
```

### 2.2 `GET /api/v1/policies`
**Response:**
```json
{
  "max_retries_per_case": 3,
  "min_retry_interval_hours": 24,
  "max_recovery_window_days": 14,
  "min_confidence_threshold": 0.75,
  "high_value_threshold_inr": 10000.00,
  "max_customer_contacts_per_cycle": 3,
  "hard_decline_auto_stop": true
}
```
