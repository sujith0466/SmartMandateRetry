# SmartMandateRetry — Free Model Catalog Snapshot

> **Document ID:** DOC-PROG-025  
> **Status:** POINT-IN-TIME SNAPSHOT  
> **Generated:** 2026-08-26  
> **Authority Note:** *This catalog is a point-in-time snapshot. Runtime discovery by [`FreeModelRegistry`](file:///d:/SmartMandateRetry/backend/app/infrastructure/openrouter_model_registry.py) remains authoritative.*  

---

## 1. Discovered Free Models ($0.00 Input / $0.00 Output)

| Rank | Model Identifier | Provider | Pricing (Prompt / Comp) | Context Length | Structured Output Support | Recommended Tier |
|---|---|---|---|---|---|---|
| 1 | `nvidia/nemotron-3.5-lightning:free` | NVIDIA | $0.00 / $0.00 | 1,000,000 | Yes (JSON Schema) | Tier 1 (Primary Reasoning) |
| 2 | `dots-studio/dots-3-note-preview:free` | Dots Studio | $0.00 / $0.00 | 512,000 | Yes (JSON Object) | Tier 1 (Primary Reasoning) |
| 3 | `thinkingmachines/inkling:free` | Thinking Machines | $0.00 / $0.00 | 1,048,576 | Yes (JSON Object) | Tier 2 (Reliable Failover) |
| 4 | `poolside/laguna-s-2.1:free` | Poolside | $0.00 / $0.00 | 262,144 | Yes (JSON Object) | Tier 2 (Reliable Failover) |
| 5 | `cohere/north-mini-code:free` | Cohere | $0.00 / $0.00 | 256,000 | Yes (JSON Object) | Tier 2 (Reliable Failover) |
| 6 | `liquid/lfm-2.5-2.6b:free` | Liquid | $0.00 / $0.00 | 65,536 | Yes (JSON Object) | Tier 3 (Fast Lightweight) |
| 7 | `poolside/laguna-xs-2.1:free` | Poolside | $0.00 / $0.00 | 262,144 | Yes (JSON Object) | Tier 3 (Fast Lightweight) |

---

## 2. Hard Cost & Security Verification

1. **Strict $0 Cost Filtering:** Any model where `prompt_price > 0` or `completion_price > 0` is strictly excluded from registration.
2. **Pre-Call Assertion:** The `OpenRouterProvider` executes `assert registry.is_model_free(model_id)` prior to every HTTP request.
3. **No Paid Fallback Path:** If all free models in the pool are rate-limited or unavailable, the system safely triggers Phase 6's deterministic `FallbackDecisionEngine`, routing to `MANUAL_ESCALATION` or `STOP`.
