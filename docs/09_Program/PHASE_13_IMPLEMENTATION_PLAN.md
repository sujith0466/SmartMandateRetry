# SmartMandateRetry — Phase 13 Implementation Plan: Merchant Console UI — Dashboard & Cases Inbox

> **Document ID:** DOC-PROG-037  
> **Phase:** Phase 13 — Merchant Console UI: Dashboard & Cases Inbox  
> **Status:** APPROVED IMPLEMENTATION CONTRACT  
> **Author:** Principal Frontend Architect & UX Engineer  
> **Dependencies:** Phase 2–12 (Complete & Frozen), AI Provider Hardening (Complete & Frozen)  

---

## 1. Executive Summary & Objective

Phase 13 builds a production-quality, responsive, and accessible **Merchant Console UI** in React, TypeScript, and Tailwind CSS. The console consumes SmartMandateRetry's authenticated `/api/v1/*` Merchant REST APIs to provide merchants with complete operational visibility over mandate recovery performance, active cases, case lifecycle timelines, execution actions, settlement reconciliations, safety policies, audit trails, and system observability.

### Core Architectural Principle
> *"Phase 13 is a read-oriented presentation and monitoring layer. The UI communicates strictly through authorized Merchant REST APIs. It never creates a parallel execution path, never attempts to bypass the Policy Engine, State Machine, or Reconciliation Engine, and never executes financial operations directly."*

---

## 2. UI Routes & Navigation

| Route | Page Component | Data Source API | Key Views / Capabilities |
|---|---|---|---|
| `/` or `/dashboard` | `DashboardPage` | `GET /api/v1/analytics/overview`, `/observability/summary`, `/healthz` | KPI cards, recovery rates, state distribution, system health badges |
| `/cases` | `CasesPage` | `GET /api/v1/cases` | Cases Inbox table, state/stage filtering, bounded pagination, status badges |
| `/cases/:caseId` | `CaseDetailPage` | `GET /api/v1/cases/<id>`, `/actions`, `/reconciliation` | Lifecycle timeline, sanitized customer context, actions, settlement outcome |
| `/analytics` | `AnalyticsPage` | `GET /api/v1/analytics/overview`, `/observability/summary` | Macro recovery charts, recovered revenue vs risk, pipeline breakdowns |
| `/audit` | `AuditPage` | `GET /api/v1/audit-events` | Paginated immutable audit trail, correlation IDs, sanitized payloads |
| `/policies` | `PoliciesPage` | `GET /api/v1/policies` | Read-only view of active safety policies, retry caps, and thresholds |
| `/observability` | `ObservabilityPage` | `GET /api/v1/observability/summary`, `/metrics`, `/readyz` | PostgreSQL, Redis, OpenRouter health, latency distributions, OCC metrics |

---

## 3. Centralized API Client Architecture

- **Path:** `frontend/src/services/api.ts`
- **Authentication:** Injects `X-Merchant-ID` header (configurable in UI or default demo tenant) and validates standard error format `{ error: { code, message, details, path } }`.
- **Correlation ID:** Generates/propagates `X-Correlation-ID` header for all requests.
- **Error Handling:** Standardized `ApiError` class with user-friendly messages and retry support.
- **Data Protection:** Handles sanitized customer PII (`mask_email`, `mask_phone`) without attempting reconstruction.

---

## 4. Granular Task Breakdown (`TSK-022-01` .. `TSK-022-14`)

| Task ID | Component | Task Description | Priority |
|---|---|---|---|
| `TSK-022-01` | **Frontend Contracts & Types** | Define complete TypeScript interfaces for Cases, Actions, Reconciliation, Audit, Policies, and Metrics | P0 |
| `TSK-022-02` | **Centralized API Client** | Implement typed API client with correlation propagation, auth headers, and error normalization | P0 |
| `TSK-022-03` | **Dashboard KPI & Health View**| Build `DashboardPage` with macro KPI cards, state distribution, and operational health badges | P0 |
| `TSK-022-04` | **Cases Inbox & Filters** | Build `CasesPage` with bounded pagination, state/stage filters, and status indicators | P0 |
| `TSK-022-05` | **Case Detail & Timeline** | Build `CaseDetailPage` with visual recovery lifecycle progression, customer info, and timestamps | P0 |
| `TSK-022-06` | **Actions & Provider View** | Build Actions section in `CaseDetailPage` displaying execution history and provider references | P0 |
| `TSK-022-07` | **Settlement Reconciliation UI**| Build Reconciliation section in `CaseDetailPage` displaying settlement status and outcome badges | P0 |
| `TSK-022-08` | **Audit Trail Page** | Build `AuditPage` displaying paginated immutable audit logs with correlation ID filtering | P0 |
| `TSK-022-09` | **Safety Policies Page** | Build `PoliciesPage` displaying read-only merchant safety configurations and rule thresholds | P0 |
| `TSK-022-10` | **Analytics Page** | Build `AnalyticsPage` with recovery performance charts and volume breakdowns | P0 |
| `TSK-022-11` | **Observability Page** | Build `ObservabilityPage` displaying database, redis, OpenRouter, and pipeline metrics | P0 |
| `TSK-022-12` | **Navigation & Shell** | Update `Layout.tsx` and `routes.tsx` with responsive sidebar and active route styling | P0 |
| `TSK-022-13` | **Production Build & QA** | Verify strict TypeScript compilation (`npm run build`) and backend regression tests | P0 |
| `TSK-022-14` | **Release & Completion Report**| Author Phase 13 completion report, update master tracker and changelog | P0 |
| `TSK-022` | **Master Task** | Complete Merchant Console UI: Dashboard & Cases Inbox | P0 |

---

## 5. Definition of Done (DoD)

- [ ] All 7 primary routes implemented and accessible via sidebar navigation.
- [ ] Centralized API client handles auth headers, correlation IDs, and errors.
- [ ] Cases Inbox supports filtering by state/stage and bounded pagination.
- [ ] Case Detail renders visual lifecycle progression, actions list, and settlement reconciliation.
- [ ] Audit Trail renders paginated audit events with payload inspection.
- [ ] Strict TypeScript compilation passes with zero errors (`npm run build`).
- [ ] 100% of backend regression tests pass (166/166 tests, $\ge 90\%$ coverage).
- [ ] Zero secrets detected by `scripts/security_scan.py`.
- [ ] Local `.env` preserved and untracked.
