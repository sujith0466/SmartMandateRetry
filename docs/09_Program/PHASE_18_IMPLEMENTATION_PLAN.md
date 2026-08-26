# SmartMandateRetry — Phase 18 Implementation Plan: Evaluation Lab UI

> **Document ID:** DOC-PROG-047  
> **Phase:** 18 — Evaluation Lab UI  
> **Status:** APPROVED / READY FOR IMPLEMENTATION  
> **Author:** Principal Product Architect & Frontend Engineer  
> **Date:** 2026-08-26  
> **Baseline:** Phase 2–17 COMPLETE + FROZEN (Commit: `32802f0`)  
> **Master Tracker Task:** `TSK-027`  

---

## 1. Executive Summary & Objective

The objective of Phase 18 is to deliver the **Evaluation Lab UI** for **SmartMandateRetry**. The Evaluation Lab provides an empirical, interactive benchmarking and governance auditing interface in the Merchant Console. It visualizes the deterministic 5,000-scenario synthetic dataset (Phase 16) and comparative evaluation metrics (Phase 17), providing fintech transparency, zero-tolerance safety verification, confusion matrix diagnostics, financial recovery uplift analytics, multi-dimensional breakdowns, historical run inspection, and granular scenario-level forensic exploration.

Phase 18 builds strictly on top of the frozen Phase 16 and Phase 17 contracts without modifying production recovery behavior, payment flows, or Phase 2–17 business logic.

---

## 2. Baseline Architecture & Guardrails

### 2.1 Frozen Components (Do NOT Modify)
- **Phase 2–12:** Core Recovery Engine, State Machine, Policy Engine, Observability, Reconciliation, and REST APIs.
- **Phase 13–15:** Merchant Console Dashboard, Case Details, Policy Governance, and Audit Logs.
- **Phase 16:** Synthetic Scenario Generator, Seed Manager, Dataset Splitter, and Dataset Manifest (`backend/app/evaluation/scenario_*.py`).
- **Phase 17:** Comparative Benchmark Runner, Mode Adapters, Metrics Calculator, Persistence Service, and CLI (`backend/app/evaluation/evaluation_*.py`, `metrics.py`, `persistence.py`, `report.py`, `benchmark_runner.py`).

### 2.2 Phase 18 Scope Boundaries
- **In Scope:**
  1. Backend read-only / benchmark evaluation REST API blueprint (`backend/app/api/v1/evaluation.py`).
  2. Frontend TypeScript evaluation data models and API client (`frontend/src/types/`, `frontend/src/services/api.ts`).
  3. Interactive Evaluation Lab UI dashboard (`frontend/src/features/evaluation/`).
  4. 7 Core Visualization Subsystems:
     - Evaluation Overview & Benchmark Runner Trigger
     - Multi-Mode Comparative Benchmark Matrix (SmartMandate vs Native vs Rule-Based vs Unguarded)
     - Zero-Tolerance Safety & Governance Compliance Dashboard (Pass/Fail rate visualizers)
     - Interactive 4-Class Confusion Matrix Visualizer with per-class Precision/Recall/F1
     - Financial Recovery & Revenue Uplift Analytics
     - Multi-Dimensional Breakdown Explorer (Families, Tiers, Categories, Splits)
     - Evaluation Run History & Granular Scenario Result Forensic Explorer
  5. Comprehensive frontend unit test suite and integration tests.
- **Out of Scope (Phase 19+):**
  - Production payment gateways or live Razorpay mutations.
  - End-to-end user journeys test suite (`TSK-028`).
  - Chaos test suite (`TSK-029`).

---

## 3. Backend Read-Only & Evaluation REST API (`backend/app/api/v1/evaluation.py`)

A minimal, secure, typed Flask blueprint registered at `/api/v1/evaluation`:

| HTTP Method | Route | Description | Auth / Scope |
|---|---|---|---|
| `GET` | `/api/v1/evaluation/summary` | Macro summary: total scenarios, available dataset partitions, latest run summary | `require_merchant_auth` |
| `GET` | `/api/v1/evaluation/runs` | List persisted evaluation runs with pagination (`page`, `limit`) | `require_merchant_auth` |
| `GET` | `/api/v1/evaluation/runs/<run_id>` | Detailed evaluation run with full `metrics_summary` dictionary | `require_merchant_auth` |
| `GET` | `/api/v1/evaluation/runs/<run_id>/results` | Paginated scenario results with filters (`family`, `tier`, `split`, `label`, `is_correct`, `is_violation`, `page`, `limit`) | `require_merchant_auth` |
| `POST` | `/api/v1/evaluation/benchmark` | Execute benchmark evaluation on-demand (`mode`, `split`, `compare`, `persist`) against certified Phase 16 dataset | `require_merchant_auth` |

---

## 4. Frontend Architecture & Component Hierarchy

