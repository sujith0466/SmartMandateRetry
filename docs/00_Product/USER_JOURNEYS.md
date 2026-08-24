# SmartMandateRetry — Core User Journeys

> **Document ID:** DOC-PROD-005  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## Journey 1: Automated Smart Recovery for Transient Insufficient Funds

```
[Customer Subscription Due]
        │
        ▼
[Razorpay Charge Attempt Fails: INSUFFICIENT_FUNDS]
        │
        ├──> Razorpay marks subscription `pending` (starts native T+1..T+3 daily auto-retry)
        │
        ▼
[Webhook: payment.failed / subscription.pending ingested]
        │
        ├──> HMAC-SHA256 signature verified
        ├──> Event deduplicated in `webhook_events`
        └──> RecoveryCase created: Status = DETECTED, Stage = PENDING_OBSERVATION
        │
        ▼
[Failure Intelligence & Context Engine]
        │
        ├──> Deterministic mapping: INSUFFICIENT_FUNDS -> TEMPORARY (Liquidity)
        ├──> Context lookup: 18-month tenure, 94% historical success rate
        │
        ▼
[AI Decision Layer (OpenRouter)]
        │
        └──> Proposes: action=SCHEDULE_RECOVERY_CHECK, delay_hours=48, confidence=0.92,
             reasoning="Customer has strong payment history; liquidity expected post-salary cycle"
        │
        ▼
[Deterministic Policy Gate]
        │
        ├──> Retry limit check: 0/3 PASS
        ├──> Interval check: 48h >= 24h PASS
        ├──> High-value check: 1,499 < 10,000 PASS
        └──> Decision: APPROVED
        │
        ▼
[Action Executor: Celery Worker]
        │
        ├──> Schedules delayed check at T+48h
        └──> Emits immutable audit event
        │
        ▼
[Stage Transition: subscription.halted received at T+72h]
        │
        ├──> Case transitions to Stage = HALTED_RECOVERY
        ├──> Action Executor generates Razorpay Payment Link (POST /v1/payment_links)
        └──> Case status moves to WAITING_FOR_OUTCOME
        │
        ▼
[Customer Settles Payment Link via UPI]
        │
        ▼
[Webhook: payment_link.paid / payment.captured received]
        │
        ├──> RecoveryCase marked RECOVERED
        ├──> Recovered Revenue attributed: +1,499 INR
        └──> Audit trail completed
```

---

## Journey 2: Permanent Hard Decline Policy Veto (Safety Gate in Action)

```
[Razorpay Charge Attempt Fails: DO_NOT_HONOUR]
        │
        ▼
[Webhook: payment.failed ingested]
        │
        ▼
[Failure Intelligence Engine]
        │
        └──> Error mapped to PERMANENT / HARD_DECLINE
        │
        ▼
[AI Decision Engine (Simulated Suboptimal Recommendation)]
        │
        └──> Proposes: action=SCHEDULE_RECOVERY_CHECK, delay_hours=24, confidence=0.65
        │
        ▼
[Deterministic Policy Engine Gate]
        │
        ├──> HARD DECLINE RULE TRIGGERED: DO_NOT_HONOUR cannot be retried
        ├──> Policy Overrides AI Recommendation
        └──> Gate Result: DENIED (Reason: "hard_decline_violation")
        │
        ▼
[Action Executor]
        │
        ├──> Enforces STOP on automated retries
        ├──> Transitions Case to STOPPED / ESCALATED
        └──> Emits Audit Event: "AI proposal vetoed by deterministic policy engine"
        │
        ▼
[Merchant Dashboard]
        │
        └──> Case appears in Human Review queue with safety veto badge
```

---

## Journey 3: Expired Card Mandate Update Flow

```
[Razorpay Charge Attempt Fails: CARD_EXPIRED]
        │
        ▼
[Webhook: subscription.pending ingested]
        │
        ▼
[Failure Intelligence]
        │
        └──> Mapped to ACTION_REQUIRED (Mandate Update)
        │
        ▼
[AI Decision Engine]
        │
        └──> Proposes: action=PAYMENT_METHOD_RECOVERY, confidence=0.96
        │
        ▼
[Policy Gate]
        │
        └──> APPROVED (Notification count: 0/3)
        │
        ▼
[Action Executor]
        │
        ├──> Early intervention: Prompts customer to update card via Razorpay-hosted flow
        │    (Avoids waiting 3 futile days for native retry to fail)
        └──> Case moves to WAITING_FOR_OUTCOME
        │
        ▼
[Customer updates card / pays link -> Webhook confirmed -> Case RECOVERED]
```

---

## Journey 4: Retry Exhaustion Escalation
```
[Failure] -> Attempt 1 (Failed) -> Attempt 2 (Failed) -> Attempt 3 (Failed)
        │
        ▼
[Policy Engine Check]
        │
        ├──> max_retries_per_case (3) reached
        └──> Action: STOP automated actions, MANUAL_ESCALATION to Operations
        │
        ▼
[Audit Event Logged & Case placed in Merchant Human Review Queue]
```

---

## Journey 5: Low-Confidence Ambiguous Error Escalation
```
[Failure with ambiguous bank message: "TRANSACTION_NOT_PERMITTED_TO_CARDHOLDER"]
        │
        ▼
[AI Decision Engine]
        │
        └──> Proposes: action=SCHEDULE_RECOVERY_CHECK, confidence=0.52 (< 0.75 threshold)
        │
        ▼
[Policy Engine Check]
        │
        ├──> Confidence (0.52) < min_confidence_threshold (0.75)
        └──> Gate Result: REQUIRES_HUMAN_APPROVAL
        │
        ▼
[Action Executor]
        │
        └──> Case state moves to ESCALATED (no unverified automated charge triggered)
```

---

## Journey 6: Webhook Deduplication (Idempotency)
```
[Webhook payment.failed (Event ID: evt_0987654321) arrives]
        │
        ▼
[Webhook Ingestion Layer]
        │
        ├──> Checks `webhook_events` table for existing event_id
        ├──> Record found (already processed 12 seconds ago)
        └──> Immediately returns HTTP 200 (OK) with no duplicate workflow trigger
```

---

## Journey 7: Payment Link Expired Without Payment (Re-evaluation Loop)
```
[Payment Link generated with 48h expiry]
        │
        ▼
[No payment received within 48h -> link expires]
        │
        ▼
[Celery Background Reconciler]
        │
        ├──> Detects link expiry without settlement
        ├──> Increments case attempt counter
        └──> Transitions state to DECISION_PENDING for next contextual strategy
```
