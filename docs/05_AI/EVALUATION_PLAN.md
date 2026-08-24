# SmartMandateRetry — Evaluation Plan & Benchmark Strategy

> **Document ID:** DOC-AI-003  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## 1. Baseline Definitions

To demonstrate measurable, empirical revenue recovery value, SmartMandateRetry benchmarks against two explicit reference strategies:

1. **Baseline A: Native Fixed-Schedule Retry (Razorpay Model)**
   - Retries automatically once a day for 3 days on existing mandate during `pending`.
   - Halts after day 3 with zero subsequent out-of-band recovery actions.
2. **Baseline B: Simple Rule-Based Retry Strategy**
   - Retries once after a fixed 48-hour delay; permanently stops if second attempt fails.
3. **System Under Test: SmartMandateRetry**
   - Dual-stage context-aware recovery orchestration: early non-conflicting customer guidance during `pending`, followed by contextual Payment Link generation, delayed re-engagement, and policy safety gating post-`halted`.

---

## 2. Benchmark Execution Pipeline in Evaluation Lab

```
[Load Frozen Held-Out Dataset (1,000 cases)]
                  │
                  ▼
[Execute Baseline A: Native Fixed-Schedule Retry (T+1..T+3)]
  ──> Compute: Baseline A Recovery Rate, Revenue Recovered, Wasted Attempts
                  │
                  ▼
[Execute Baseline B: Simple Rule-Based Retry (48h)]
  ──> Compute: Baseline B Recovery Rate, Revenue Recovered
                  │
                  ▼
[Execute SmartMandateRetry Engine Pipeline]
  ──> Ingestion -> Triage -> Context -> OpenRouter AI -> Policy Gate -> Action -> Settlement
  ──> Compute: Smart Recovery Rate, Revenue Recovered, Policy Compliance
                  │
                  ▼
[Generate Comparative Audit & Attribution Report]
  - Recovery Uplift Delta (pp)
  - Incremental Net Recovered Revenue (INR)
  - Reduction in Wasted Retries on Hard Declines (%)
  - Policy Violation Count (Target: 0)
  - Failure Classification Confusion Matrix
```

---

## 3. Ground Truth Data Generation Requirements

The synthetic benchmark dataset (5,000 cases) must cover realistic failure distributions:
- `TEMPORARY (Liquidity)`: 45% (Customer balance fluctuates; responds to payday alignment & Payment Links)
- `ACTION_REQUIRED (Card Expiry / Mandate)`: 25% (Requires mandate update or new payment rail)
- `TEMPORARY (Bank / Gateway Downtime)`: 15% (Recovers after 12–24h)
- `PERMANENT (Hard Decline / Account Closed)`: 10% (Never recovers; must be immediately stopped)
- `UNKNOWN / Ambiguous Bank Reject Code`: 5% (Requires AI diagnostic fallback)
