# SmartMandateRetry — Phase 9 Implementation Plan: Inbound Verification & Settlement Reconciliation

> **Document ID:** DOC-PROG-029  
> **Phase:** Phase 9 — Inbound Verification & Settlement Reconciliation  
> **Status:** APPROVED IMPLEMENTATION CONTRACT  
> **Author:** Principal Systems Architect & Reliability Engineer  
> **Dependencies:** Phase 2–8 (Complete & Frozen), AI Provider Hardening (Complete & Frozen)  

---

## 1. Executive Summary & Objective

Phase 9 builds a deterministic, idempotent, and auditable **Inbound Verification & Settlement Reconciliation** subsystem for SmartMandateRetry.

### Core Architectural Principle
> *"Phase 8 dispatches recovery actions (e.g. Payment Links, scheduled checks). Phase 9 verifies whether the external payment actually occurred, attributes recovered revenue to the exact RecoveryCase, transitions the case to `RECOVERED`, updates the RecoveryAction, and records an append-only AuditEvent. Phase 9 does NOT decide next-step recovery strategies."*

---

## 2. Inbound Reconciliation Pipeline

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    PHASE 9 RECONCILIATION & SETTLEMENT                      │
│                                                                             │
│  ┌─────────────────────────────────┐                                        │
│  │ Inbound Webhook / Direct Check  │ (PAYMENT_CAPTURED, PAYMENT_LINK_PAID)  │
│  └──────────────┬──────────────────┘                                        │
│                 │                                                           │
│                 ▼                                                           │
│  ┌─────────────────────────────────┐                                        │
│  │ NormalizedWebhookEvent (Phase 3)│                                        │
│  └──────────────┬──────────────────┘                                        │
│                 │                                                           │
│                 ▼                                                           │
│  ┌─────────────────────────────────┐                                        │
│  │ Event Correlation Engine        │ (Match by plink_id > inv_id > sub_id) │
│  └──────────────┬──────────────────┘                                        │
│                 │                                                           │
│                 ▼                                                           │
│  ┌─────────────────────────────────┐                                        │
│  │ ReconciliationEngine            │ ──► [Case Already Recovered?]         │
│  │ - Outcome Taxonomy Mapping      │          │ Yes (Idempotent No-Op)      │
│  │ - Amount & Currency Match       │          ▼                             │
│  │ - Failure / Conflict Detection  │     Return Existing RECONCILED Result  │
│  └──────────────┬──────────────────┘                                        │
│                 │ (New Evidence)                                            │
│                 ▼                                                           │
│  ┌───────────────────────────────────────────────────────────────────────┐  │
│  │ Evaluated Outcome Status                                              │  │
│  │ ├── PAYMENT_SUCCEEDED ──► Case State: RECOVERED, Action: RECONCILED   │  │
│  │ ├── PAYMENT_FAILED    ──► Case State: FAILED, Action: FAILED          │  │
│  │ ├── MISMATCH          ──► Audit: PAYMENT_OUTCOME_MISMATCH (Fail-Safe) │  │
│  │ └── UNKNOWN           ──► Audit: PAYMENT_OUTCOME_UNKNOWN              │  │
│  └──────────────────┬────────────────────────────────────────────────────┘  │
│                     │                                                       │
│                     ▼                                                       │
│  ┌─────────────────────────────────┐                                        │
│  │ Persist Database Mutations      │                                        │
│  │ - RecoveryCase.recovered_amount │                                        │
│  │ - RecoveryCase.resolved_at      │                                        │
│  │ - AuditEvent Recorded           │                                        │
│  └─────────────────────────────────┘                                        │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Authoritative Evidence Model & Payment Outcomes

### `PaymentOutcome` Taxonomy
- `PAYMENT_SUCCEEDED`: Gateway confirmed funds captured (`PAYMENT_CAPTURED`, `PAYMENT_LINK_PAID`, `SUBSCRIPTION_CHARGED`, `INVOICE_PAID`).
- `PAYMENT_FAILED`: Gateway confirmed payment attempt failed (`PAYMENT_FAILED`).
- `PAYMENT_PENDING`: Transaction initiated but awaiting settlement completion (`PAYMENT_PENDING`).
- `PAYMENT_NOT_FOUND`: Provider confirmed payment ID does not exist.
- `PAYMENT_CANCELLED`: Payment link or mandate cancelled by customer.
- `UNKNOWN`: Unrecognized or uncorrelatable provider event.

### `ReconciliationStatus`
- `RECONCILED`: Payment successfully verified, matched to case, and revenue attributed.
- `PENDING_VERIFICATION`: Awaiting final capture or settlement confirmation.
- `MISMATCH`: Discrepancy detected (e.g. currency mismatch, amount discrepancy, unmapped invoice).
- `FAILED`: Payment failure verified.
- `DUPLICATE_IGNORED`: Identical settlement event already processed.
- `UNKNOWN`: Insufficient correlation context to bind event to a recovery case.

---

## 4. Correlation Strategy

