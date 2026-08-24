# SmartMandateRetry — Domain Model Specification

> **Document ID:** DOC-DOM-001  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## 1. Domain Entities & Glossary

```
┌──────────────┐         1:N          ┌───────────────────┐
│   Merchant   ├─────────────────────►│     Customer      │
└──────┬───────┘                      └─────────┬─────────┘
       │                                        │
       │ 1:1                                    │ 1:N
       ▼                                        ▼
┌──────────────┐                      ┌───────────────────┐
│RecoveryPolicy│                      │   Subscription    │
└──────────────┘                      └─────────┬─────────┘
                                                │
                                                │ 1:N
                                                ▼
                                      ┌───────────────────┐
                                      │   RecoveryCase    │
                                      └──┬──────┬───────┬─┘
                                         │      │       │
                        ┌────────────────┘      │       └────────────────┐
                        │ 1:N                   │ 1:N                    │ 1:N
                        ▼                       ▼                        ▼
              ┌──────────────────┐    ┌──────────────────┐     ┌──────────────────┐
              │ RecoveryDecision │    │  RecoveryAction  │     │    AuditEvent    │
              └──────────────────┘    └──────────────────┘     └──────────────────┘
```

---

## 2. Entity Descriptions & Core Invariants

### 2.1 Merchant
- **Definition:** The business entity utilizing SmartMandateRetry to recover recurring revenue.
- **Attributes:** `id`, `name`, `razorpay_account_id`, `created_at`.

### 2.2 Customer
- **Definition:** The subscriber who has an active or failed mandate.
- **Attributes:** `id`, `merchant_id`, `razorpay_customer_id`, `email`, `contact`, `tenure_months`, `historical_success_rate`.

### 2.3 Subscription
- **Definition:** The recurring mandate record tracked by Razorpay.
- **Attributes:** `id`, `merchant_id`, `razorpay_subscription_id`, `plan_id`, `status` (active, pending, halted, cancelled), `current_cycle`.

### 2.4 RecoveryCase
- **Definition:** The primary aggregate root tracking a specific billing cycle payment failure from detection to resolution.
- **Attributes:** `id`, `merchant_id`, `subscription_id`, `invoice_id`, `payment_id`, `amount_inr`, `currency`, `stage` (PENDING_OBSERVATION, HALTED_RECOVERY), `state`, `failure_category`, `failure_code`, `attempt_count`, `created_at`, `resolved_at`.

### 2.5 RecoveryDecision
- **Definition:** The structured AI proposal generated for a recovery case.
- **Attributes:** `id`, `recovery_case_id`, `recommended_action`, `delay_hours`, `confidence`, `reasoning`, `risk_flags`, `created_at`.

### 2.6 RecoveryAction
- **Definition:** An authorized, executed recovery intervention.
- **Attributes:** `id`, `recovery_case_id`, `action_type`, `idempotency_key`, `status` (PENDING, EXECUTED, FAILED), `external_reference_id` (e.g. payment link ID), `executed_at`.

### 2.7 RecoveryPolicy
- **Definition:** Merchant-configured deterministic rules and thresholds.
- **Attributes:** `id`, `merchant_id`, `max_retries_per_case`, `min_retry_interval_hours`, `max_recovery_window_days`, `min_confidence_threshold`, `high_value_threshold_inr`, `max_customer_contacts_per_cycle`, `hard_decline_auto_stop`.

### 2.8 AuditEvent
- **Definition:** Immutable record of any state change, AI proposal, policy gate decision, or action execution.
- **Attributes:** `id`, `merchant_id`, `recovery_case_id`, `event_type`, `payload`, `actor`, `correlation_id`, `timestamp`.
