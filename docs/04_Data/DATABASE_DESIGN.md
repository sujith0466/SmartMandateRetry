# SmartMandateRetry — Database Design Specification

> **Document ID:** DOC-DATA-001  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## 1. Schema Overview & ER Structure (PostgreSQL 16)

```sql
-- Core Merchant & Policy
CREATE TABLE merchants (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    razorpay_account_id VARCHAR(64) NOT NULL UNIQUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE recovery_policies (
    id VARCHAR(36) PRIMARY KEY,
    merchant_id VARCHAR(36) NOT NULL REFERENCES merchants(id),
    max_retries_per_case INT NOT NULL DEFAULT 3,
    min_retry_interval_hours INT NOT NULL DEFAULT 24,
    max_recovery_window_days INT NOT NULL DEFAULT 14,
    min_confidence_threshold NUMERIC(3,2) NOT NULL DEFAULT 0.75,
    high_value_threshold_inr NUMERIC(12,2) NOT NULL DEFAULT 10000.00,
    max_customer_contacts_per_cycle INT NOT NULL DEFAULT 3,
    hard_decline_auto_stop BOOLEAN NOT NULL DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Inbound Webhooks (Idempotent Store)
CREATE TABLE webhook_events (
    id VARCHAR(36) PRIMARY KEY,
    event_id VARCHAR(128) NOT NULL UNIQUE,
    event_type VARCHAR(64) NOT NULL,
    payload JSONB NOT NULL,
    signature_verified BOOLEAN NOT NULL DEFAULT FALSE,
    processed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Customers & Subscriptions
CREATE TABLE customers (
    id VARCHAR(36) PRIMARY KEY,
    merchant_id VARCHAR(36) NOT NULL REFERENCES merchants(id),
    razorpay_customer_id VARCHAR(64) NOT NULL,
    email VARCHAR(255),
    contact VARCHAR(32),
    tenure_months INT DEFAULT 0,
    historical_success_rate NUMERIC(3,2) DEFAULT 1.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE subscriptions (
    id VARCHAR(36) PRIMARY KEY,
    merchant_id VARCHAR(36) NOT NULL REFERENCES merchants(id),
    customer_id VARCHAR(36) NOT NULL REFERENCES customers(id),
    razorpay_subscription_id VARCHAR(64) NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL,
    plan_id VARCHAR(64) NOT NULL,
    current_cycle INT DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Recovery Aggregate Root
CREATE TABLE recovery_cases (
    id VARCHAR(36) PRIMARY KEY,
    merchant_id VARCHAR(36) NOT NULL REFERENCES merchants(id),
    subscription_id VARCHAR(36) NOT NULL REFERENCES subscriptions(id),
    invoice_id VARCHAR(64),
    payment_id VARCHAR(64),
    amount_inr NUMERIC(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'INR',
    stage VARCHAR(32) NOT NULL, -- PENDING_OBSERVATION, HALTED_RECOVERY
    state VARCHAR(32) NOT NULL, -- DETECTED, ANALYZING, DECISION_PENDING, etc.
    failure_category VARCHAR(32),
    failure_code VARCHAR(64),
    attempt_count INT DEFAULT 0,
    recovered_amount_inr NUMERIC(12,2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- AI Decisions & Actions
CREATE TABLE recovery_decisions (
    id VARCHAR(36) PRIMARY KEY,
    recovery_case_id VARCHAR(36) NOT NULL REFERENCES recovery_cases(id),
    recommended_action VARCHAR(64) NOT NULL,
    delay_hours INT DEFAULT 0,
    confidence NUMERIC(3,2) NOT NULL,
    reasoning TEXT NOT NULL,
    risk_flags JSONB DEFAULT '[]',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE recovery_actions (
    id VARCHAR(36) PRIMARY KEY,
    recovery_case_id VARCHAR(36) NOT NULL REFERENCES recovery_cases(id),
    action_type VARCHAR(64) NOT NULL,
    idempotency_key VARCHAR(128) NOT NULL UNIQUE,
    status VARCHAR(32) NOT NULL,
    external_reference_id VARCHAR(128),
    executed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Append-Only Audit Trail
CREATE TABLE audit_events (
    id VARCHAR(36) PRIMARY KEY,
    merchant_id VARCHAR(36) NOT NULL REFERENCES merchants(id),
    recovery_case_id VARCHAR(36) REFERENCES recovery_cases(id),
    event_type VARCHAR(64) NOT NULL,
    actor VARCHAR(64) NOT NULL, -- SYSTEM, AI_ENGINE, POLICY_GATE, MERCHANT_USER
    payload JSONB NOT NULL,
    correlation_id VARCHAR(128),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```
