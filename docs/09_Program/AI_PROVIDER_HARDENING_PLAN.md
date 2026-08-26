# SmartMandateRetry — AI Provider Hardening & Free-Model Integration Plan

> **Document ID:** DOC-PROG-024  
> **Phase:** AI Provider Hardening & Free-Model Integration  
> **Status:** PLANNING BASELINE  
> **Author:** Principal AI Systems Architect & Security Engineer  
> **Dependencies:** Phase 2–7 (Complete and Frozen)  

---

## 1. Objective & Security Guardrails

### Primary Objective
Upgrade SmartMandateRetry's existing Phase 6 OpenRouter integration into an enterprise-grade, **FREE-ONLY** dynamic model routing and failover subsystem.

### Critical Safety & Cost Guardrails
1. **$0.00 Cost Guarantee:** The system must ONLY use models where `input_price == 0` and `output_price == 0`.
2. **Zero Paid Fallbacks:** There is NO code path that falls back to a paid model under any condition. If free models are unavailable or exhausted, the system routes directly to the deterministic safe fallback (`FallbackDecisionEngine` from Phase 6).
3. **No Hard-Coded Single Models:** Models are discovered dynamically from OpenRouter's `/api/v1/models` catalog, filtered, ranked, and rotated upon transient failures (429, 5xx, timeouts, malformed outputs).
4. **Secret Isolation:** OpenRouter API keys and database connection strings are never printed, logged, or committed to Git.
5. **Phase 2–7 Immutability:** The structured decision schema (`AIDecisionOutput`), domain contracts (`AIDecisionResult`), and Policy Engine safety gates (`PolicyDecision`) remain strictly untouched and authoritative.

---

## 2. Component Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    FREE-ONLY OPENROUTER HARDENING SUBSYSTEM                 │
│                                                                             │
│  ┌──────────────────────────────┐                                           │
│  │   AIPromptBuilder (v1.0.0)   │ (Sanitized Context - Zero PII/Secrets)    │
│  └──────────────┬───────────────┘                                           │
│                 │                                                           │
│                 ▼                                                           │
│  ┌──────────────────────────────┐       ┌─────────────────────────────────┐ │
│  │     FreeModelRegistry        │ ◄───► │ OpenRouter Catalog API          │ │
│  │ - Dynamic Discovery         │       │ (GET /api/v1/models)            │ │
│  │ - Strict $0 Price Filter     │       └─────────────────────────────────┘ │
│  │ - Capability & Context Rank  │                                           │
│  │ - Health & Availability Pool │                                           │
│  └──────────────┬───────────────┘                                           │
│                 │                                                           │
│                 ▼ (Select Best Healthy Free Model)                          │
│  ┌──────────────────────────────┐                                           │
│  │   Free-Only Model Guard      │ ──► [FAIL-CLOSED if Price > $0]           │
│  └──────────────┬───────────────┘                                           │
│                 │                                                           │
│                 ▼                                                           │
│  ┌──────────────────────────────┐       ┌─────────────────────────────────┐ │
│  │    OpenRouterProvider        │ ◄───► │ OpenRouter Chat Completions     │ │
│  │ - JSON Mode Enforcement      │       │ (POST /chat/completions)        │ │
│  │ - 5.0s Timeout               │       └────────────────┬────────────────┘ │
│  │ - Model Rotation & Failover  │                        │                  │
│  └──────────────┬───────────────┘                        │ (On 429/5xx/TO)  │
│                 │                                        ▼                  │
│                 │                       ┌─────────────────────────────────┐ │
│                 │                       │ Rotate to Next Best Free Model  │ │
│                 │                       │ (Up to MAX_FREE_MODEL_ATTEMPTS) │ │
│                 │                       └─────────────────────────────────┘ │
│                 ▼                                                           │
│  ┌──────────────────────────────┐                                           │
│  │   AIDecisionValidator &      │                                           │
│  │   AIRiskEvaluator            │ (Validate Schema & Assign Risk Flags)     │
│  └──────────────┬───────────────┘                                           │
│                 │                                                           │
│                 ├────────────────────────────────────────┐ (If All Fail)    │
│                 ▼                                        ▼                  │
│  ┌──────────────────────────────┐       ┌─────────────────────────────────┐ │
│  │      AIDecisionResult        │       │     FallbackDecisionEngine      │ │
│  │ (Verified Free Model Used)   │       │ (Deterministic Safe Escalation) │ │
│  └──────────────┬───────────────┘       └────────────────┬────────────────┘ │
│                 │                                        │                  │
│                 └───────────────────┬────────────────────┘                  │
│                                     ▼                                       │
│                 ┌───────────────────────────────────────┐                   │
│                 │ Phase 7 Deterministic Safety Gate     │                   │
│                 │ (PolicyDecision: ALLOWED/MOD/BLOCKED) │                   │
│                 └───────────────────────────────────────┘                   │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Free Model Descriptor & Health Contract