### 4.1 Component Tree (`frontend/src/features/evaluation/`)
```
frontend/src/features/evaluation/
├── EvaluationPage.tsx                    # Main Evaluation Lab container with tab navigation & run state
├── components/
│   ├── EvaluationOverview.tsx            # Header KPI cards, active run metadata, dataset split selector
│   ├── ComparativeBenchmarkView.tsx      # 4-mode comparative table & uplift performance cards
│   ├── SafetyGovernanceDashboard.tsx     # Zero-tolerance safety cards with PASS/FAIL/VIOLATION badges
│   ├── ConfusionMatrixView.tsx           # Interactive 4x4 matrix grid with precision/recall/F1 metrics
│   ├── RecoveryFinancialAnalytics.tsx    # Revenue uplift, efficiency, and wasted retry charts
│   ├── DimensionalBreakdownView.tsx      # Breakdown tabs (by family, tier, category, split)
│   ├── RunHistoryDrawer.tsx              # Sidebar drawer displaying past EvaluationRun records
│   ├── ScenarioExplorerModal.tsx         # Deep-dive modal for individual scenario inputs & AI decision
│   └── ScenarioResultTable.tsx           # Searchable, filterable scenario table with badge indicators
```

### 4.2 UI State Management & Data Flow
- **Active Run State:** Holds current active benchmark metrics (live executed or loaded from DB run).
- **Comparative Mode State:** Holds metrics for all 4 modes (`SMART_MANDATE`, `RAZORPAY_NATIVE`, `RULE_BASED`, `AI_UNGUARDED`).
- **Filters State:** Split selector (`TEST`, `VALIDATION`, `TRAIN`, `ALL`), Scenario search text, family filter, difficulty tier filter, error/violation toggle.
- **Async Loading States:** Skeleton loaders, running benchmark spinner, error banners, and empty data states.

---

## 5. Detailed Task Breakdown (`TSK-027-01` through `TSK-027-14`)

| Task ID | Component | Task Description | Verification Target |
|---|---|---|---|
| `TSK-027-01` | Architecture Discovery | Complete repository, API, and frontend discovery; author `PHASE_18_IMPLEMENTATION_PLAN.md` | Commit & Plan Approval |
| `TSK-027-02` | API & Type Contracts | Define TypeScript interfaces in `frontend/src/types/index.ts` matching Phase 17 metrics | Type-check without errors |
| `TSK-027-03` | Backend Evaluation API | Implement `backend/app/api/v1/evaluation.py` routes and register in `backend/app/main.py` | Pytest backend route tests |
| `TSK-027-04` | Frontend API Client | Add evaluation API client methods in `frontend/src/services/api.ts` | Unit tests / mocks |
| `TSK-027-05` | Overview & Run Trigger | Implement `EvaluationOverview.tsx` with run switcher, split selector, and benchmark trigger | Component rendering test |
| `TSK-027-06` | Comparative Benchmark View | Implement `ComparativeBenchmarkView.tsx` comparing all 4 evaluation modes | Table & uplift rendering |
| `TSK-027-07` | Safety & Governance Dashboard | Implement `SafetyGovernanceDashboard.tsx` with 6 zero-tolerance rule cards and violation counters | Pass/Fail badge audit |
| `TSK-027-08` | Confusion Matrix Visualizer | Implement `ConfusionMatrixView.tsx` with 4-class grid, diagonal TP highlights, and F1 scores | Matrix calculation test |
| `TSK-027-09` | Recovery & Financial Analytics | Implement `RecoveryFinancialAnalytics.tsx` displaying recovered revenue, efficiency, and wasted retries | Revenue math formatting |
| `TSK-027-10` | Dimensional Breakdowns | Implement `DimensionalBreakdownView.tsx` with family, tier, category, and split tabs | Dimensional breakdown tabs |
| `TSK-027-11` | Run History Drawer | Implement `RunHistoryDrawer.tsx` to list and load historical `EvaluationRun` records | History selection test |
| `TSK-027-12` | Scenario Result Explorer | Implement `ScenarioResultTable.tsx` and `ScenarioExplorerModal.tsx` with search and filters | Filter & modal inspect |
| `TSK-027-13` | Frontend Test Suite | Implement comprehensive tests in `frontend/src/features/evaluation/__tests__/` | Test runner passing |
| `TSK-027-14` | QA & Release Certification | Run full QA suite: backend tests (>=90% cov), frontend build (0 errors), security scan, docs audit | Release certification |

---

## 6. Verification & Quality Gates

1. **Backend Tests:** All existing 345 backend tests + new API route tests passing. Coverage $\ge 90\%$.
2. **Frontend Build:** `npm run build` passes cleanly with zero TypeScript errors.
3. **Comparative Accuracy:** `SMART_MANDATE` reports 100% accuracy, 0 violations, and positive recovery uplift over `RAZORPAY_NATIVE`.
4. **Safety Verification:** Zero-tolerance safety visualizers accurately flag `AI_UNGUARDED` policy breaches and `RAZORPAY_NATIVE` wasted hard-decline retries.
5. **Security & Secrets:** `scripts/security_scan.py` reports 0 secrets, 0 leaks.
6. **Documentation Audit:** `scripts/audit_docs.py` verifies all required documentation files on disk.
7. **Clean Git State:** Branch `main` up to date with remote, clean working tree.

---

## 7. Definition of Done

Phase 18 will be considered complete when:
1. `EvaluationPage.tsx` and all evaluation feature components are fully implemented and integrated into the router.
2. The UI can execute comparative benchmarks on-demand or load persisted runs from PostgreSQL.
3. All 7 evaluation visualization subsystems are fully functional and responsive.
4. All quality gates pass without regressions to Phases 2–17.
5. `docs/09_Program/PHASE_18_COMPLETION_REPORT.md` is authored, committed, and pushed.
