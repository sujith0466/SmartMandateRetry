# SmartMandateRetry — Data Dictionary

> **Document ID:** DOC-DATA-002  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## 1. Table Field Definitions

### 1.1 `recovery_cases`
| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | No | Primary key UUID (prefixed `rec_`). |
| `merchant_id` | VARCHAR(36) | No | Foreign key referencing `merchants.id`. |
| `subscription_id` | VARCHAR(36) | No | Foreign key referencing `subscriptions.id`. |
| `invoice_id` | VARCHAR(64) | Yes | Razorpay invoice ID (`inv_...`). |
| `payment_id` | VARCHAR(64) | Yes | Razorpay payment ID (`pay_...`). |
| `amount_inr` | NUMERIC(12,2) | No | Outstanding invoice amount in INR. |
| `currency` | VARCHAR(3) | No | ISO currency code (default: `INR`). |
| `stage` | VARCHAR(32) | No | `PENDING_OBSERVATION` or `HALTED_RECOVERY`. |
| `state` | VARCHAR(32) | No | State machine state (`DETECTED`, `SCHEDULED`, `RECOVERED`, etc.). |
| `failure_category` | VARCHAR(32) | Yes | Standardized category (`TEMPORARY`, `PERMANENT`, `ACTION_REQUIRED`, `UNKNOWN`). |
| `failure_code` | VARCHAR(64) | Yes | Normalized error code (e.g., `insufficient_funds`). |
| `attempt_count` | INT | No | Number of post-halt recovery attempts. |
| `recovered_amount_inr` | NUMERIC(12,2) | No | Attributed recovered amount in INR (0.00 until settled). |
| `created_at` | TIMESTAMP | No | Record creation timestamp (UTC). |
| `resolved_at` | TIMESTAMP | Yes | Timestamp when case reached terminal state. |

### 1.2 `audit_events`
| Column | Type | Nullable | Description |
|---|---|---|---|
| `id` | VARCHAR(36) | No | Primary key UUID (prefixed `aud_`). |
| `merchant_id` | VARCHAR(36) | No | Foreign key referencing `merchants.id`. |
| `recovery_case_id` | VARCHAR(36) | Yes | Optional foreign key referencing `recovery_cases.id`. |
| `event_type` | VARCHAR(64) | No | Name of event (e.g. `POLICY_VETO`, `ACTION_EXECUTED`). |
| `actor` | VARCHAR(64) | No | System identity (`SYSTEM`, `POLICY_GATE`, `AI_ENGINE`). |
| `payload` | JSONB | No | Full contextual JSON payload of event. |
| `correlation_id` | VARCHAR(128) | Yes | Distributed tracing correlation ID. |
| `created_at` | TIMESTAMP | No | Immutable creation timestamp. |
