# SmartMandateRetry — Phase 5 Implementation Plan: Customer Context & Recovery Intelligence

> **Document ID:** DOC-PROG-018  
> **Phase:** Phase 5 — Customer Context & Recovery Intelligence  
> **Status:** PLANNING BASELINE  
> **Author:** Principal Systems Architect  
> **Dependencies:** Phase 2 (Database Foundation), Phase 3 (Webhook Ingestion), Phase 4 (Failure Intelligence)  

---

## 1. Phase 5 Objective & Architectural Boundary

### Objective
The objective of Phase 5 is to build a deterministic, explainable, provider-neutral **Customer Recovery Context Aggregation Layer** that combines:
1. Current Recovery Case attributes & State/Stage
2. Phase 4 `FailureAssessment` (diagnostic taxonomy, recoverability, confidence)
3. Customer profile (`tenure_months`, `historical_success_rate`)
4. Subscription metadata (`plan_id`, `status`, `current_cycle`)
5. Payment history metrics (success/failure rates, recent failure streaks)
6. Recovery history metrics (prior recovery attempts, strategies, and outcomes)

### Core Architectural Principle
> **Phase 5 strictly answers:**  
> *"What relevant historical and current context do we know about this customer, subscription, and recovery case?"*  
> **Phase 5 does NOT answer:**  
> *"What recovery action should SmartMandateRetry take?"*  