Correlation resolves in deterministic priority order:
1. **Payment Link ID (`entity_id` / `plink_xxx`):** Matches `RecoveryAction.external_reference_id`.
2. **Invoice ID (`invoice_id` / `inv_xxx`):** Matches `RecoveryCase.invoice_id`.
3. **Subscription ID (`subscription_id` / `sub_xxx`):** Matches `RecoveryCase.subscription_id` for active un-resolved cases.
4. **Payment ID (`payment_id` / `pay_xxx`):** Matches `RecoveryCase.payment_id`.

---

## 5. Idempotency & Concurrency Guarantees

1. **Idempotent Replay Handling:** If a `payment.captured` webhook is redelivered for an already `RECOVERED` case, the engine acknowledges the duplicate, preserves existing timestamps and revenue figures, records zero duplicate revenue, and returns `DUPLICATE_IGNORED`.
2. **Out-of-Order Events:** If a `payment.failed` event arrives after a `payment.captured` event for the same invoice, the settlement state machine ignores the late failure and retains `RECOVERED`.
3. **UnitOfWork & Optimistic Locking:** All mutations execute inside a database transaction with OCC version increments.

---

## 6. Audit Trail Contract

| Event Type | Trigger | Actor | Emitted Payload Metadata |
|---|---|---|---|
| `PAYMENT_OUTCOME_RECONCILED` | Successful payment attributed to case | `RECONCILIATION_ENGINE` | `reconciliation_id`, `case_id`, `payment_id`, `invoice_id`, `amount_inr`, `status="RECONCILED"` |
| `PAYMENT_OUTCOME_FAILED` | Inbound payment failure verified | `RECONCILIATION_ENGINE` | `reconciliation_id`, `case_id`, `payment_id`, `status="FAILED"`, `error_code` |
| `PAYMENT_OUTCOME_MISMATCH` | Conflict between evidence and case | `RECONCILIATION_ENGINE` | `reconciliation_id`, `case_id`, `invoice_id`, `mismatch_reason` |
| `PAYMENT_OUTCOME_UNKNOWN` | Uncorrelatable settlement event | `RECONCILIATION_ENGINE` | `reconciliation_id`, `event_id`, `provider` |

---

## 7. Granular Task Breakdown (`TSK-018-01` .. `TSK-018-12`)

| Task ID | Component | Description | Priority |
|---|---|---|---|
| `TSK-018-01` | **Reconciliation Schemas** | Define `PaymentOutcome`, `ReconciliationStatus`, `ReconciliationEvidence`, `ReconciliationResult` | P0 |
| `TSK-018-02` | **Correlation Engine** | Implement deterministic multi-key correlation hierarchy (`plink_id` > `inv_id` > `sub_id`) | P0 |
| `TSK-018-03` | **Reconciliation Engine** | Implement core verification logic (outcome taxonomy, amount matching, conflict guard) | P0 |
| `TSK-018-04` | **Payment Link Reconciler** | Implement specialized handler for `payment_link.paid` webhook outcomes | P0 |
| `TSK-018-05` | **Scheduled Check Reconciler**| Implement handler reconciling delayed observation outcomes with gateway status | P0 |
| `TSK-018-06` | **Reconciliation Service** | Implement `ReconciliationService` with UnitOfWork, OCC, and audit logging | P0 |
| `TSK-018-07` | **Ingress Router Wiring** | Wire `outcome_verification` queue in `IngressEventRouter` to `ReconciliationService` | P0 |
| `TSK-018-08` | **Direct Gateway Verifier** | Implement optional direct gateway polling fallback via `RazorpayClient` | P1 |
| `TSK-018-09` | **Unit Tests** | Unit tests for correlation, outcome mapping, amount matching, and duplicate handling | P0 |
| `TSK-018-10` | **Idempotency & Race Tests** | Chaos & idempotency tests (duplicate webhooks, out-of-order delivery, late failures) | P0 |
| `TSK-018-11` | **Integration Tests** | End-to-end integration tests with PostgreSQL verifying `RECOVERED` case state & audit trail | P0 |
| `TSK-018-12` | **Master Task** | Complete Inbound Verification & Settlement Reconciliation subsystem | P0 |

---

## 8. Definition of Done (DoD)

- [ ] `ReconciliationEngine` successfully maps 6 gateway settlement events to authoritative outcomes.
- [ ] Correlation resolves cases accurately via Payment Link ID, Invoice ID, and Subscription ID.
- [ ] Successful payments transition `RecoveryCase` to `RECOVERED` and attribute `recovered_amount_inr`.
- [ ] Replayed / duplicate webhooks produce zero duplicate state transitions or duplicate revenue.
- [ ] Out-of-order failures cannot revert an already `RECOVERED` case.
- [ ] 100% of existing Phase 2–8 test suite continues to pass with zero regressions.
- [ ] Overall backend coverage maintained at $\ge 90\%$.
- [ ] Zero secrets detected by `scripts/security_scan.py`.
