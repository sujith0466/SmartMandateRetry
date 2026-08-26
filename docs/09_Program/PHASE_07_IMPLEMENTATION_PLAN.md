# SmartMandateRetry — Phase 7 Implementation Plan: Policy Engine & Deterministic Safety Gate

> **Document ID:** DOC-PROG-022  
> **Phase:** Phase 7 — Policy Engine & Deterministic Safety Gate  
> **Status:** PLANNING BASELINE  
> **Author:** Principal AI Systems Architect & Safety Engineer  
> **Dependencies:** Phase 2 (Database Foundation), Phase 3 (Webhook Ingestion), Phase 4 (Failure Intelligence), Phase 5 (Customer Recovery Context), Phase 6 (AI Decision Engine)  

---

## 1. Phase 7 Objective & Architectural Boundary

### Objective
Build a deterministic, explainable, provider-neutral **Policy Engine & Safety Gate** that receives the sanitized [`CustomerRecoveryContext`](file:///d:/SmartMandateRetry/backend/app/domain/customer_context.py) from Phase 5 and the [`AIDecisionResult`](file:///d:/SmartMandateRetry/backend/app/domain/ai_decision_schemas.py) / [`RecoveryDecision`](file:///d:/SmartMandateRetry/backend/app/domain/models.py) from Phase 6, evaluates the merchant's configured [`RecoveryPolicy`](file:///d:/SmartMandateRetry/backend/app/domain/models.py), and determines whether the recommendation is:
- **`ALLOWED`** (`execution_allowed=True`): AI recommendation is approved as-is with optional interval adjustment.
- **`MODIFIED`** (`execution_allowed=False` or conditional): AI recommendation was adjusted for safety (e.g. routed to `MANUAL_ESCALATION` due to high-value exposure or delay adjusted).
- **`BLOCKED`** (`execution_allowed=False`): AI recommendation was vetoed (e.g. hard decline forced to `STOP` or max retries exhausted).

### Strict Architectural Boundaries
- **Phase 6:** *"What recovery strategy does AI recommend?"*
- **Phase 7:** *"Is that recommendation permitted under deterministic business, safety, retry, risk, and hard-decline policies?"*
- **Phase 8:** *"How do we execute an approved action?"*

### Strict Non-Scope (Phase 8+)
- Zero Payment Link creation.
- Zero Razorpay API calls for payment execution.
- Zero Celery recovery task dispatch.
- Zero customer communications (SMS, email, WhatsApp).
- Zero state transitions to `RECOVERED`.
- Zero new AI/LLM calls (Policy decisions are 100% deterministic Python rules).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 7 DETERMINISTIC POLICY SAFETY GATE                 │
│                                                                             │
│  ┌─────────────────────────────┐    ┌────────────────────────────────────┐  │
│  │   CustomerRecoveryContext   │ +  │   AIDecisionResult / RecoveryDec   │  │
│  └──────────────┬──────────────┘    └─────────────────┬──────────────────┘  │
│                 │                                     │                     │
│                 └──────────────────┬──────────────────┘                     │
│                                    │                                        │
│                                    ▼                                        │
│                 ┌─────────────────────────────────────┐                     │
│                 │      Merchant RecoveryPolicy        │                     │
│                 └──────────────────┬──────────────────┘                     │
│                                    │                                        │
│                                    ▼                                        │
│                 ┌─────────────────────────────────────┐                     │
│                 │     PolicyRuleRegistry (Precedence) │                     │
│                 │  1. HARD_DECLINE_VETO (P0)          │                     │
│                 │  2. TERMINAL_CASE_VETO (P0)         │                     │
│                 │  3. MAX_RETRIES_EXCEEDED (P1)       │                     │
│                 │  4. HIGH_VALUE_EXPOSURE (P1)        │                     │
│                 │  5. LOW_AI_CONFIDENCE (P1)          │                     │
│                 │  6. MAX_CONTACTS_EXCEEDED (P2)      │                     │
│                 │  7. STRATEGY_STAGE_COMPATIBILITY(P2)│                     │
│                 │  8. ACTION_ALLOWLIST_CHECK (P2)     │                     │
│                 │  9. MIN_RETRY_INTERVAL_ADJUST (P3)  │                     │
│                 └──────────────────┬──────────────────┘                     │
│                                    │                                        │
│                                    ▼                                        │
│                 ┌─────────────────────────────────────┐                     │
│                 │        PolicyDecision Contract      │                     │
│                 │  - status: ALLOWED/MODIFIED/BLOCKED │                     │
│                 │  - final_action: STOP/ESCALATE/...  │                     │
│                 │  - execution_allowed: bool          │                     │
│                 │  - policy_reasons, applied_rules    │                     │
│                 └──────────────────┬──────────────────┘                     │
│                                    │                                        │
│                                    ▼                                        │
│                 ┌─────────────────────────────────────┐                     │
│                 │         PolicyEngineService         │                     │
│                 │  - Immutable AuditEvent logging     │                     │
│                 │  - Deterministic idempotency        │                     │
│                 └──────────────────┬──────────────────┘                     │
└────────────────────────────────────┼────────────────────────────────────────┘
                                     │
                                     ▼
                 ┌────────────────────────────────────────┐
                 │ Phase 8 (Action Execution Dispatcher)  │
                 └────────────────────────────────────────┘
```

---

## 2. Policy Decision Contract (`PolicyDecision`)

```python
class PolicyStatusEnum(str, Enum):
    ALLOWED = "ALLOWED"
    MODIFIED = "MODIFIED"
    BLOCKED = "BLOCKED"

@dataclass(frozen=True)
class PolicyDecision:
    policy_decision_id: str
    case_id: str
    input_decision_id: str
    original_action: str
    final_action: str
    status: PolicyStatusEnum
    execution_allowed: bool
    policy_reasons: List[str]
    policy_rules_applied: List[str]
    risk_flags: List[str]
    adjusted_delay_hours: Optional[int]
    evaluated_at: datetime
    policy_version: str = "1.0.0"

    def to_dict(self) -> Dict[str, Any]: ...
```

---

## 3. Policy Rules Catalog & Strict Precedence

| Precedence | Rule Identifier | Trigger Condition | Deterministic Enforcement | Outcome Status |
|---|---|---|---|---|
| **1 (Highest)** | `HARD_DECLINE_VETO` | `is_hard_decline == True` or `PERMANENT_HARD_DECLINE` or code in `HARD_DECLINE_CODES` | `final_action = STOP`, `execution_allowed = False` | `BLOCKED` |
| **2** | `TERMINAL_CASE_VETO` | Case in terminal state (`RECOVERED`, `STOPPED`, `FAILED`, `ABANDONED`, `EXPIRED`) or age $> \text{max\_recovery\_window\_days}$ ($14\text{d}$) | `final_action = STOP`, `execution_allowed = False` | `BLOCKED` |
| **3** | `MAX_RETRIES_EXCEEDED`| `attempt_count >= policy.max_retries_per_case` ($3$) | `final_action = STOP`, `execution_allowed = False` | `BLOCKED` |
| **4** | `HIGH_VALUE_THRESHOLD`| `amount_inr > policy.high_value_threshold_inr` ($10,000\text{ INR}$) | If automated action -> modify to `final_action = MANUAL_ESCALATION`, `execution_allowed = False` | `MODIFIED` |
| **5** | `LOW_AI_CONFIDENCE` | `confidence < policy.min_confidence_threshold` ($0.75$) | Modify to `final_action = MANUAL_ESCALATION`, `execution_allowed = False` | `MODIFIED` |
| **6** | `MAX_CONTACTS_EXCEEDED`| `contacts_count >= policy.max_customer_contacts_per_cycle` ($3$) and action requires customer contact | Modify to `final_action = MANUAL_ESCALATION` or `SCHEDULE_RECOVERY_CHECK` | `MODIFIED` |
| **7** | `STRATEGY_STAGE_COMPATIBILITY`| Proposed action incompatible with case stage or failure category (e.g. payment link in pending stage) | Deterministically modify to stage-appropriate strategy | `MODIFIED` |
| **8** | `ACTION_ALLOWLIST_CHECK`| Proposed action not in authorized action enum | Modify to `final_action = MANUAL_ESCALATION`, `execution_allowed = False` | `BLOCKED` |
| **9 (Lowest)** | `MIN_RETRY_INTERVAL` | `proposed_action == SCHEDULE_RECOVERY_CHECK` and `delay_hours < policy.min_retry_interval_hours` ($24\text{h}$) | `adjusted_delay_hours = max(delay_hours, min_interval)` | `ALLOWED` (Adjusted) |

---

## 4. Phase 7 Granular Task Breakdown

| Task ID | Component | Task Description | Priority | Dependencies |
|---|---|---|---|---|
| `TSK-015-01` | Policy Contract | Define `PolicyDecision`, `PolicyStatusEnum`, and serialization dataclasses | P0 | Phase 6 |
| `TSK-015-02` | Rule Precedence | Implement declarative `PolicyRuleRegistry` with strict priority ordering | P0 | `TSK-015-01` |
| `TSK-015-03` | Hard Decline Veto | Implement `HardDeclineSafetyRule` (POL-RULE-001) | P0 | `TSK-015-02` |
| `TSK-015-04` | Terminal Case Gate | Implement `TerminalCaseSafetyRule` (POL-RULE-004) | P0 | `TSK-015-02` |
| `TSK-015-05` | Max Retries Cap | Implement `MaxRetriesCapRule` (POL-RULE-002) | P0 | `TSK-015-02` |
| `TSK-015-06` | High Value Gate | Implement `HighValueReviewRule` (POL-RULE-006, 10,000 INR cap) | P0 | `TSK-015-02` |
| `TSK-015-07` | Confidence Gate | Implement `LowConfidenceVetoRule` (POL-RULE-005, 0.75 threshold) | P0 | `TSK-015-02` |
| `TSK-015-08` | Contact Cap Gate | Implement `ContactFrequencyCapRule` (POL-RULE-007, 3 contacts cap) | P0 | `TSK-015-02` |
| `TSK-015-09` | Strategy Compatibility | Implement `StrategyStageCompatibilityRule` (POL-RULE-008) | P0 | `TSK-015-02` |
| `TSK-015-10` | Interval Enforcer | Implement `MinRetryIntervalRule` (POL-RULE-003, 24h floor) | P0 | `TSK-015-02` |
| `TSK-015-11` | Policy Evaluator | Implement `PolicyEvaluationEngine` orchestrating rule pipeline | P0 | `TSK-015-03..10` |
| `TSK-015-12` | Policy Service | Implement `PolicyEngineService` with UnitOfWork & audit logging (`POLICY_DECISION_EVALUATED`) | P0 | `TSK-015-11` |
| `TSK-015-13` | Unit Tests | Comprehensive unit tests for every individual policy rule (100% branch coverage) | P0 | `TSK-015-03..11` |
| `TSK-015-14` | Integration Tests | Integration tests saving `AuditEvent` and querying live PostgreSQL merchant policies | P0 | `TSK-015-12` |
| `TSK-015-15` | Idempotency & Fault | Tests for idempotent duplicate evaluation, missing policies, and corrupted inputs | P0 | `TSK-015-12` |
| `TSK-015` | Master Task | Complete Policy Engine & Deterministic Safety Gate subsystem | P0 | `TSK-015-01..15` |

---

## 5. Definition of Done (DoD) for Phase 7

- [ ] `PolicyDecision` contract enforces strict typing for status (`ALLOWED`, `MODIFIED`, `BLOCKED`), reasons, and rules.
- [ ] 8 deterministic safety rules implemented in `PolicyRuleRegistry` with verified precedence.
- [ ] Hard decline errors deterministically veto automated action and force `final_action = STOP`.
- [ ] High-value invoices ($>10,000\text{ INR}$) and low-confidence proposals ($<0.75$) route to `MANUAL_ESCALATION`.
- [ ] Attempt caps ($3$) and contact caps ($3$) prevent aggressive or repeated retry loops.
- [ ] `PolicyEngineService` audits decisions in `audit_events` (`POLICY_DECISION_EVALUATED`) without exposing secrets/PII.
- [ ] 100% branch coverage across all policy rules.
- [ ] Backend test suite passes with 0 failures (`pytest backend/tests/`).
- [ ] Zero Phase 8+ execution logic (Payment Link generation, Celery jobs, messaging) implemented.
