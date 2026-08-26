# SmartMandateRetry — Phase 12 Implementation Plan: Merchant API Layer

> **Document ID:** DOC-PROG-035  
> **Phase:** Phase 12 — Merchant API Layer  
> **Status:** APPROVED IMPLEMENTATION CONTRACT  
> **Author:** Principal API Architect & Security Engineer  
> **Dependencies:** Phase 2–11 (Complete & Frozen), AI Provider Hardening (Complete & Frozen)  

---

## 1. Executive Summary & Objective

Phase 12 builds a production-grade, secure, authenticated, and merchant-isolated **Merchant API Layer** for SmartMandateRetry.

### Core Architectural Principle
> *"Phase 12 is an access and orchestration layer only. It exposes read and management APIs for `RecoveryCase`, `RecoveryAction`, `Reconciliation`, `Policy`, `Audit`, and `Analytics` without duplicating existing business logic from Phases 2–11. All endpoints enforce strict merchant-tenant isolation, structured error formatting, bounded pagination, correlation ID propagation, and non-blocking telemetry."*

---

## 2. API Endpoints Inventory

| Route | Method | Access | Description |
|---|---|---|---|
| `/api/v1/healthz` | `GET` | Public | Liveness probe returning application status |
| `/api/v1/readyz` | `GET` | Public / Ops | Readiness probe testing DB, Redis, and OpenRouter |
| `/api/v1/metrics` | `GET` | Public / Ops | In-memory telemetry and performance metrics snapshot |
| `/api/v1/cases` | `GET` | Merchant Auth | List merchant recovery cases with pagination & filters |
| `/api/v1/cases/<case_id>` | `GET` | Merchant Auth | Fetch case details, failure intelligence, and history |
| `/api/v1/cases/<case_id>/actions` | `GET` | Merchant Auth | List execution actions for a specific case |
| `/api/v1/cases/<case_id>/reconciliation` | `GET` | Merchant Auth | Fetch authoritative settlement reconciliation status |
| `/api/v1/policies` | `GET` | Merchant Auth | Fetch merchant active recovery safety policies |
| `/api/v1/audit-events` | `GET` | Merchant Auth | Paginated append-only audit trail for merchant cases |
| `/api/v1/analytics/overview` | `GET` | Merchant Auth | Macro recovery KPIs (revenue at risk, recovered, rates) |
| `/api/v1/observability/summary` | `GET` | Merchant Auth | Full operational and telemetry summary |

---

## 3. Merchant Authentication & Tenant Isolation Model

1. **Authentication Headers:**
   - Supported: `X-Merchant-ID: <merchant_id>` or `X-API-Key: <api_key>` or `Authorization: Bearer <token>`.
   - Validated against database before reaching business services.
   - Missing/invalid credentials fail closed with HTTP 401 (`UNAUTHORIZED`).
2. **Strict Merchant-Tenant Isolation (Anti-IDOR):**
   - Every query automatically filters `WHERE merchant_id = :authenticated_merchant_id`.
   - Accessing a case belonging to another merchant returns HTTP 404 (`NOT_FOUND`) rather than leaking existence via 403.
3. **Correlation ID Lifecycle:**
   - Inbound `X-Correlation-ID` header is validated and bound to `CorrelationContext`.
   - If absent, a new `corr_<uuid>` is generated.
   - Returned in response headers as `X-Correlation-ID`.

---

## 4. Bounded Pagination & Parameter Validation

- `page`: default `1`, minimum `1`
- `limit`: default `20`, maximum `100`
- `state`: optional `CaseState` filter
- `stage`: optional `RecoveryStage` filter
- `date_from` / `date_to`: optional ISO-8601 timestamps
- Deterministic ordering: `created_at DESC, id ASC`

---

## 5. Standardized Error Contract

```json
{
  "error": {
    "code": "NOT_FOUND | UNAUTHORIZED | VALIDATION_ERROR | OPTIMISTIC_LOCK_CONFLICT | INTERNAL_SERVER_ERROR",
    "message": "Human-readable explanation",
    "details": {},
    "path": "/api/v1/cases/case_123"
  }
}
```

---

## 6. Granular Task Breakdown (`TSK-021-01` .. `TSK-021-14`)

| Task ID | Component | Task Description | Priority |
|---|---|---|---|
| `TSK-021-01` | **Auth Middleware** | Implement `@require_merchant_auth` decorator with header validation and tenant binding | P0 |
| `TSK-021-02` | **Case List API** | Implement `GET /api/v1/cases` with bounded pagination, state filtering, and tenant isolation | P0 |
| `TSK-021-03` | **Case Detail API** | Implement `GET /api/v1/cases/<case_id>` returning case, customer, and subscription context | P0 |
| `TSK-021-04` | **Action List API** | Implement `GET /api/v1/cases/<case_id>/actions` returning actions with tenant security | P0 |
| `TSK-021-05` | **Reconciliation API**| Implement `GET /api/v1/cases/<case_id>/reconciliation` returning authoritative settlement | P0 |
| `TSK-021-06` | **Policy API** | Implement `GET /api/v1/policies` returning active merchant safety limits | P0 |
| `TSK-021-07` | **Audit Trail API** | Implement `GET /api/v1/audit-events` returning paginated, sanitized audit trails | P0 |
| `TSK-021-08` | **Analytics API** | Implement `GET /api/v1/analytics/overview` returning macro recovery KPIs | P0 |
| `TSK-021-09` | **Correlation Hook** | Implement Flask `before_request` and `after_request` correlation ID middleware | P0 |
| `TSK-021-10` | **Unit & Auth Tests** | Tests for authentication, missing tokens, invalid headers, and correlation propagation | P0 |
| `TSK-021-11` | **Anti-IDOR Tests** | Tests verifying cross-merchant resource access is completely blocked | P0 |
| `TSK-021-12` | **Integration Tests** | Full PostgreSQL integration tests across all Merchant API endpoints | P0 |
| `TSK-021-13` | **Regression & QA** | Full test suite regression across Phase 2–11 capabilities | P0 |
| `TSK-021-14` | **Documentation & Release**| Author Phase 12 completion report, update master tracker and changelog | P0 |
| `TSK-021` | **Master Task** | Complete Merchant API Layer subsystem | P0 |

---

## 7. Definition of Done (DoD)

- [ ] All merchant endpoints require valid merchant authentication.
- [ ] Cross-merchant resource access (IDOR) strictly returns 404 without data leakage.
- [ ] Bounded pagination enforced ($1 \le \text{limit} \le 100$).
- [ ] Correlation ID propagated and returned in response headers (`X-Correlation-ID`).
- [ ] 100% of Phase 2–11 regression test suite continues to pass.
- [ ] Total backend coverage remains $\ge 90\%$.
- [ ] Zero secrets detected by `scripts/security_scan.py`.
- [ ] Local `.env` preserved and untracked.
