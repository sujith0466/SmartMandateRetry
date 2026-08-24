# SmartMandateRetry — Policy & Safety Engine Specification

> **Document ID:** DOC-DOM-003  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## 1. Safety Gate Architecture

The Policy Engine is the single authoritative safety gate for all automated recovery interventions. It operates strictly in Python without external LLM dependencies.

```
       [AI Proposal JSON] + [RecoveryCase State] + [Merchant RecoveryPolicy]
                                         │
                                         ▼
                      ┌────────────────────────────────────┐
                      │    Deterministic Policy Engine     │
                      │                                    │
                      │  [Rule 1: Hard Decline Veto]       │
                      │  [Rule 2: Max Attempts Cap]        │
                      │  [Rule 3: Min Interval Check]      │
                      │  [Rule 4: Max Recovery Window]     │
                      │  [Rule 5: Confidence Gate]         │
                      │  [Rule 6: High Value Review Gate]  │
                      │  [Rule 7: Contact Frequency Cap]   │
                      │  [Rule 8: Action Allowlist Check]  │
                      └──────────────────┬─────────────────┘
                                         │
                 ┌───────────────────────┼───────────────────────┐
                 ▼                       ▼                       ▼
           [APPROVED]              [ESCALATE]                 [DENIED]
                 │                       │                       │
          Action Executor           Human Review           Halt Automation
          Executes Action           Queue Inbox            Log Safety Veto
```

---

## 2. Hard Policy Rules Definition

1. **POL-RULE-001 (Hard Decline Veto):**  
   If failure reason is `DO_NOT_HONOUR`, `ACCOUNT_CLOSED`, `FRAUD_BLOCK`, or `STOLEN_CARD`, gate returns `DENIED (hard_decline_violation)` and triggers immediate `STOP`.
2. **POL-RULE-002 (Max Attempts Cap):**  
   If `case.attempt_count >= policy.max_retries_per_case` (default: 3 post-halt), gate returns `DENIED (max_retries_exhausted)` and triggers `STOP`.
3. **POL-RULE-003 (Minimum Interval Check):**  
   If elapsed time since last action < `policy.min_retry_interval_hours` (default: 24h), gate rejects proposal or extends `delay_hours` to satisfy minimum interval.
4. **POL-RULE-004 (Maximum Recovery Window):**  
   If `current_time - case.created_at > policy.max_recovery_window_days` (default: 14 days), case transitions to `EXPIRED`.
5. **POL-RULE-005 (Confidence Threshold Gate):**  
   If `proposal.confidence < policy.min_confidence_threshold` (default: 0.75), gate returns `ESCALATE (low_confidence_review)`.
6. **POL-RULE-006 (High-Value Approval Gate):**  
   If `case.amount_inr > policy.high_value_threshold_inr` (default: 10,000 INR), gate returns `REQUIRES_HUMAN_APPROVAL`.
7. **POL-RULE-007 (Contact Frequency Cap):**  
   If `case.contacts_in_cycle >= policy.max_customer_contacts_per_cycle` (default: 3), gate disallows outbound customer notifications.
8. **POL-RULE-008 (Action Allowlist Check):**  
   The proposed action string MUST be one of the explicitly authorized action enums (`SCHEDULE_RECOVERY_CHECK`, `PAYMENT_LINK_RECOVERY`, `PAYMENT_METHOD_RECOVERY`, `MANUAL_ESCALATION`, `STOP`). Any unknown action is rejected with `DENIED (unrecognized_action)`.
