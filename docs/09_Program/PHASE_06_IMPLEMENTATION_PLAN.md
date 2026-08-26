# SmartMandateRetry — Phase 6 Implementation Plan: AI Decision Engine & Recovery Recommender

> **Document ID:** DOC-PROG-020  
> **Phase:** Phase 6 — AI Decision Engine & Recovery Recommender  
> **Status:** PLANNING BASELINE  
> **Author:** Principal AI Systems Architect  
> **Dependencies:** Phase 2 (Database Foundation), Phase 3 (Webhook Ingestion), Phase 4 (Failure Intelligence), Phase 5 (Customer Context)  

---

## 1. Phase 6 Objective & Architectural Boundary

### Objective
The objective of Phase 6 is to build a secure, deterministic, and explainable **AI Decision Engine** that consumes only the sanitized [`CustomerRecoveryContext`](file:///d:/SmartMandateRetry/backend/app/domain/customer_context.py) from Phase 5, formulates a versioned structured prompt, invokes OpenRouter (or a deterministic mock provider during tests), strictly validates the structured output, evaluates confidence and risk flags, persists the resulting [`RecoveryDecision`](file:///d:/SmartMandateRetry/backend/app/domain/models.py) in PostgreSQL, and creates an immutable audit trail.

### Core Architectural Principle
> **Phase 6 strictly answers:**  
> *"Given this sanitized customer recovery context, what is the optimal, bounded recovery strategy recommendation and rationale?"*  
> **Phase 6 does NOT answer:**  
> *"Should we execute or veto this action?" (Belongs to Phase 7: Policy Engine)*  
> *"How do we execute this action?" (Belongs to Phase 8: Recovery Execution)*  

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         PHASE 6 AI DECISION PIPELINE                        │
│                                                                             │
│  ┌─────────────────────────────┐                                            │
│  │   CustomerRecoveryContext   │ (From Phase 5 - Sanitized, Zero PII)       │
│  └──────────────┬──────────────┘                                            │
│                 │                                                           │
│                 ▼                                                           │
│  ┌─────────────────────────────┐                                            │
│  │    AIPromptBuilder v1.0.0   │ (System Prompt + Serialized Context)       │
│  └──────────────┬──────────────┘                                            │
│                 │                                                           │
│                 ▼                                                           │
│  ┌─────────────────────────────┐       ┌──────────────────────────────────┐ │
│  │    OpenRouter AI Client     │ ◄───► │ OpenRouter API Gateway / Mock    │ │
│  │    (JSON Mode / 5s Timeout) │       │ (google/gemini-2.0-flash-001)    │ │
│  └──────────────┬──────────────┘       └──────────────────────────────────┘ │
│                 │                                                           │
│                 ├───────────────────────────────┐ (On Timeout / 5xx / 429)  │
│                 ▼                               ▼                           │
│  ┌─────────────────────────────┐       ┌──────────────────────────────────┐ │
│  │  AIDecisionSchemaValidator  │       │     FallbackDecisionEngine       │ │
│  │  (Pydantic Strict Validation│       │  (Deterministic Safe Escalation) │ │
│  └──────────────┬──────────────┘       └────────────────┬─────────────────┘ │
│                 │                                       │                   │
│                 ▼                                       │                   │
│  ┌─────────────────────────────┐                        │                   │
│  │     AIRiskEvaluator         │                        │                   │
│  │ (Risk Flags & Confidence)   │                        │                   │
│  └──────────────┬──────────────┘                        │                   │
│                 │                                       │                   │
│                 └───────────────────────┬───────────────┘                   │
│                                         ▼                                   │
│                        ┌─────────────────────────────────┐                  │
│                        │      AIDecisionResult Contract  │                  │
│                        └────────────────┬────────────────┘                  │
│                                         │                                   │
│                                         ▼                                   │
│                        ┌─────────────────────────────────┐                  │
│                        │       AIDecisionService         │                  │
│                        │ - Persist RecoveryDecision (DB) │                  │
│                        │ - Record AuditEvent in Postgres │                  │
│                        └────────────────┬────────────────┘                  │
└─────────────────────────────────────────┼───────────────────────────────────┘
                                          │
                                          ▼
                      ┌──────────────────────────────────────┐
                      │ Phase 7 (Deterministic Policy Gate)  │
                      └──────────────────────────────────────┘
```

---

## 2. Inbound Interface (Phase 5 ➔ Phase 6)

Phase 6 strictly consumes the immutable [`CustomerRecoveryContext`](file:///d:/SmartMandateRetry/backend/app/domain/customer_context.py) emitted by Phase 5:
- `case`: `case_id`, `invoice_id`, `amount_inr`, `stage`, `state`, `age_hours`
- `subscription`: `subscription_id`, `status`, `plan_id`, `current_cycle`, `age_days`
- `customer`: `customer_id`, `tenure_months`, `historical_success_rate`, `masked_email`, `masked_contact`
- `payment_history`: `total_attempts`, `successful_payments`, `failed_payments`, `consecutive_failures`, `recent_failures_30d`, `sample_size`, `data_confidence`
- `recovery_history`: `prior_recovery_cases`, `prior_successful_recoveries`, `prior_failed_recoveries`, `recovery_success_rate`, `last_recovery_strategy`
- `failure_assessment`: `failure_category`, `failure_code`, `recoverability`, `severity`, `confidence`, `is_hard_decline`, `evidence`
- `quality`: `context_version`, `completeness_score`, `is_enriched_via_api`, `missing_fields`

---

## 3. Allowed Recovery Strategies & Taxonomy

Based on frozen specifications [`DOC-DOM-004`](file:///d:/SmartMandateRetry/docs/02_Domain/RECOVERY_STRATEGIES.md) and [`DOC-AI-001`](file:///d:/SmartMandateRetry/docs/05_AI/AI_DECISION_SPEC.md):

| Strategy Identifier | Recommended Action | Description | Allowed Delay (Hours) | Typical Scenario |
|---|---|---|---|---|
| `STRAT_SCHEDULED_CHECK` | `SCHEDULE_RECOVERY_CHECK` | Aligns recovery retry with customer liquidity/recovery window. | $12 - 168$ | `TEMPORARY_LIQUIDITY`, `TEMPORARY_TECHNICAL` |
| `STRAT_PAYMENT_LINK` | `PAYMENT_LINK_RECOVERY` | Generates out-of-band payment link for customer payment. | $0 - 72$ | `ACTION_REQUIRED_INSTRUMENT`, Halted recovery |
| `STRAT_MANDATE_UPDATE_PROMPT` | `PAYMENT_METHOD_RECOVERY` | Requests customer mandate instrument update via Razorpay. | $0 - 48$ | `ACTION_REQUIRED_INSTRUMENT` (Pending stage) |
| `STRAT_HUMAN_ESCALATE` | `MANUAL_ESCALATION` | Routes to merchant operations inbox for manual follow-up. | $0$ | Low AI confidence ($<0.75$), ambiguous errors |
| `STRAT_TERMINAL_STOP` | `STOP` | Ceases automated intervention. | $0$ | `PERMANENT_HARD_DECLINE`, fraud, max retries |

---

## 4. Prompt Engineering & System Prompt Contract

### System Prompt (`version: 1.0.0`)
```text
You are the AI Recovery Reasoning Engine for SmartMandateRetry.
Your task is to analyze failed recurring subscription payments and propose an optimal, bounded recovery strategy.

Operational Guidelines:
1. You do NOT execute financial actions. You only formulate structured strategy proposals.
2. Evaluate failure root cause: temporary liquidity shortage vs expired payment method vs bank technical downtime vs hard decline.
3. Factor in customer tenure, lifetime value, and historical payment success rates.
4. Output strictly valid JSON conforming to the requested schema. Do not include markdown code fences or conversational text outside the JSON object.
```

### User Prompt
The user prompt provides the serialized, sanitized `CustomerRecoveryContext` in JSON format with explicit instructions to populate:
- `failure_class`: `"TEMPORARY"` | `"PERMANENT"` | `"ACTION_REQUIRED"` | `"RISK"` | `"UNKNOWN"`
- `recommended_action`: `"SCHEDULE_RECOVERY_CHECK"` | `"PAYMENT_LINK_RECOVERY"` | `"PAYMENT_METHOD_RECOVERY"` | `"MANUAL_ESCALATION"` | `"STOP"`
- `delay_hours`: Integer between $0$ and $168$
- `confidence`: Float between $0.00$ and $1.00$
- `reasoning`: Concise explanation (max 500 characters)
- `risk_flags`: List of strings (`LOW_CONFIDENCE`, `HIGH_VALUE_EXPOSURE`, `MULTIPLE_FAILURES`, etc.)

---

## 5. Output Validation Schema (`AIDecisionOutput`)

```python
class FailureClassEnum(str, Enum):
    TEMPORARY = "TEMPORARY"
    PERMANENT = "PERMANENT"
    ACTION_REQUIRED = "ACTION_REQUIRED"
    RISK = "RISK"
    UNKNOWN = "UNKNOWN"

class RecommendedActionEnum(str, Enum):
    SCHEDULE_RECOVERY_CHECK = "SCHEDULE_RECOVERY_CHECK"
    PAYMENT_LINK_RECOVERY = "PAYMENT_LINK_RECOVERY"
    PAYMENT_METHOD_RECOVERY = "PAYMENT_METHOD_RECOVERY"
    MANUAL_ESCALATION = "MANUAL_ESCALATION"
    STOP = "STOP"

class AIDecisionOutput(BaseModel):
    failure_class: FailureClassEnum
    recommended_action: RecommendedActionEnum
    delay_hours: int = Field(ge=0, le=168)
    confidence: Decimal = Field(ge=Decimal("0.0"), le=Decimal("1.0"))
    reasoning: str = Field(min_length=5, max_length=500)
    risk_flags: List[str] = Field(default_factory=list)
```

---

## 6. Deterministic Fallback & Fail-Safe Architecture

If any of the following failure conditions occur:
1. OpenRouter API timeout ($>5.0\text{s}$)
2. HTTP $4\text{xx}$ (rate limit / unauthorized) or $5\text{xx}$ (gateway outage)
3. Malformed JSON response or missing required schema fields
4. AI confidence score $< 0.75$

The `FallbackDecisionEngine` deterministically routes the decision:
- For `PERMANENT_HARD_DECLINE` assessment: `recommended_action="STOP"`, `confidence=1.00`, `risk_flags=["HARD_DECLINE_DETECTED", "DETERMINISTIC_FALLBACK"]`
- For all other errors / low confidence: `recommended_action="MANUAL_ESCALATION"`, `delay_hours=0`, `confidence=Decimal("0.50")`, `risk_flags=["LLM_FALLBACK", "MANUAL_REVIEW_REQUIRED"]`

---

## 7. Persistence & Audit Logging

- **Persistence Target:** `recovery_decisions` table:
  - `id`: `dec_...`
  - `recovery_case_id`: FK to `recovery_cases.id`
  - `recommended_action`: e.g. `"SCHEDULE_RECOVERY_CHECK"`
  - `delay_hours`: Integer
  - `confidence`: Decimal
  - `reasoning`: Text
  - `risk_flags`: JSON array
  - `created_at`: UTC timestamp
- **Audit Logging:** Append-only `audit_events` with `event_type="AI_DECISION_PRODUCED"`, `actor="AI_DECISION_ENGINE"`, containing model name, prompt version, full decision payload, and correlation ID.

---

## 8. Security & Secret Protection

- **Zero Credentials:** No API keys, webhook secrets, or headers are ever passed to the LLM.
- **Zero Raw Tokens:** Customer card numbers and payment tokens are completely omitted.
- **Zero PII:** Email and phone numbers are pre-masked by Phase 5 (`ContextSanitizer`).
- **Prompt Injection Defense:** Prompt builder wraps context in structured delimiters with strict JSON format enforcement.

---

## 9. Phase 6 Granular Task Breakdown

| Task ID | Component | Task Description | Priority | Dependencies |
|---|---|---|---|---|
| `TSK-013-01` | Decision Schema | Define `AIDecisionOutput` and `AIDecisionResult` domain contracts | P0 | Phase 5 |
| `TSK-013-02` | Prompt Builder | Implement `AIPromptBuilder` with versioning (`1.0.0`) and structured user prompt | P0 | `TSK-013-01` |
| `TSK-013-03` | OpenRouter Client | Implement `OpenRouterClient` with JSON mode, retry, and 5s timeout | P0 | `TSK-013-01` |
| `TSK-013-04` | Mock Provider | Implement `MockLLMProvider` for deterministic testing without external API calls | P0 | `TSK-013-01` |
| `TSK-013-05` | Schema Validator | Implement `AIDecisionValidator` validating bounds, types, and allowed actions | P0 | `TSK-013-01` |
| `TSK-013-06` | Risk Evaluator | Implement `AIRiskEvaluator` evaluating confidence thresholds and risk flags | P0 | `TSK-013-05` |
| `TSK-013-07` | Fallback Engine | Implement `FallbackDecisionEngine` for timeout/malformed/low-confidence cases | P0 | `TSK-013-06` |
| `TSK-013-08` | AI Engine Core | Implement `AIDecisionEngine` orchestrating prompt, client, validation, fallback | P0 | `TSK-013-02..07` |
| `TSK-013-09` | Service Layer | Implement `AIDecisionService` with UnitOfWork database transaction isolation | P0 | `TSK-013-08` |
| `TSK-013-10` | Audit Logger | Record `AuditEvent` (`AI_DECISION_PRODUCED`) with model/prompt metadata | P0 | `TSK-013-09` |
| `TSK-013-11` | Observability | Instrument engine with structured telemetry (latency, tokens, fallback rate) | P1 | `TSK-013-09` |
| `TSK-013-12` | Test Fixtures | Build synthetic test scenarios for all 5 failure classes and recovery strategies | P0 | `TSK-013-01` |
| `TSK-013-13` | Unit Tests | Unit tests for prompts, validators, risk flags, and fallbacks (100% branch) | P0 | `TSK-013-02..08` |
| `TSK-013-14` | Integration Tests | Integration tests saving `RecoveryDecision` and `AuditEvent` to PostgreSQL | P0 | `TSK-013-09, 10` |
| `TSK-013-15` | Resilience Tests | Chaos & fault tests (OpenRouter timeout, 429 rate limit, 500 error, malformed JSON) | P0 | `TSK-013-07, 14` |

---

## 10. Definition of Done (DoD) for Phase 6

- [ ] `AIDecisionOutput` Pydantic model enforces strict validation for all 5 failure classes and 5 recommended actions.
- [ ] `AIPromptBuilder` formats versioned prompts using only sanitized `CustomerRecoveryContext` (0 PII/secrets).
- [ ] `OpenRouterClient` communicates with OpenRouter with JSON mode, authorization headers, and 5s timeout.
- [ ] `FallbackDecisionEngine` deterministically routes timeouts, gateway errors, malformed responses, and low confidence ($<0.75$) to safe fallbacks.
- [ ] `RecoveryDecision` is persisted in PostgreSQL with foreign keys and OCC integrity.
- [ ] Append-only `AuditEvent` (`AI_DECISION_PRODUCED`) is recorded in PostgreSQL.
- [ ] 100% branch coverage across prompt builder, schema validator, risk evaluator, and fallback engine.
- [ ] Full backend test suite passes with 0 failures (`pytest backend/tests/`).
- [ ] Zero secrets detected in repo or logs.
- [ ] Zero Phase 7+ logic (Policy Engine rule evaluation, Payment Link generation, Celery task scheduling, customer messaging) implemented.
