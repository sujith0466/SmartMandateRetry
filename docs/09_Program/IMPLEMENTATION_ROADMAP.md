# SmartMandateRetry — Implementation Roadmap

> **Document ID:** DOC-PROG-001  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## 1. Capability-Driven Phase Progression

| Phase | Title | Core Capability Delivered | Key Dependencies | Target Milestone |
|---|---|---|---|---|
| **Phase 0** | **Baseline & Documentation Freeze** | All 33 specifications created, audited, and frozen | None | `MS-01` |
| **Phase 1** | **Repository Foundation** | Docker Compose topology, backend/frontend shells, pytest, TS build | Phase 0 | `MS-01` |
| **Phase 2** | **Core Domain Model & Database** | PostgreSQL schema, SQLAlchemy models, Alembic migrations | Phase 1 | `MS-02` |
| **Phase 3** | **Razorpay Webhook Ingestion** | HMAC-SHA256 signature verification, idempotency store | Phase 2 | `MS-02` |
| **Phase 4** | **Payment Failure Intelligence** | Deterministic error mapper + AI ambiguity classifier | Phase 2 | `MS-03` |
| **Phase 5** | **Customer Context Engine** | Context aggregator (tenure, reliability, retry history) | Phase 3, 4 | `MS-03` |
| **Phase 6** | **AI Decision Engine (OpenRouter)**| OpenRouter client abstraction, structured JSON schema parser | Phase 4, 5 | `MS-03` |
| **Phase 7** | **Deterministic Policy Engine** | 8 Hard safety rules, fail-closed gate (100% branch test) | Phase 6 | `MS-03` |
| **Phase 8** | **Action Executor** | Razorpay Payment Links API, delayed Celery schedules | Phase 7 | `MS-04` |
| **Phase 9** | **Outcome Verification** | Inbound settlement webhook reconciliation, revenue attribution | Phase 8 | `MS-04` |
| **Phase 10** | **Recovery Case Lifecycle (FSM)** | Full FSM transitions, concurrency locking, case expiry | Phase 8, 9 | `MS-04` |
| **Phase 11** | **Audit & Observability** | Append-only audit logger, structured logging, correlation IDs | Phase 9, 10 | `MS-04` |
| **Phase 12** | **Merchant REST API** | `/cases`, `/policies`, `/analytics`, `/evaluation` routes | Phase 10, 11 | `MS-05` |
| **Phase 13** | **Merchant Console Dashboard** | React frontend: Dashboard KPIs, Recovery Cases Inbox | Phase 12 | `MS-05` |
| **Phase 14** | **Case Detail & Policy UI** | React frontend: Case Timeline, Policy Config Form | Phase 13 | `MS-05` |
| **Phase 15** | **Audit & Analytics UI** | React frontend: Audit log viewer, Trend analytics | Phase 13 | `MS-05` |
| **Phase 16** | **Synthetic Benchmark Dataset** | 5,000 scenario dataset generation with train/dev/test split| Phase 4 | `MS-06` |
| **Phase 17** | **Evaluation Engine** | Baseline simulator (T+1..T+3) vs SmartMandateRetry | Phase 16, 12 | `MS-06` |
| **Phase 18** | **Evaluation Lab UI** | React frontend: Benchmark runner & comparative tables | Phase 17, 15 | `MS-06` |
| **Phase 19** | **End-to-End QA & Chaos Tests** | 7 Core user journeys, failure/chaos test suite | Phase 18 | `MS-07` |
| **Phase 20** | **Security Hardening** | Rate limits, header security, secret management audit | Phase 19 | `MS-07` |
| **Phase 21** | **Buildathon Demo Readiness** | Live Razorpay test mode seed, demo video walkthrough | Phase 20 | `MS-07` |
