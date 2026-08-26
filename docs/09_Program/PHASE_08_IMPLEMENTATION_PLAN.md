# SmartMandateRetry — Phase 8 Implementation Plan: Recovery Action Execution & Dispatcher

> **Document ID:** DOC-PROG-027  
> **Phase:** Phase 8 — Recovery Action Execution & Dispatcher  
> **Status:** APPROVED IMPLEMENTATION CONTRACT  
> **Author:** Principal Systems Architect & Security Engineer  
> **Dependencies:** Phase 2–7 (Complete & Frozen), AI Provider Hardening (Complete & Frozen)  

---

## 1. Executive Summary & Objective

Phase 8 implements the **Recovery Action Execution & Dispatcher** subsystem for SmartMandateRetry.

### Core Architectural Principle
> *"Phase 6 recommends an action. Phase 7 authoritatively decides if the action is permitted under deterministic policy rules. Phase 8 safely, idempotently, and accurately executes ONLY approved actions (`execution_allowed == True`)."*

Phase 8 MUST NOT decide whether an action is safe or override Phase 7's deterministic authority. If Phase 7 determines `execution_allowed == False`, Phase 8 executes **zero external operations** (zero Payment Links, zero Celery dispatches, zero customer communications), records a blocked action audit trail, and returns a deterministic `BLOCKED` result.

---

## 2. End-to-End Recovery Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 8 ACTION EXECUTION & DISPATCHER                    │
│                                                                             │
│  ┌──────────────────────────────┐                                           │
│  │ Phase 7 PolicyDecision       │ (Authoritative Safety Gate)               │
│  │ (final_action, allowed, etc.)│                                           │
│  └──────────────┬───────────────┘                                           │
│                 │                                                           │
│                 ▼                                                           │
│  ┌──────────────────────────────┐                                           │
│  │ ActionExecutionRequest       │ (case_id, decision_id, final_action, ...) │
│  └──────────────┬───────────────┘                                           │
│                 │                                                           │
│                 ▼                                                           │
│  ┌──────────────────────────────┐                                           │
│  │ Idempotency Check            │ ──► [Already Executed?]                   │
│  │ (phase8:case:dec:action)     │          │ Yes                            │
│  └──────────────┬───────────────┘          ▼                                │
│                 │ No               Return Existing ActionExecutionResult    │
│                 ▼                                                           │
│  ┌──────────────────────────────┐                                           │
│  │ execution_allowed == True?   │ ──► No ──► [Zero External Calls]          │
│  └──────────────┬───────────────┘            │                              │
│                 │ Yes                        ▼                              │
│                 │                  Persist RecoveryAction (BLOCKED)         │
│                 │                  Record AuditEvent (ACTION_BLOCKED)       │
│                 │                  Return Result (BLOCKED)                  │
│                 ▼                                                           │
│  ┌──────────────────────────────┐                                           │
│  │ ActionDispatcher             │                                           │
│  └──────────────┬───────────────┘                                           │
│                 │                                                           │
│                 ├───────────────────┬───────────────────┬───────────────────┤
│                 ▼                   ▼                   ▼                   ▼
│  ┌────────────────────────┐ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐
│  │ ScheduleRecoveryAdapter│ │PaymentLinkAdptr│ │ManualEscAdapter│ │StopAdapter     │
│  │ - Celery/Redis Delay   │ │- RZP Link API  │ │- Escalation Log│ │- Terminal Stop │
│  │ - Min-Interval Respect │ │- $0 Secret Leak│ │- Operator Queue│ │- Zero Re-try   │
│  └──────────────┬─────────┘ └───────┬────────┘ └────────┬───────┘ └────────┬───────┘
│                 │                   │                   │                  │
│                 └───────────────────┴─────────┬─────────┴──────────────────┘
│                                               ▼
│                                 ┌──────────────────────────────┐
│                                 │ Persist RecoveryAction (DB) │
│                                 │ Record AuditEvent (DB)       │
│                                 │ Return ActionExecutionResult │
│                                 └──────────────────────────────┘
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Supported Recovery Actions & Execution Semantics