### `FreeModelDescriptor`
- `model_id`: str (e.g. `"nvidia/nemotron-3-nano:free"`, `"meta-llama/llama-3.3-70b-instruct:free"`)
- `display_name`: str
- `provider`: str
- `input_price`: Decimal (must be `Decimal("0.0")`)
- `output_price`: Decimal (must be `Decimal("0.0")`)
- `context_length`: int
- `supports_json`: bool
- `is_free`: bool (`True`)
- `is_deprecated`: bool (`False`)
- `discovered_at`: datetime

### `ModelHealth`
- `model_id`: str
- `success_count`: int
- `failure_count`: int
- `timeout_count`: int
- `rate_limit_count`: int
- `average_latency_ms`: float
- `temporarily_unavailable_until`: Optional[datetime]

---

## 4. Model Discovery & Prioritization Ranking

The `FreeModelRegistry` ranks discovered free models deterministically:
1. **Capability Score:** Native JSON / structured output support (+50 pts)
2. **Context Window:** Context length $\ge 8,192$ tokens (+20 pts)
3. **Availability & Reliability:** Low recent failure rate and 0 active cooldowns (+30 pts)
4. **Latency Bonus:** Lower historical response latency (+10 pts)

Models with recent 429 rate limits or 5xx outages receive a 60-second temporary cooldown, allowing immediate failover to alternative free models in the pool.

---

## 5. Granular Task Breakdown

| Task ID | Component | Task Description | Priority |
|---|---|---|---|
| `TSK-014-01` | **Model Registry** | Implement `FreeModelDescriptor`, `ModelHealth`, and `FreeModelRegistry` | P0 |
| `TSK-014-02` | **Catalog Discovery** | Implement dynamic OpenRouter catalog querying and $0 price filtering | P0 |
| `TSK-014-03` | **Free-Only Guard** | Implement hard safety guard asserting `price == 0` before any API call | P0 |
| `TSK-014-04` | **Model Rotation** | Update `OpenRouterProvider` with multi-model failover loop (up to 3 free attempts) | P0 |
| `TSK-014-05` | **Mock LLM Provider** | Preserve offline `MockLLMProvider` for deterministic unit & CI testing | P0 |
| `TSK-014-06` | **Config Extension** | Add `OPENROUTER_FREE_ONLY`, `OPENROUTER_MAX_FREE_MODEL_ATTEMPTS` to Settings | P0 |
| `TSK-014-07` | **Observability** | Instrument AI telemetry with model name, free status, latency, and rotation counts | P1 |
| `TSK-014-08` | **Unit Tests** | Unit tests for catalog filtering, free guard, ranking, and health cooldowns | P0 |
| `TSK-014-09` | **Failover Tests** | Tests for 429 rate limit, 5xx server error, and timeout rotation | P0 |
| `TSK-014-10` | **Live Smoke Test** | Non-PII live smoke test against discovered free OpenRouter models | P0 |
| `TSK-014-11` | **Neon DB Verification** | Verification of Neon PostgreSQL connectivity and decision persistence | P0 |
| `TSK-014-12` | **Catalog Snapshot** | Author `docs/09_Program/FREE_MODEL_CATALOG.md` documenting current free models | P1 |

---

## 6. Definition of Done (DoD)

- [ ] `FreeModelRegistry` dynamically queries OpenRouter catalog and isolates $0 cost models.
- [ ] Hard assertion rejects any model with input or output price $> 0$.
- [ ] `OpenRouterProvider` rotates through healthy free models on 429, 5xx, or timeouts.
- [ ] Complete failure across all free models gracefully invokes `FallbackDecisionEngine`.
- [ ] Offline `MockLLMProvider` passes full backend test suite without API keys or network calls.
- [ ] 100% of existing Phase 2–7 tests continue to pass with 0 regressions.
- [ ] Neon PostgreSQL connectivity verified.
- [ ] Live non-PII smoke test completed and logged.
- [ ] Zero secrets detected by `scripts/security_scan.py`.
