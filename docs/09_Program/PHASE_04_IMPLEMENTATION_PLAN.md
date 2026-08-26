# SmartMandateRetry — Phase 4 Implementation Plan: Failure Intelligence & Payment Failure Classification

> **Document ID:** DOC-PROG-016  
> **Phase:** Phase 4 — Failure Intelligence & Payment Failure Classification  
> **Status:** PLANNING (Awaiting User Approval)  
> **Authoritative References:**  
> - [`docs/02_Domain/RECOVERY_STRATEGIES.md`](../02_Domain/RECOVERY_STRATEGIES.md) [DOC-DOM-004]  
> - [`docs/02_Domain/DOMAIN_MODEL.md`](../02_Domain/DOMAIN_MODEL.md) [DOC-DOM-001]  
> - [`docs/03_API/WEBHOOK_SPECIFICATION.md`](../03_API/WEBHOOK_SPECIFICATION.md) [DOC-API-002]  
> - [`docs/04_Data/DATABASE_DESIGN.md`](../04_Data/DATABASE_DESIGN.md) [DOC-DATA-001]  
> - [`docs/09_Program/PHASE_03_COMPLETION_REPORT.md`](PHASE_03_COMPLETION_REPORT.md) [DOC-PROG-015]  

---

## 1. Phase Objective

Build the deterministic, explainable, provider-neutral **Failure Intelligence & Classification Engine** that transforms inbound normalized Razorpay `PAYMENT_FAILED` events into a structured `FailureAssessment`.

Phase 4 strictly answers two diagnostic questions:
1. **"What happened?"** (Categorize gateway error evidence into a standardized taxonomy)
2. **"Is this failure potentially recoverable?"** (Determine recoverability status, severity, and confidence)

Phase 4 does **NOT** decide or execute recovery interventions (no AI prompts, no policy enforcement, no Payment Link creation, no customer communications).

```
┌────────────────────────────────────────┐
│ Inbound `NormalizedWebhookEvent`       │
│ (event_type = PAYMENT_FAILED)          │
└──────────────────┬─────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────┐
│ 1. Failure Evidence Extractor          │ (Extracts error_code, error_reason, source, step, method)
└──────────────────┬─────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────┐
│ 2. Declarative Rule Registry           │ (Matches gateway error codes against deterministic rules)
└──────────────────┬─────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────┐
│ 3. Recoverability & Severity Evaluator │ (Assigns RECOVERABLE / CONDITIONAL / NON_RECOVERABLE)
└──────────────────┬─────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────┐
│ 4. Deterministic Confidence Calculator │ (Computes 0.00-1.00 confidence score based on rule specificity)
└──────────────────┬─────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────┐
│ 5. Structured `FailureAssessment`      │ (Immutable, explainable assessment contract)
└──────────────────┬─────────────────────┘
                   │
                   ▼
┌────────────────────────────────────────┐
│ 6. Downstream Handoff & Audit Log      │ (Updates `RecoveryCase`, records `AuditEvent`)
└────────────────────────────────────────┘
```

---

## 2. Scope & Strict Non-Scope

### 2.1 Scope of Phase 4
1. **Failure Evidence Extraction:** Parsing and sanitizing `error_code`, `error_description`, `error_source`, `error_step`, and `error_reason` from normalized event payloads.
2. **Declarative Rule Registry:** Extensible, versioned catalog mapping Razorpay-specific error codes into standardized categories.
3. **Provider-Neutral Failure Taxonomy:** Categorization into 6 canonical classes (`TEMPORARY_LIQUIDITY`, `TEMPORARY_TECHNICAL`, `ACTION_REQUIRED_INSTRUMENT`, `ACTION_REQUIRED_AUTH`, `PERMANENT_HARD_DECLINE`, `UNKNOWN_AMBIGUOUS`).
4. **Recoverability Classification:** Explicit assignment of `RECOVERABLE`, `CONDITIONAL`, `NON_RECOVERABLE`, or `UNKNOWN`.
5. **Deterministic Confidence Model:** Repeatable calculation of assessment confidence ($0.00$ to $1.00$).
6. **Structured Domain Contract:** Typed `FailureAssessment` dataclass with full diagnostic evidence and classifier versioning.
7. **Audit & Traceability:** Recording immutable `AuditEvent` (`event_type="FAILURE_CLASSIFIED"`) with correlation IDs and complete explainability payloads.
8. **Comprehensive Test Suite:** 25+ automated unit and integration tests covering all error codes, missing fields, ambiguous text, and classifier versioning.

