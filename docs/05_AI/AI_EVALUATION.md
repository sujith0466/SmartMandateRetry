# SmartMandateRetry — AI Evaluation Specification

> **Document ID:** DOC-AI-002  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## 1. Evaluation Methodology

SmartMandateRetry rigorously evaluates recovery decisions without fabricating or assuming unmeasured performance numbers. Strategy performance is benchmarked against a partitioned 5,000-scenario synthetic dataset:
- **Development Split (60% — 3,000 cases):** Used for prompt refinement, failure taxonomy mapping, and feature calibration.
- **Validation Split (20% — 1,000 cases):** Used for policy threshold tuning (e.g. confidence gate calibration).
- **Held-Out Test Split (20% — 1,000 cases):** Frozen benchmark evaluated during demo runs. **Never tuned against during development.**

---

## 2. Metric Formulations & Targets

| Metric | Mathematical Definition | Evaluation Target |
|---|---|---|
| **Recovery Rate (%)** | `(Recovered Payment Count / Eligible Failed Payment Count) * 100` | Empirically measured vs Baseline |
| **Revenue Recovery Rate (%)**| `(Total Recovered Revenue INR / Total At-Risk Revenue INR) * 100` | Empirically measured vs Baseline |
| **Recovery Uplift (pp)** | `SmartMandateRetry Recovery Rate (%) - Baseline Recovery Rate (%)` | Measure statistically significant delta (> 0) |
| **Retry Efficiency** | `Total Recovered Payments / Total Recovery Actions Dispatched` | Maximize (minimize wasted actions) |
| **Policy Violations** | Number of executed actions violating merchant safety policies | **Strict 0 (Zero Tolerance)** |
| **Failure Classification Accuracy**| `Correct Failure Category Predictions / Total Evaluated Scenarios` | Benchmark against ground truth labels |
| **Unnecessary Intervention Rate**| `Interventions Dispatched on Permanent Hard Declines / Total Hard Declines` | Target: 0% (blocked by policy) |
| **Invalid AI Output Rate** | `Schema Validation Failures / Total AI Invocations` | Target: < 1.0% |
