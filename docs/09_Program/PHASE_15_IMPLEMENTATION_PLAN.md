# SmartMandateRetry — Phase 15 Implementation Plan: Merchant Governance & Policy Management

> **Document ID:** DOC-PROG-041  
> **Phase:** Phase 15 — Merchant Governance & Policy Management  
> **Status:** APPROVED IMPLEMENTATION CONTRACT  
> **Author:** Principal Product Architect, Frontend Architect & Fintech Governance UX Engineer  
> **Dependencies:** Phase 2–14 (Complete & Frozen), AI Provider Hardening (Complete & Frozen)  

---

## 1. Executive Summary & Governance Vision

Phase 15 transforms the read-only safety policy display into an executive-grade **Merchant Governance & Policy Management Console**.

Merchants will be empowered to:
1. Understand active deterministic safety rules and recovery thresholds protecting their revenue.
2. Inspect exact mathematical constraints (retry caps, intervals, escalation windows, contact limits).
3. Safely configure and update recovery policies within strict database constraint bounds (`1 <= max_retries <= 10`, `1 <= interval <= 168h`, etc.).
4. Preview proposed policy changes side-by-side with deterministic safety impact analysis.
5. Inspect append-only governance audit trails with correlation IDs, previous vs new value diffs, and actor signatures (`MERCHANT_OPERATOR`).
6. Understand "Why was this action blocked?" on recovery cases using real `PolicyDecision` records.

---

## 2. Architecture & Technical Design

### 2.1 Backend Policy Management APIs (`/api/v1/policies`)
- `GET /api/v1/policies`: Return active merchant policy, rules breakdown, and editable constraints.
- `PUT /api/v1/policies`: Update policy configuration with strict server-side validation against database check constraints, tenant isolation (`@require_merchant_auth`), and append-only audit event logging (`POLICY_CONFIGURATION_UPDATED`).
- `POST /api/v1/policies/preview`: Deterministic safety change preview returning field-by-field diffs (`current` vs `proposed`) and safety impact notes.
- `GET /api/v1/policies/history`: Return immutable governance audit events (`POLICY_CONFIGURATION_UPDATED`) for the authenticated merchant.

### 2.2 Server-Side Safety Validation & Guardrails
- `max_retries_per_case`: Integer between 1 and 10.
- `min_retry_interval_hours`: Integer between 1 and 168 (7 days).
- `max_recovery_window_days`: Integer between 1 and 60.
- `min_confidence_threshold`: Decimal between 0.00 and 1.00.
- `high_value_threshold_inr`: Decimal $\ge 0.00$.
- `max_customer_contacts_per_cycle`: Integer between 1 and 10.
- `hard_decline_auto_stop`: Boolean (must be `true` by default for safety).

### 2.3 Frontend Governance UX & Multi-Step Editor
- **Overview & Guardrails Tab:** Interactive cards with threshold meters, active rules matrix, and immutable rule badges.
- **Policy Editor & Change Preview Modal:**
  - Step 1: Adjust threshold inputs with real-time client validation.
  - Step 2: Change Preview Diff (`Current` $\to$ `Proposed`) with deterministic safety impact warnings.
  - Step 3: Confirmation and safe submission to `PUT /api/v1/policies`.
  - Step 4: Instant toast alert and auto-refresh of policy parameters and revision history.
- **Revision History & Audit Log:** Chronological timeline of policy revisions with field diffs, timestamps, and actor chips.
- **Case Detail Governance Explanation:** Displays `PolicyDecision` details (status, rules applied, blocking reasons) for audited cases.

---

## 3. Granular Task Breakdown (`TSK-024-01` .. `TSK-024-14`)

| Task ID | Component | Task Description | Priority |
|---|---|---|---|
| `TSK-024-01` | **Observability & Audit Enum** | Add `POLICY_CONFIGURATION_UPDATED` to `AuditEventType` in backend | P0 |
| `TSK-024-02` | **Backend Validation & Service** | Implement `PolicyManagementService` for safe policy mutation and audit logging | P0 |
| `TSK-024-03` | **Policy Mutation Endpoint** | Implement `PUT /api/v1/policies` with strict validation, tenant isolation, and error contracts | P0 |
| `TSK-024-04` | **Policy Preview Endpoint** | Implement `POST /api/v1/policies/preview` for deterministic diff and safety impact | P0 |
| `TSK-024-05` | **Policy History Endpoint** | Implement `GET /api/v1/policies/history` returning immutable governance audit records | P0 |
| `TSK-024-06` | **Backend Test Suite** | Write tests for policy update, validation errors, IDOR isolation, preview, and audit logging | P0 |
| `TSK-024-07` | **Frontend Types & API Client** | Extend TypeScript interfaces (`PolicyChangePreview`, `PolicyUpdateRequest`, `PolicyHistory`) | P0 |
| `TSK-024-08` | **Policy Editor Modal** | Build multi-step modal with field inputs, client validation, and confirmation flow | P0 |
| `TSK-024-09` | **Change Preview & Diff Component**| Build visual side-by-side diff cards with deterministic safety impact badges | P0 |
| `TSK-024-10` | **Policy Revision History Timeline**| Build interactive chronological revision timeline from audit events | P0 |
| `TSK-024-11` | **Case Detail Governance UX** | Enhance `CaseDetailPage.tsx` to display policy decision explanations ("Why was this blocked?") | P0 |
| `TSK-024-12` | **Policies Page Overhaul** | Integrate policy editor, preview, and revision history into `PoliciesPage.tsx` | P0 |
| `TSK-024-13` | **QA & Production Build** | Run strict TypeScript build (`npm run build`), full backend test suite, docs audit, security scan | P0 |
| `TSK-024-14` | **Release & Completion Report**| Author Phase 15 completion report, update master tracker and changelog | P0 |
| `TSK-024` | **Master Task** | Complete Merchant Governance & Policy Management | P0 |

---

## 4. Definition of Done (DoD)

- [ ] All 14 granular tasks implemented and verified.
- [ ] Safe policy mutation supported via `PUT /api/v1/policies` with full UnitOfWork and transaction boundaries.
- [ ] Every policy change emits an append-only `AuditEvent` (`POLICY_CONFIGURATION_UPDATED`).
- [ ] Anti-IDOR and tenant isolation verified (cross-merchant policy manipulation impossible).
- [ ] Multi-step Policy Editor in React with Preview Diff and deterministic safety warnings.
- [ ] Policy Revision History rendered cleanly from audit trail.
- [ ] Full backend test suite passing with 100% success ($\ge 90\%$ coverage).
- [ ] Frontend builds with 0 TypeScript/ESLint errors.
- [ ] Zero secrets in repo; local `.env` intact and untracked.
