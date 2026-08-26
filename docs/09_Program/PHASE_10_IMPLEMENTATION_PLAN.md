# SmartMandateRetry — Phase 10 Implementation Plan: State Machine & Concurrency Hardening

> **Document ID:** DOC-PROG-031  
> **Phase:** Phase 10 — State Machine & Concurrency Hardening  
> **Status:** APPROVED IMPLEMENTATION CONTRACT  
> **Author:** Principal Systems Architect & Reliability Engineer  
> **Dependencies:** Phase 2–9 (Complete & Frozen), AI Provider Hardening (Complete & Frozen)  

---

## 1. Executive Summary & Objective

Phase 10 builds a deterministic, concurrency-safe, and auditable **State Machine & Concurrency Hardening** layer for SmartMandateRetry.

### Core Architectural Principle
> *"Phase 10 formalizes and hardens the `RecoveryCase` and `RecoveryAction` lifecycle state machine. It guarantees that all transitions strictly conform to the allowed state graph, terminal states remain permanently immutable, optimistic concurrency control (OCC) prevents stale worker overwrites, duplicate requests are idempotent no-ops, and concurrent webhook vs. Celery races resolve deterministically."*

Phase 10 is a **hardening and verification layer**; it introduces zero new recovery strategies, zero AI prompt changes, and zero customer communications.

---

## 2. Formal State Machine Lifecycle & Transition Matrix

### Complete Lifecycle State Graph
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
 │  SCHEDULED   │  │  ESCALATED   │  │   STOPPED    │ (Terminal)
 └───────┬──────┘  └──────────────┘  └──────────────┘
         │                │
         ▼                ▼
 ┌──────────────┐  ┌──────────────┐
 │ACTION_PENDING│  │  SCHEDULED   │
 └───────┬──────┘  └──────────────┘
         │
         ▼
 ┌───────────────────┐
 │    IN_PROGRESS    │ (ACTION_EXECUTED)
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
 │RECOVERED │ │  FAILED   │ ──(Within caps)──► [DECISION_PENDING]
 └──────────┘ └─────┬─────┘
  (Terminal)        │
                    ▼
              ┌───────────┐
              │  EXPIRED  │ (Terminal)
              └───────────┘
```

### Transition Validation Table

| Current State | Permitted Next States | Validation Rules & Preconditions | Terminal? |
|---|---|---|---|
| `DETECTED` | `ANALYZING`, `SCHEDULED`, `IN_PROGRESS`, `STOPPED`, `ESCALATED` | Initial ingress state. Direct transition allowed for immediate action dispatch. | No |
| `ANALYZING` | `DECISION_PENDING`, `STOPPED` | Context aggregation in progress. | No |
| `DECISION_PENDING` | `POLICY_REVIEW`, `STOPPED` | AI / Fallback decision generated. | No |
| `POLICY_REVIEW` | `SCHEDULED`, `IN_PROGRESS`, `ESCALATED`, `STOPPED` | Deterministic safety gate evaluation complete. | No |
| `SCHEDULED` | `ACTION_PENDING`, `IN_PROGRESS`, `RECOVERED`, `FAILED`, `STOPPED` | Delay interval active. Webhook settlement can transition directly to `RECOVERED`. | No |
| `ACTION_PENDING` | `IN_PROGRESS`, `FAILED` | Adapter dispatching external API or task. | No |
| `IN_PROGRESS` | `WAITING_FOR_OUTCOME`, `RECOVERED`, `FAILED`, `ESCALATED`, `STOPPED` | Payment link or observation action executed. | No |
| `WAITING_FOR_OUTCOME` | `RECOVERED`, `FAILED`, `STOPPED` | Inbound webhook verification pending. | No |
| `ESCALATED` | `SCHEDULED`, `IN_PROGRESS`, `STOPPED` | Operator intervention queue. | No |
| `FAILED` | `DECISION_PENDING`, `SCHEDULED`, `STOPPED`, `EXPIRED` | Attempt failed; retry eligible if within policy caps. | No |
| `RECOVERED` | *(None — Set is empty)* | **TERMINAL.** Revenue attributed; immutable to late failures or duplicate webhooks. | **YES** |
| `STOPPED` | *(None — Set is empty)* | **TERMINAL.** Case halted; no further automated actions allowed. | **YES** |
| `EXPIRED` | *(None — Set is empty)* | **TERMINAL.** Case age exceeded maximum cycle lifetime (14 days). | **YES** |

---

## 3. Terminal-State & Monotonicity Protection

1. **Absolute Terminal Immutability:**
   Once a `RecoveryCase` enters `RECOVERED`, `STOPPED`, or `EXPIRED`, any transition attempt to a non-terminal state raises `TerminalStateError` and fails closed.
2. **Late-Failure Rejection (Monotonic Settlement):**
   If a `payment.failed` event arrives for a case already in `RECOVERED`, the state machine ignores the late failure, preserves `RECOVERED` and `recovered_amount_inr`, and returns `DUPLICATE_IGNORED`.
3. **Revenue Protection:**
   `recovered_amount_inr` and `resolved_at` are immutable once set upon reaching `RECOVERED`.

---

## 4. Optimistic Concurrency Control (OCC) & Stale Worker Protection

### OCC Contract
```sql
UPDATE recovery_cases
SET state = :new_state,
    version = version + 1,
    updated_at = :now,
    ...