The output of Phase 5 is an immutable, sanitized, typed [`CustomerRecoveryContext`](file:///d:/SmartMandateRetry/backend/app/domain/customer_context.py) payload ready for consumption by Phase 6 (AI Decision Engine) and Phase 7 (Policy Engine).

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          PHASE 5 CONTEXT PIPELINE                           │
│                                                                             │
│  ┌──────────────────┐  ┌───────────────────┐  ┌───────────────────────────┐ │
│  │   RecoveryCase   │  │ FailureAssessment │  │   Customer & Subscription │ │
│  │    (Phase 2)     │  │     (Phase 4)     │  │          (Phase 2)        │ │
│  └────────┬─────────┘  └─────────┬─────────┘  └─────────────┬─────────────┘ │
│           │                      │                          │               │
│           └──────────────────────┼──────────────────────────┘               │
│                                  ▼                                          │
│             ┌─────────────────────────────────────────┐                     │
│             │       Context Data Collector Service    │                     │
│             │  - Local DB Aggregation (Authoritative) │                     │
│             │  - Optional Razorpay API Enrichment     │                     │
│             └────────────────────┬────────────────────┘                     │
│                                  │                                          │
│                                  ▼                                          │
│             ┌─────────────────────────────────────────┐                     │
│             │  Deterministic Metric & Recency Engine  │                     │
│             │  - Success/Failure Rates + Sample Sizes │                     │
│             │  - Consecutive Failure Streaks          │                     │
│             └────────────────────┬────────────────────┘                     │
│                                  │                                          │
│                                  ▼                                          │
│             ┌─────────────────────────────────────────┐                     │
│             │      Sanitizer & PII Minimization       │                     │
│             │  - Strips credentials & raw tokens      │                     │
│             │  - Masks email & phone numbers          │                     │
│             └────────────────────┬────────────────────┘                     │
│                                  │                                          │
│                                  ▼                                          │
│             ┌─────────────────────────────────────────┐                     │
│             │     CustomerRecoveryContext (v1.0.0)    │                     │
│             └────────────────────┬────────────────────┘                     │
└──────────────────────────────────┼──────────────────────────────────────────┘
                                   │ (Immutable Contract)
                                   ▼
          ┌──────────────────────────────────────────────────┐
          │ Phase 6 (AI Decision) & Phase 7 (Policy Engine)  │
          └──────────────────────────────────────────────────┘
```

---

## 2. Inbound Interface (Phase 4 ➔ Phase 5)

Phase 5 directly consumes the Phase 4 [`FailureAssessment`](file:///d:/SmartMandateRetry/backend/app/domain/failure_assessment.py):
- `failure_category`: Canonical enum (`TEMPORARY_LIQUIDITY`, `TEMPORARY_TECHNICAL`, `ACTION_REQUIRED_INSTRUMENT`, `ACTION_REQUIRED_AUTH`, `PERMANENT_HARD_DECLINE`, `UNKNOWN_AMBIGUOUS`)
- `failure_code`: Standardized code string (`INSUFFICIENT_FUNDS`, `CARD_EXPIRED`, `DO_NOT_HONOUR`, etc.)
- `recoverability`: Enum (`RECOVERABLE`, `CONDITIONAL`, `NON_RECOVERABLE`, `UNKNOWN`)
- `severity`: Enum (`LOW`, `MEDIUM`, `HIGH`)
- `confidence`: Decimal ($0.00$ to $1.00$)
- `is_hard_decline`: Boolean flag
- `evidence`: Detailed explainability metadata dictionary
- `classifier_version`: String (`"1.0.0"`)

---

## 3. Verified Field Classification Matrix

Each candidate context field is strictly classified into its source of truth:

| Field Name | Context Sub-object | Field Classification | Fallback / Null Behavior |
|---|---|---|---|
| `case_id` | Current Case | **AVAILABLE FROM EXISTING DB** (`recovery_cases.id`) | Required |
| `invoice_id` | Current Case | **AVAILABLE FROM EXISTING DB** (`recovery_cases.invoice_id`) | Required |
| `amount_inr` | Current Case | **AVAILABLE FROM EXISTING DB** (`recovery_cases.amount_inr`) | Required |
| `currency` | Current Case | **AVAILABLE FROM EXISTING DB** (`recovery_cases.currency`) | Defaults to `"INR"` |
| `stage` | Current Case | **AVAILABLE FROM EXISTING DB** (`recovery_cases.stage`) | `"PENDING_OBSERVATION"` or `"HALTED_RECOVERY"` |
| `state` | Current Case | **AVAILABLE FROM EXISTING DB** (`recovery_cases.state`) | e.g. `"DETECTED"`, `"IN_RECOVERY"` |
| `subscription_id` | Subscription | **AVAILABLE FROM EXISTING DB** (`subscriptions.razorpay_subscription_id`) | Required |
| `subscription_status` | Subscription | **AVAILABLE FROM EXISTING DB** (`subscriptions.status`) | Fallback to `"unknown"` |
| `plan_id` | Subscription | **AVAILABLE FROM EXISTING DB** (`subscriptions.plan_id`) | Required |
| `current_cycle` | Subscription | **AVAILABLE FROM EXISTING DB** (`subscriptions.current_cycle`) | Integer $\ge 1$ |
| `customer_id` | Customer | **AVAILABLE FROM EXISTING DB** (`customers.razorpay_customer_id`) | Required |
| `tenure_months` | Customer | **AVAILABLE FROM EXISTING DB** (`customers.tenure_months`) | Integer $\ge 0$ |
| `historical_success_rate`| Customer | **AVAILABLE FROM EXISTING DB** (`customers.historical_success_rate`) | Decimal $0.00$ to $1.00$ |
| `total_payment_attempts` | Payment History | **DERIVED LOCALLY** (Count of webhook events & past invoices) | Integer $\ge 0$ |
| `consecutive_failures` | Payment History | **DERIVED LOCALLY** (Recent consecutive `payment.failed` count) | Integer $\ge 0$ |
| `recent_failure_count` | Payment History | **DERIVED LOCALLY** (Failures in last 30 days) | Integer $\ge 0$ |
| `sample_size` | Payment History | **DERIVED LOCALLY** (Total historical payment sample count) | Integer $\ge 0$ |
| `prior_cases_count` | Recovery History | **DERIVED LOCALLY** (`recovery_cases` count for this subscription) | Integer $\ge 0$ |
| `prior_recovered_count`| Recovery History | **DERIVED LOCALLY** (`RECOVERED` cases count for subscription) | Integer $\ge 0$ |
| `last_recovery_strategy`| Recovery History | **DERIVED LOCALLY** (Latest `RecoveryDecision.recommended_action`) | `None` if no prior case |
| `credit_score` / `salary` | Customer | **NOT AVAILABLE** | Excluded (Prohibited) |
| `card_number` / `cvv` | Payment Instrument | **NOT AVAILABLE** | Excluded (PCI/DSS Security Guardrail) |

---

## 4. Structured Domain Contract (`CustomerRecoveryContext`)

```python
@dataclass(frozen=True)
class CaseContext:
    case_id: str
    invoice_id: str
    amount_inr: Decimal
    currency: str
    stage: str
    state: str
    created_at: datetime
    age_hours: int

@dataclass(frozen=True)
class SubscriptionContext:
    subscription_id: str
    status: str
    plan_id: str
    current_cycle: int
    created_at: datetime
    age_days: int

@dataclass(frozen=True)
class CustomerProfileContext:
    customer_id: str
    tenure_months: int
    historical_success_rate: Decimal
    masked_email: Optional[str]
    masked_contact: Optional[str]

@dataclass(frozen=True)
class PaymentHistoryContext:
    total_attempts: int
    successful_payments: int
    failed_payments: int
    consecutive_failures: int
    recent_failures_30d: int
    sample_size: int
    data_confidence: str  # HIGH (sample >= 5), LOW (sample < 5), INSUFFICIENT (sample == 0)

@dataclass(frozen=True)
class RecoveryHistoryContext:
    prior_recovery_cases: int
    prior_successful_recoveries: int
    prior_failed_recoveries: int
    recovery_success_rate: Optional[Decimal]
    last_recovery_strategy: Optional[str]
    last_recovery_at: Optional[datetime]

@dataclass(frozen=True)
class DataQualityContext:
    context_version: str = "1.0.0"
    completeness_score: Decimal = Decimal("1.00")
    is_enriched_via_api: bool = False
    missing_fields: List[str] = field(default_factory=list)
    generated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

@dataclass(frozen=True)
class CustomerRecoveryContext:
    case: CaseContext
    subscription: SubscriptionContext
    customer: CustomerProfileContext
    payment_history: PaymentHistoryContext
    recovery_history: RecoveryHistoryContext
    failure_assessment: FailureAssessment
    quality: DataQualityContext
```

---

## 5. Derived Metrics & Mathematical Formulas

1. **Payment Success Rate:**
   $$\text{historical\_success\_rate} = \frac{\text{successful\_payments}}{\text{total\_attempts}} \quad (\text{if } \text{total\_attempts} > 0 \text{ else } 1.00)$$
2. **Recovery Success Rate:**
   $$\text{recovery\_success\_rate} = \frac{\text{prior\_successful\_recoveries}}{\text{prior\_recovery\_cases}} \quad (\text{if } \text{prior\_recovery\_cases} > 0 \text{ else None})$$
3. **Data Confidence Tier:**
   - $\text{sample\_size} \ge 5 \implies \text{"HIGH"}$
   - $1 \le \text{sample\_size} < 5 \implies \text{"LOW"}$
   - $\text{sample\_size} == 0 \implies \text{"INSUFFICIENT"}$
4. **Consecutive Failure Streak:**
   Count of uninterrupted `payment.failed` events immediately preceding current timestamp.

---

## 6. Sanitization & PII Minimization Rules

- **Email Masking:** `john.doe@example.com` ➔ `j***e@example.com`
- **Contact Masking:** `+919876543210` ➔ `+91******3210`
- **Zero Credentials:** Webhook secrets, Razorpay API keys, and HTTP headers are strictly excluded from context serializations.
- **Zero Raw Tokens:** Raw payment tokens or gateway authorization identifiers are not passed into decision contexts.

---

## 7. Persistence & Caching Strategy

- **On-Demand Computation:** `CustomerRecoveryContext` is computed synchronously upon demand (sub-10ms query execution across indexed foreign keys).
- **No Extra Tables Required:** Existing tables (`customers`, `subscriptions`, `recovery_cases`, `recovery_decisions`, `recovery_actions`, `audit_events`) store all underlying raw data.
- **Audit Persistence:** Whenever a decision cycle begins, the serialized context summary is recorded in `audit_events` with `event_type="CUSTOMER_CONTEXT_AGGREGATED"`.

---

## 8. Optional Razorpay API Enrichment & Graceful Degradation

- **Primary Source:** Local PostgreSQL database (fastest, zero network latency, 100% resilient).
- **Secondary Enrichment (Optional):** [`RazorpayClient.fetch_subscription`](file:///d:/SmartMandateRetry/backend/app/infrastructure/razorpay_client.py) can enrich real-time cycle details if local state is stale.
- **Fail-Safe Behavior:** If Razorpay API times out ($>2.0\text{s}$) or returns 5xx/429, the context builder gracefully marks `quality.is_enriched_via_api = False` and returns the local DB context without raising an unhandled exception.

---

## 9. Phase 5 Granular Task Breakdown

| Task ID | Component | Task Description | Priority | Dependencies |
|---|---|---|---|---|
| `TSK-012-01` | Domain Model | Define `CustomerRecoveryContext` and sub-context dataclasses with full serialization | P0 | Phase 4 |
| `TSK-012-02` | Sanitizer | Implement `ContextSanitizer` with email/phone masking and credential scrubbing | P0 | `TSK-012-01` |
| `TSK-012-03` | Metric Calculator | Implement `DerivedMetricCalculator` for success rates, streaks, and confidence tiers | P0 | `TSK-012-01` |
| `TSK-012-04` | History Aggregator | Implement `PaymentHistoryAggregator` querying past events & case outcomes | P0 | `TSK-012-03` |
| `TSK-012-05` | Recovery Aggregator| Implement `RecoveryHistoryAggregator` querying prior decisions & actions | P0 | `TSK-012-03` |
| `TSK-012-06` | Context Builder | Implement `CustomerContextBuilder` orchestrating the aggregation pipeline | P0 | `TSK-012-01..05` |
| `TSK-012-07` | API Enrichment | Implement graceful Razorpay API enrichment client with 2s timeout & fallback | P1 | `TSK-012-06` |
| `TSK-012-08` | Quality Evaluator | Implement `DataQualityEvaluator` computing completeness score and missing fields | P0 | `TSK-012-06` |
| `TSK-012-09` | Service Integration| Implement `CustomerContextService` with UnitOfWork transaction isolation | P0 | `TSK-012-06` |
| `TSK-012-10` | Audit Logger | Record `AuditEvent` (`CUSTOMER_CONTEXT_AGGREGATED`) upon context creation | P0 | `TSK-012-09` |
| `TSK-012-11` | Observability | Instrument context builder with latency metrics and missing-data telemetry | P1 | `TSK-012-09` |
| `TSK-012-12` | Test Fixtures | Build synthetic customer & history fixtures (new, established, high failure) | P0 | `TSK-012-01` |
| `TSK-012-13` | Unit Tests | Unit tests for metric formulas, sample-size tiers, and sanitization (100% branch) | P0 | `TSK-012-02..08` |
| `TSK-012-14` | Integration Tests | Integration tests querying live DB for customer context aggregation | P0 | `TSK-012-09, 10` |
| `TSK-012-15` | Resilience Tests | Chaos & fault tests (API timeouts, missing customer record, zero history) | P0 | `TSK-012-07, 14` |

---

## 10. Definition of Done (DoD) for Phase 5

- [ ] `CustomerRecoveryContext` encapsulates case, subscription, customer, payment history, recovery history, failure assessment, and data quality.
- [ ] Sanitizer masks all customer PII and strips credentials with zero leakage.
- [ ] Metric calculator handles zero-history, small-sample, and multi-year customer profiles deterministically.
- [ ] Razorpay API enrichment fails open/safely to local DB data upon network error or timeout.
- [ ] Audit event `CUSTOMER_CONTEXT_AGGREGATED` recorded immutably in PostgreSQL.
- [ ] 100% branch coverage across metric calculations and sanitization rules.
- [ ] Zero Phase 6+ logic (OpenRouter prompts, Policy Engine evaluations, Payment Link dispatch) implemented.
- [ ] Full backend test suite passes with 0 regressions.
- [ ] Security scanner reports 0 secrets.