### 2.2 Strict Non-Scope (Deferred to Subsequent Phases)
- ❌ OpenRouter / LLM decision prompts or AI strategy selection (Phase 6).
- ❌ Customer intelligence aggregation or multi-cycle scoring (Phase 5).
- ❌ Deterministic Policy Engine rule execution (e.g. `hard_decline_auto_stop` veto enforcement) (Phase 7).
- ❌ Payment Link generation via Razorpay API (Phase 8).
- ❌ Celery recovery task scheduling or dispatch (Phase 8).
- ❌ Outcome reconciliation or case `RECOVERED` mutations (Phase 9).
- ❌ Merchant notifications or customer-facing communications.

---

## 3. Verified Razorpay Payment Failure Evidence

Verified against official Razorpay developer documentation (`https://razorpay.com/docs/payments/payment-gateway/error-codes/`):

| Field Name | Availability | Type | Example Values | Handling Strategy |
|---|---|---|---|---|
| `error_code` | **Required** | String | `BAD_REQUEST_ERROR`, `GATEWAY_ERROR`, `SERVER_ERROR` | Top-level gateway error family classification. |
| `error_description` | **Required** | String | "The card has insufficient funds", "Payment was declined by bank" | Text fallback when machine reason is ambiguous. |
| `error_source` | **Required** | String | `customer`, `bank`, `gateway`, `business` | Identifies origin of failure (e.g. customer vs bank vs gateway). |
| `error_step` | **Required** | String | `payment_authorization`, `payment_authentication`, `payment_initiation` | Identifies lifecycle failure stage. |
| `error_reason` | **Optional** (Usually Present) | String | `insufficient_funds`, `card_expired`, `do_not_honour`, `account_closed` | **Primary key** for deterministic rule mapping. |
| `method` | **Optional** | String | `card`, `upi`, `netbanking`, `emandate`, `nach` | Contextual evidence for instrument-specific rules. |

---

## 4. Provider-Neutral Failure Taxonomy & Classification Matrix

| Category Identifier | Category Name | Gateway Reasons / Patterns | Recoverability | Severity | Confidence | Hard Decline? | Description |
|---|---|---|---|---|---|---|---|
| `TEMPORARY_LIQUIDITY` | Insufficient Balance | `insufficient_funds`, `limit_exceeded`, `insufficient_balance` | `RECOVERABLE` | `LOW` | `1.00` | No | Account balance shortfall; recoverable once customer funds account. |
| `TEMPORARY_TECHNICAL` | Gateway / Bank Outage | `gateway_technical_error`, `bank_technical_error`, `network_error`, `server_error`, `timed_out` | `RECOVERABLE` | `LOW` | `1.00` | No | Transient connectivity / server issue; recoverable via delayed auto-retry. |
| `ACTION_REQUIRED_INSTRUMENT` | Invalid / Expired Instrument | `card_expired`, `expired_card`, `mandate_inactive`, `token_invalidated`, `issuer_not_supported`, `international_card_not_supported` | `CONDITIONAL` | `MEDIUM` | `0.95` | No | Existing mandate token unusable; recoverable via mandate update or payment link. |
| `ACTION_REQUIRED_AUTH` | Authentication Failure | `authentication_failed`, `otp_not_entered`, `pin_incorrect`, `2fa_failed` | `CONDITIONAL` | `MEDIUM` | `0.90` | No | Authorization failure; customer intervention required to re-authenticate. |
| `PERMANENT_HARD_DECLINE` | Permanent Bank Decline | `do_not_honour`, `account_closed`, `fraud_suspected`, `card_lost_or_stolen`, `card_blocked`, `mandate_revoked` | `NON_RECOVERABLE` | `HIGH` | `1.00` | **Yes** | Hard terminal stop; issuing bank explicitly refused further charges. |
| `UNKNOWN_AMBIGUOUS` | Unmapped / Generic Error | Unmapped error codes, blank reasons, non-standard bank descriptions | `UNKNOWN` | `MEDIUM` | `0.50` | No | Inconclusive evidence; routed to AI ambiguity triage or manual operations review. |

---

## 5. Recoverability & Confidence Models