WHERE id = :case_id AND version = :expected_version;
```

1. **Row Count Check:**
   If `rowcount == 0`, `OptimisticLockError` is raised immediately.
2. **Stale Worker Defense:**
   A worker holding `version = N` cannot commit a state mutation if another worker has advanced the version to `N + 1`.
3. **Safe Re-read & Retry Protocol:**
   Application services must re-read authoritative state within a fresh transaction boundary before deciding whether to retry or acknowledge a no-op.

---

## 5. Webhook vs. Celery Race Handling

| Race Scenario | Worker A | Worker B | Deterministic Resolution |
|---|---|---|---|
| **Simultaneous Webhook & Celery Task** | Celery triggers delayed retry check | Webhook delivers `payment.captured` | Webhook commits `RECOVERED` with `version N+1`. Celery worker OCC check fails on `version N`, re-reads state, detects `RECOVERED`, and exits cleanly as a no-op. |
| **Concurrent Webhook Redelivery** | Gateway webhook delivery 1 | Gateway webhook delivery 2 | First worker transitions case to `RECOVERED`. Second worker detects `state == RECOVERED` and returns `DUPLICATE_IGNORED` with zero duplicate mutations. |
| **Two Competing Celery Workers** | Worker 1 claims scheduled task | Worker 2 claims scheduled task | Worker 1 executes transition with `version N -> N+1`. Worker 2 gets `OptimisticLockError`, re-reads case state (`SCHEDULED` -> `IN_PROGRESS`), and terminates duplicate execution. |
| **Late Failure Webhook after Success** | Webhook confirms `payment.captured` | Late webhook arrives `payment.failed` | `ReconciliationEngine` rejects failure on `RECOVERED` case; returns `DUPLICATE_IGNORED`. |

---

## 6. RecoveryCase ↔ RecoveryAction Lifecycle Consistency

| Invariant ID | Case State | Required Action Status | Prohibited Action States |
|---|---|---|---|
| `INV-ACT-001` | `RECOVERED` | Corresponding recovery action MUST be `RECONCILED` or `EXECUTED`. | `PENDING`, `BLOCKED`, `SCHEDULED` |
| `INV-ACT-002` | `STOPPED` | Terminal halt. | No active `SCHEDULED` or `PENDING` actions allowed. |
| `INV-ACT-003` | `SCHEDULED` | Action `status == SCHEDULED`. | `RECONCILED`, `FAILED` |
| `INV-ACT-004` | `BLOCKED` (Policy) | Action `status == BLOCKED`. | `EXECUTED`, `RECONCILED` |

---

## 7. Audit Event Contract for State Transitions

- **Event Type:** `RECOVERY_STATE_TRANSITIONED`
- **Actor:** `STATE_MACHINE_ENGINE` / `SERVICE`
- **Payload:**
  - `case_id: str`
  - `previous_state: str`
  - `new_state: str`
  - `previous_version: int`
  - `new_version: int`
  - `transition_reason: Optional[str]`
  - `correlation_id: Optional[str]`
  - `timestamp: str (ISO-8601)`

---

## 8. Granular Task Breakdown (`TSK-019-01` .. `TSK-019-14`)

| Task ID | Component | Task Description | Priority |
|---|---|---|---|
| `TSK-019-01` | **State Machine Contract** | Formalize complete transition matrix, terminal state definitions, and invariants | P0 |
| `TSK-019-02` | **Transition Validator** | Implement `StateTransitionValidator` rejecting invalid graph transitions | P0 |
| `TSK-019-03` | **OCC Guard** | Implement centralized OCC guard with conflict detection and stale-worker protection | P0 |
| `TSK-019-04` | **Idempotent Transition Service**| Implement `StateTransitionService` with `ALREADY_APPLIED` no-op semantics | P0 |
| `TSK-019-05` | **Terminal State Guard** | Enforce strict immutability on `RECOVERED`, `STOPPED`, and `EXPIRED` cases | P0 |
| `TSK-019-06` | **Case/Action Consistency**| Implement cross-aggregate invariant validator ensuring case and action states match | P0 |
| `TSK-019-07` | **Concurrency Strategy** | Formalize transaction boundaries and verify row-level OCC locking | P0 |
| `TSK-019-08` | **Race Protection** | Build race resolution helpers for concurrent Celery vs. webhook executions | P0 |
| `TSK-019-09` | **Audit & Observability** | Implement append-only `RECOVERY_STATE_TRANSITIONED` audit event logging | P0 |
| `TSK-019-10` | **Unit Tests** | Comprehensive unit tests for all valid and invalid transitions and terminal guards | P0 |
| `TSK-019-11` | **Concurrency & Chaos Tests**| Multi-threaded / racing worker tests verifying OCC conflict and version increment | P0 |
| `TSK-019-12` | **Integration Tests** | PostgreSQL integration tests validating end-to-end atomic transitions and audits | P0 |
| `TSK-019-13` | **Full Regression & QA** | Verify 100% pass on Phase 2–9 test suites with zero regressions | P0 |
| `TSK-019-14` | **Documentation & Release** | Author completion report, update tracker, and seal Phase 10 | P0 |
| `TSK-019` | **Master Task** | Complete State Machine & Concurrency Hardening subsystem | P0 |

---

## 9. Definition of Done (DoD)

- [ ] All 13 lifecycle states validated with 100% test coverage on transition graph.
- [ ] Invalid transitions raise `InvalidStateTransitionError` and fail closed.
- [ ] Terminal states (`RECOVERED`, `STOPPED`, `EXPIRED`) cannot be mutated.
- [ ] `OptimisticLockError` raised on concurrent worker version mismatch; zero stale overwrites.
- [ ] Idempotent duplicate transitions return `ALREADY_APPLIED` without version bump.
- [ ] 100% of existing Phase 2–9 test suite continues to pass.
- [ ] Overall backend coverage maintained at $\ge 90\%$.
- [ ] Zero secrets detected by `scripts/security_scan.py`.
- [ ] Local `.env` preserved and untracked.
