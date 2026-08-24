# SmartMandateRetry — Recovery State Machine Specification

> **Document ID:** DOC-DOM-002  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## 1. Formal State Machine States & Lifecycle

The `RecoveryCase` aggregate transitions through explicit, immutable lifecycle states:

```
                  ┌──────────────┐
                  │   DETECTED   │
                  └──────┬───────┘
                         │
                         ▼
                  ┌──────────────┐
                  │  ANALYZING   │
                  └──────┬───────┘
                         │
                         ▼
               ┌───────────────────┐
               │ DECISION_PENDING  │
               └─────────┬─────────┘
                         │
                         ▼
               ┌───────────────────┐
               │   POLICY_REVIEW   │
               └─────────┬─────────┘
                         │
        ┌────────────────┼────────────────┐
        │ [APPROVED]     │ [ESCALATE]     │ [DENIED/STOP]
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│  SCHEDULED   │  │  ESCALATED   │  │   STOPPED    │
└───────┬──────┘  └──────────────┘  └──────────────┘
        │
        ▼
┌──────────────┐
│ACTION_PENDING│
└───────┬──────┘
        │
        ▼
┌───────────────────┐
│  ACTION_EXECUTED  │
└─────────┬─────────┘
          │
          ▼
┌───────────────────────┐
│  WAITING_FOR_OUTCOME  │
└───────────┬───────────┘
            │
     ┌──────┴──────┐
     ▼             ▼
┌──────────┐ ┌───────────┐
│RECOVERED │ │  FAILED   │ ──(Within policy caps)──► [Loop to DECISION_PENDING]
└──────────┘ └───────────┘
```

---

## 2. Transition Guard & Policy Rules Matrix

| From State | To State | Trigger | Guard Condition |
|---|---|---|---|
| `DETECTED` | `ANALYZING` | Background task start | Valid `RecoveryCase` record persisted. |
| `ANALYZING` | `DECISION_PENDING` | Context assembled | Metadata & customer profile complete. |
| `DECISION_PENDING` | `POLICY_REVIEW` | AI response received | Valid structured JSON schema from OpenRouter. |
| `POLICY_REVIEW` | `SCHEDULED` | Policy evaluation | Policy Gate returns `APPROVED`. |
| `POLICY_REVIEW` | `ESCALATED` | Policy evaluation | Confidence < threshold OR Amount > high-value cap. |
| `POLICY_REVIEW` | `STOPPED` | Policy evaluation | Hard decline detected OR Max recovery attempts exceeded. |
| `SCHEDULED` | `ACTION_PENDING` | Timer/delay elapsed | Target timestamp <= current local time. |
| `ACTION_PENDING` | `ACTION_EXECUTED` | API execution | Razorpay API returns 200/201 (e.g. Payment Link created). |
| `ACTION_EXECUTED` | `WAITING_FOR_OUTCOME` | Webhook registration | Awaiting settlement webhook. |
| `WAITING_FOR_OUTCOME` | `RECOVERED` | Settlement webhook | Inbound `payment.captured` / `payment_link.paid` / `subscription.charged`. |
| `WAITING_FOR_OUTCOME` | `FAILED` | Expiry/Decline webhook| Payment Link expires without payment or charge declined. |
| `FAILED` | `DECISION_PENDING` | Retry evaluator | `attempt_count < policy.max_retries_per_case`. |
| `FAILED` | `STOPPED` | Policy cap exhausted | `attempt_count >= policy.max_retries_per_case`. |