### 5.1 Recoverability Semantics
- **`RECOVERABLE`**: The failure is transient. Retrying without changing payment details is likely to succeed once the condition resolves (e.g. balance replenished, gateway recovers).
- **`CONDITIONAL`**: The current mandate token cannot be auto-charged as-is, but the debt is recoverable if the customer takes an out-of-band action (e.g. updating card, paying via payment link).
- **`NON_RECOVERABLE`**: The issuing bank or risk engine issued a permanent hard decline. Further automated charge attempts violate scheme rules and must be stopped immediately.
- **`UNKNOWN`**: Insufficient evidence to determine recoverability. Defaults safely to `UNKNOWN` without assuming automatic success.

### 5.2 Deterministic Confidence Calculation
Confidence is scored on an exact numeric scale from `0.00` to `1.00`:
- **`1.00` (Exact Match):** Explicit match on standardized `error_reason` (e.g. `insufficient_funds`, `do_not_honour`).
- **`0.95` (Pattern / Secondary Field Match):** Exact match on instrument code with corroborating `error_source`.
- **`0.85` (Description Keyword Match):** Normalized keyword match on `error_description` when `error_reason` is generic.
- **`0.50` (Ambiguous / Unknown):** Unrecognized error code or unmapped bank description.

---

## 6. Structured Failure Assessment Contract

Implemented as a typed, immutable dataclass in `backend/app/domain/failure_assessment.py`:

```python
@dataclass(frozen=True)
class FailureAssessment:
    assessment_id: str                 # "ass_..."
    provider: str                      # "razorpay"
    payment_id: str                    # "pay_..."
    subscription_id: Optional[str]     # "sub_..."
    invoice_id: Optional[str]          # "inv_..."
    failure_category: str              # "TEMPORARY_LIQUIDITY", "PERMANENT_HARD_DECLINE", etc.
    failure_code: str                  # Standardized code e.g. "INSUFFICIENT_FUNDS"
    raw_error_reason: Optional[str]    # Raw gateway error reason
    raw_error_code: Optional[str]      # Raw gateway error code
    recoverability: str                # "RECOVERABLE", "NON_RECOVERABLE", "CONDITIONAL", "UNKNOWN"
    severity: str                      # "LOW", "MEDIUM", "HIGH"
    confidence: Decimal                # Decimal("0.00") to Decimal("1.00")
    evidence: Dict[str, Any]           # Full explainable metadata
    is_hard_decline: bool              # True for permanent veto candidates
    classifier_version: str            # e.g. "1.0.0"
    classified_at: datetime            # UTC timestamp
```

---

## 7. Pipeline & Rule Registry Architecture

```
[NormalizedWebhookEvent]
           │
           ▼
[FailureEvidenceExtractor] ──► Extracts: {code, reason, description, source, step, method}
           │
           ▼
[FailureRuleRegistry]
   ├── Rule 1: Exact `error_reason` lookup
   ├── Rule 2: Composite (`error_code` + `error_source` + `error_step`) lookup
   ├── Rule 3: Text pattern matcher on `error_description`
   └── Rule 4: Fallback unknown handler
           │
           ▼
[FailureAssessmentBuilder]
   ├── Assigns failure_category, failure_code, recoverability, severity
   ├── Computes exact deterministic confidence
   ├── Attaches explainable evidence dictionary
   └── Tags classifier_version = "1.0.0"
           │
           ▼
[FailureAssessment]
```

---

## 8. Persistence & Audit Trail

1. **`RecoveryCase` Update:**
   When a payment failure is assessed, the associated `RecoveryCase` has its `failure_category` and `failure_code` attributes updated.
2. **Append-Only `AuditEvent` Logging:**
   The assessment triggers an immutable audit entry in `audit_events`:
   - `event_type`: `"PAYMENT_FAILURE_CLASSIFIED"`
   - `actor`: `"FAILURE_INTELLIGENCE_ENGINE"`
   - `payload`: Serialized `FailureAssessment` containing the matched rule, classifier version, raw evidence, and confidence score.
   - `correlation_id`: Inbound request correlation ID.

---

## 9. Granular Phase 4 Task Breakdown

