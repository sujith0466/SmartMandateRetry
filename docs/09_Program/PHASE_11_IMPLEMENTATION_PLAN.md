# SmartMandateRetry — Phase 11 Implementation Plan: Observability, Audit Trail & Metrics

> **Document ID:** DOC-PROG-033  
> **Phase:** Phase 11 — Observability, Audit Trail & Metrics  
> **Status:** APPROVED IMPLEMENTATION CONTRACT  
> **Author:** Principal Reliability Engineer & Observability Architect  
> **Dependencies:** Phase 2–10 (Complete & Frozen), AI Provider Hardening (Complete & Frozen)  

---

## 1. Executive Summary & Objective

Phase 11 builds a production-grade, centralized, and non-blocking **Observability, Audit Trail & Metrics** layer for SmartMandateRetry.

### Core Principles:
1. **Non-Blocking Telemetry:** Metric collection, logging, and performance timers must never fail an underlying business operation if telemetry collection encounters an error.
2. **Deterministic Redaction & Data Protection:** Zero credentials, API keys (`OPENROUTER_API_KEY`), database passwords, webhook secrets, authorization headers, PAN, CVV, or unmasked PII can ever be logged or stored in metric labels.
3. **End-to-End Correlation ID Propagation:** A single deterministic correlation ID tracks operations from Webhook Ingress $\to$ Customer Context $\to$ AI Decision $\to$ Policy Gate $\to$ Recovery Execution $\to$ Gateway Verification $\to$ State Transition.
4. **Append-Only Audit Hardening:** Consistent schema and validation for all 12 authoritative lifecycle audit events.
5. **Operational Health & Low-Cardinality Metrics:** Comprehensive system counters, gauges, and timing histograms with bounded label dimensions.

---

## 2. Observability Architecture & Components

```
                      Inbound Request / Webhook
                                 │
                                 ▼
                     ┌───────────────────────┐
                     │ Correlation Context   │ ──► Inject / Propagate Correlation ID
                     └───────────┬───────────┘
                                 │
                 ┌───────────────┼───────────────┐
                 ▼               ▼               ▼
        ┌────────────────┐┌──────────────┐┌──────────────┐
        │Structured Logs ││Metrics Store ││Audit Trails  │
        │(JSON+Redacted) ││(In-Memory)   ││(PostgreSQL)  │
        └────────────────┘└──────────────┘└──────────────┘
```

---

## 3. Granular Task Breakdown (`TSK-020-01` .. `TSK-020-14`)

| Task ID | Component | Task Description | Priority |
|---|---|---|---|
| `TSK-020-01` | **Observability Contracts** | Define typed contracts for `AuditEventType`, `MetricName`, and `LogLevel` | P0 |
| `TSK-020-02` | **Data Sanitizer & Redactor**| Build recursive PII/secret sanitizer for structured logs, metrics, and audits | P0 |
| `TSK-020-03` | **Correlation Context** | Build context-local correlation ID generator and propagator | P0 |
| `TSK-020-04` | **Structured JSON Logging** | Enhance `JSONFormatter` with auto correlation injection and deep redaction | P0 |
| `TSK-020-05` | **Metrics Registry** | Build in-memory thread-safe `MetricsCollector` supporting counters, gauges, histograms | P0 |
| `TSK-020-06` | **Low-Cardinality Guard** | Implement label sanitizer preventing high-cardinality PII/ID label explosion | P0 |
| `TSK-020-07` | **Timing Instrumentation** | Build `timed_operation` context manager recording duration in ms safely | P0 |
| `TSK-020-08` | **Audit Trail Hardening** | Verify consistent recording and schema validation across all 12 audit events | P0 |
| `TSK-020-09` | **Health Probes Hardening**| Enhance `/healthz` and `/readyz` probes for database, redis, and openrouter | P0 |
| `TSK-020-10` | **Observability Summary API**| Build read-only operational KPI summary service and diagnostic endpoints | P0 |
| `TSK-020-11` | **Unit Tests** | Tests for sanitizer, correlation context, metrics registry, and timers | P0 |
| `TSK-020-12` | **Redaction & Security Tests**| Tests proving credentials, tokens, and PII cannot leak into logs or telemetry | P0 |
| `TSK-020-13` | **Integration & Health Tests**| Integration tests for DB audit queries, health checks, and summary endpoints | P0 |
| `TSK-020-14` | **Release & Completion Report**| Author Phase 11 completion report, update tracker and changelog | P0 |
| `TSK-020` | **Master Task** | Complete Observability, Audit Trail & Metrics subsystem | P0 |

---

## 4. Authoritative Audit Event Family

All 12 lifecycle event types are preserved and verified:
1. `CUSTOMER_CONTEXT_AGGREGATED` (Phase 5)
2. `AI_DECISION_PRODUCED` (Phase 6)
3. `POLICY_DECISION_EVALUATED` (Phase 7)
4. `RECOVERY_ACTION_EXECUTED` (Phase 8)
5. `RECOVERY_ACTION_SCHEDULED` (Phase 8)
6. `RECOVERY_ACTION_BLOCKED` (Phase 8)
7. `RECOVERY_ACTION_FAILED` (Phase 8)
8. `PAYMENT_OUTCOME_RECONCILED` (Phase 9)
9. `PAYMENT_OUTCOME_FAILED` (Phase 9)
10. `PAYMENT_OUTCOME_MISMATCH` (Phase 9)
11. `PAYMENT_OUTCOME_UNKNOWN` (Phase 9)
12. `RECOVERY_STATE_TRANSITIONED` (Phase 10)

---

## 5. Definition of Done (DoD)

- [ ] All 12 audit events typed and validated.
- [ ] Correlation ID propagated across service boundaries.
- [ ] Secret and PII sanitizer recursively redacts sensitive fields in all telemetry.
- [ ] In-memory metrics registry records pipeline, AI, policy, execution, reconciliation, and OCC stats.
- [ ] Safe operation timing context manager (`timed_operation`) never raises on exceptions.
- [ ] Readiness probes test DB, Redis, and OpenRouter readiness safely.
- [ ] 100% of existing Phase 2–10 tests continue to pass.
- [ ] Backend test coverage remains $\ge 90\%$.
- [ ] Zero secrets detected by `scripts/security_scan.py`.
- [ ] Local `.env` preserved and untracked.