| Recovery Action | Execution Semantics | External Provider Action | Database State & Reference |
|---|---|---|---|
| `SCHEDULE_RECOVERY_CHECK` | Schedules delayed check respecting `adjusted_delay_hours` from Phase 7 (never raw AI delay if modified). | Dispatches async Celery task (`scheduled_recovery_check_task`) with `countdown = delay_hours * 3600`. | `status = SCHEDULED`, `external_reference_id = task_id`, `state = SCHEDULED`. |
| `PAYMENT_LINK_RECOVERY` | Creates payment link for invoice amount in paise via `RazorpayClient.create_payment_link`. | Razorpay `POST /v1/payment_links` with customer contact prefill. | `status = EXECUTED`, `external_reference_id = plink_id`, `state = IN_PROGRESS`. |
| `PAYMENT_METHOD_RECOVERY` | Safe fallback if instrument update endpoint is not exposed by gateway. | Fails safely with `NOT_SUPPORTED` rather than fabricating an API call. | `status = NOT_SUPPORTED`, `state = DETECTED`. |
| `MANUAL_ESCALATION` | Routes case to operator queue with failure context and risk flags. | Zero external/financial calls. | `status = EXECUTED`, `state = ESCALATED`. |
| `STOP` | Terminates recovery cycle without further action. | Zero external calls. | `status = EXECUTED`, `state = STOPPED`. |

---

## 4. Idempotency, Concurrency & Data Isolation

1. **Deterministic Idempotency Key:** `phase8:{case_id}:{policy_decision_id}:{final_action}`
2. **Database Constraint:** `RecoveryAction.idempotency_key` is unique.
3. **Pessimistic / OCC Boundaries:** Cases are retrieved with UnitOfWork transaction isolation; OCC version check protects against racing execution dispatchers.
4. **Zero Secret Leakage:** Authorization headers, webhook secrets, card numbers, and raw tokens are excluded from all logging and persistence.

---

## 5. Granular Task Breakdown

| Task ID | Component | Task Description | Priority |
|---|---|---|---|
| `TSK-016-01` | **Execution Schemas** | Define `ActionExecutionRequest`, `ActionExecutionResult`, and `ActionExecutionStatus` | P0 |
| `TSK-016-02` | **Adapter Interface** | Define `BaseRecoveryAdapter` abstract interface | P0 |
| `TSK-016-03` | **Schedule Adapter** | Implement `ScheduleRecoveryAdapter` respecting Phase 7 delay & Celery countdown | P0 |
| `TSK-016-04` | **Payment Link Adapter** | Implement `PaymentLinkAdapter` interfacing with `RazorpayClient` | P0 |
| `TSK-016-05` | **Payment Method Adapter** | Implement `PaymentMethodAdapter` returning `NOT_SUPPORTED` safely | P0 |
| `TSK-016-06` | **Manual Escalation Adapter** | Implement `ManualEscalationAdapter` persisting operator escalation record | P0 |
| `TSK-016-07` | **Stop Adapter** | Implement `StopRecoveryAdapter` recording terminal stop | P0 |
| `TSK-016-08` | **Action Dispatcher** | Implement `ActionDispatcher` enforcing fail-closed `execution_allowed` gate | P0 |
| `TSK-016-09` | **Execution Service** | Implement `RecoveryExecutionService` with UoW, idempotency, and audit logging | P0 |
| `TSK-016-10` | **Unit Tests** | Unit tests for all adapters, dispatcher, delay enforcement, and blocked actions | P0 |
| `TSK-016-11` | **Idempotency & OCC Tests**| Tests verifying duplicate prevention, race handling, and DB constraints | P0 |
| `TSK-016-12` | **Integration Tests** | Integration tests with PostgreSQL and live audit logging (`RECOVERY_ACTION_EXECUTED`) | P0 |

---

## 6. Definition of Done (DoD)

- [ ] All 5 recovery actions handled deterministically.
- [ ] Blocked Phase 7 decisions (`execution_allowed == False`) produce zero external side effects and record `RECOVERY_ACTION_BLOCKED`.
- [ ] Duplicate execution attempts return existing result without duplicate API calls.
- [ ] `RazorpayClient` payment link creation tested with mocked gateway responses.
- [ ] 100% of existing Phase 2–7 test suite continues to pass.
- [ ] Overall backend coverage maintained at $\ge 90\%$.
- [ ] Zero secrets detected by `scripts/security_scan.py`.
- [ ] Completion report and changelog updated.
