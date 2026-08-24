# SmartMandateRetry — Recovery Strategies Catalog

> **Document ID:** DOC-DOM-004  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## 1. Strategy Taxonomy & Action Distinction

SmartMandateRetry categorizes and executes explicit recovery strategies, strictly distinguishing between mandate actions, payment link collections, and escalations.

| Strategy Identifier | Primary Action | Target Stage | Mechanism & Implementation |
|---|---|---|---|
| `STRAT_PAYMENT_LINK` | `PAYMENT_LINK_RECOVERY` | `HALTED_RECOVERY` | Calls Razorpay API `POST /v1/payment_links` for invoice balance. Enables customer to pay via alternative rails (UPI, Netbanking, Alternate Card). |
| `STRAT_SCHEDULED_CHECK`| `SCHEDULE_RECOVERY_CHECK` | Both Stages | Schedules delayed Celery background task aligned with customer liquidity profile (e.g. 48h delay). |
| `STRAT_MANDATE_UPDATE_PROMPT` | `PAYMENT_METHOD_RECOVERY` | `PENDING_OBSERVATION` | Provides direct URL to Razorpay customer mandate update screen for expired card / changed bank. |
| `STRAT_HUMAN_ESCALATE` | `MANUAL_ESCALATION` | Both Stages | Routes case to Merchant Operations Inbox for manual phone/email follow-up. |
| `STRAT_TERMINAL_STOP` | `STOP` | Both Stages | Ceases automated attempts to prevent compliance violations or customer annoyance. |

---

## 2. Failure Category to Strategy Mapping Matrix

| Failure Category | Example Gateway Error Reasons | Recommended Strategy | Fallback / Guard |
|---|---|---|---|
| `TEMPORARY` (Liquidity) | `insufficient_funds` | `STRAT_SCHEDULED_CHECK` -> `STRAT_PAYMENT_LINK` at T+48h | Max 3 attempts post-halt |
| `ACTION_REQUIRED` (Card) | `card_expired`, `expired_card` | `STRAT_MANDATE_UPDATE_PROMPT` (Immediate in Pending) | If unresolved at halt -> `STRAT_PAYMENT_LINK` |
| `TEMPORARY` (Network) | `gateway_technical_error`, `server_error` | `STRAT_SCHEDULED_CHECK` (Short 12h-24h delay) | Check downtime monitor |
| `PERMANENT` (Hard Decline)| `do_not_honour`, `account_closed`, `fraud` | `STRAT_TERMINAL_STOP` | Hard Policy Veto |
| `UNKNOWN` (Ambiguous) | Non-standard bank descriptions | AI Diagnosis -> `STRAT_PAYMENT_LINK` if confidence >= 0.75 | `STRAT_HUMAN_ESCALATE` if confidence < 0.75 |