| Task ID | Epic | Feature | Task Description | Dependencies | Priority | Acceptance Criteria |
|---|---|---|---|---|---|---|
| `TSK-010-01` | Intelligence | Contract Audit | Implement `FailureEvidenceExtractor` parsing normalized webhook metadata | Phase 3 | P0 | Extracts sanitized fields with zero missing-key crashes. |
| `TSK-010-02` | Intelligence | Taxonomy | Define `FailureCategory`, `Recoverability`, and `Severity` domain enums | TSK-010-01 | P0 | Strict typing matching frozen architecture taxonomy. |
| `TSK-010-03` | Intelligence | Rule Registry | Implement declarative `FailureRuleRegistry` with exact code mappings | TSK-010-02 | P0 | Maps 20+ Razorpay error codes deterministically. |
| `TSK-010-04` | Intelligence | Description Matcher| Implement keyword pattern matcher for fallback descriptions | TSK-010-03 | P1 | Classifies descriptive bank errors when reason is blank. |
| `TSK-010-05` | Intelligence | Confidence | Implement deterministic confidence scoring engine (0.00-1.00) | TSK-010-03 | P0 | Produces exact confidence scores based on match specificity. |
| `TSK-010-06` | Intelligence | Domain Contract | Implement `FailureAssessment` dataclass with full serialization | TSK-010-02, 05 | P0 | Immutable, versioned assessment contract. |
| `TSK-010-07` | Intelligence | Engine | Implement `FailureClassificationEngine` orchestrating the pipeline | TSK-010-01..06 | P0 | Generates explainable `FailureAssessment` from event. |
| `TSK-010-08` | Intelligence | Fallback | Implement `UnknownFailureHandler` for unmapped/ambiguous codes | TSK-010-07 | P0 | Gracefully outputs `UNKNOWN_AMBIGUOUS` with 0.50 confidence. |
| `TSK-010-09` | Intelligence | Case Update | Integrate classification result with `RecoveryCase` repository | TSK-010-07 | P0 | Updates `failure_category` and `failure_code` on active case. |
| `TSK-010-10` | Intelligence | Audit Logging | Record `AuditEvent` (`PAYMENT_FAILURE_CLASSIFIED`) via UoW | TSK-010-09 | P0 | Immutable audit trail recorded with explainable evidence. |
| `TSK-010-11` | Intelligence | Ingress Router | Wire `failure_intelligence` queue in `IngressEventRouter` to engine | TSK-010-07 | P0 | Inbound `PAYMENT_FAILED` events trigger classification. |
| `TSK-010-12` | Intelligence | Observability | Instrument engine with structured JSON metrics & latency tracking | TSK-010-07 | P1 | Logs classification metrics with zero secret exposure. |
| `TSK-010-13` | Intelligence | Test Fixtures | Build synthetic fixture catalog for all 20+ error code scenarios | TSK-010-03 | P0 | Synthetic payloads covering every branch and taxonomy class. |
| `TSK-010-14` | Intelligence | Unit Tests | Comprehensive unit tests for classifier rules & confidence logic | TSK-010-07, 13 | P0 | 100% branch coverage across all classification rules. |
| `TSK-010-15` | Intelligence | Integration | End-to-end webhook-to-classification integration tests | TSK-010-10, 11 | P0 | Webhook POST triggers classification & audit log cleanly. |

---

## 10. Definition of Done (DoD) for Phase 4

- [ ] `FailureEvidenceExtractor` extracts sanitized evidence from `NormalizedWebhookEvent` without crashing on missing/null fields.
- [ ] Declarative rule registry maps 100% of defined Razorpay failure reasons into the 6 canonical taxonomy categories.
- [ ] Recoverability (`RECOVERABLE`, `CONDITIONAL`, `NON_RECOVERABLE`, `UNKNOWN`) and severity deterministically assigned.
- [ ] Confidence score calculated on a reproducible $0.00$ to $1.00$ scale.
- [ ] Unmapped / ambiguous errors safely classified as `UNKNOWN_AMBIGUOUS` with $0.50$ confidence.
- [ ] `FailureAssessment` includes classifier version (`1.0.0`) and full explainability evidence.
- [ ] Assessment updates `RecoveryCase` attributes and records an append-only `AuditEvent`.
- [ ] Inbound `PAYMENT_FAILED` webhook routed through the classification pipeline.
- [ ] Full test suite passes with 0 failures (`pytest backend/tests/test_intelligence/`).
- [ ] Zero secrets or sensitive customer credentials logged.
- [ ] Zero Phase 5+ logic (customer scoring, LLM prompts, Policy Engine rules, Payment Links, recovery dispatch) introduced.

---

## 11. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| **New / Unannounced Razorpay Error Codes** | Safe fallback to `UNKNOWN_AMBIGUOUS` with `0.50` confidence; alerts ops without crash. |
| **Missing `error_reason` in Bank Payloads** | Secondary rule matcher uses `error_description` keyword analysis and `error_source`/`error_step`. |
| **Incorrect Hard-Decline Flagging** | Hard decline restricted strictly to explicit terminal codes (`do_not_honour`, `account_closed`, `fraud_suspected`). |
