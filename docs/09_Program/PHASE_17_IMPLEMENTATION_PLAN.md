# Phase 17 — Comparative Benchmark Runner & Evaluation Engine
## Implementation Plan

> **Document ID:** DOC-PROG-045  
> **Phase:** 17 — Comparative Benchmark Runner & Evaluation Engine  
> **Status:** PLANNING  
> **Baseline:** Phase 2–16 COMPLETE + FROZEN (Commit: `d1df777`)  
> **Authored:** 2026-08-26  

---

## 1. Executive Summary & Objective

Phase 17 builds the **Comparative Benchmark Runner and Evaluation Engine** for SmartMandateRetry. The engine consumes the deterministic synthetic evaluation datasets produced by Phase 16, executes multiple recovery evaluation modes against the scenarios, evaluates predicted outcomes against Phase 16 ground truth, computes rigorous accuracy, safety, and comparative recovery uplift metrics, persists evaluation runs in the database, and produces machine-readable benchmark reports suitable for consumption by Phase 18 (Evaluation Lab UI).

### Core Principle
"Phase 16 generates the benchmark scenarios and ground truth. Phase 17 executes controlled evaluation modes against those scenarios, computes deterministic comparative metrics, records evaluation results, and produces machine-readable benchmark reports. Phase 17 must never use real customer/payment data and must never mutate production recovery behavior."

---

## 2. Baseline Architecture & Discovery Findings

### 2.1 Existing Database Foundation (Models Verified)
- **`EvaluationRun`** (`evaluation_runs` table in `backend/app/domain/models.py`):
  - `id`: String(36), PK, prefixed UUID (`run_...`)
  - `dataset_name`: String(128), name/filename of consumed dataset
  - `baseline_mode`: String(64), evaluation mode identifier
  - `metrics_summary`: JSONB / JsonType, complete aggregate metrics dictionary
  - `created_at`: DateTime(timezone=True)
  - Relationship: `.results` -> List[`EvaluationScenarioResult`] (cascade="all, delete-orphan")
- **`EvaluationScenarioResult`** (`evaluation_scenario_results` table in `backend/app/domain/models.py`):
  - `id`: String(36), PK, prefixed UUID (`res_...`)
  - `evaluation_run_id`: ForeignKey(`evaluation_runs.id`, ondelete="CASCADE")
  - `scenario_id`: String(64), references Phase 16 scenario identifier
  - `actual_outcome`: String(32), ground truth label (`ALLOW`, `BLOCK`, `ESCALATE`, `STOP`)
  - `simulated_outcome`: String(32), predicted outcome from evaluation mode
  - `details`: JSONB / JsonType, per-scenario prediction details, action, policy status, reasons, execution time
  - `created_at`: DateTime(timezone=True)
- **`EvaluationRepository`** (`backend/app/infrastructure/repositories/domain_entities.py`):
  - Subclasses `BaseRepository[EvaluationRun]`, provides `get_latest_runs(limit=10)`
  - Bound to `UnitOfWork.evaluations` in `backend/app/infrastructure/repositories/unit_of_work.py`
- **Schema Verdict:** The existing database schema and repository infrastructure are **100% sufficient**. **No database migrations are required.**

### 2.2 Phase 16 Subsystem Consumed (Read-Only)
- `backend/app/evaluation/scenario_schema.py`: `SyntheticScenario`, `DatasetManifest`
- `backend/app/evaluation/dataset_manifest.py`: `DatasetManifestManager.load()`
- Ground truth fields consumed:
  - `scenario.expected_policy_outcome` (`ALLOWED` / `MODIFIED` / `BLOCKED`)
  - `scenario.expected_final_action` (`SCHEDULE_RECOVERY_CHECK` / `PAYMENT_LINK_RECOVERY` / `PAYMENT_METHOD_RECOVERY` / `MANUAL_ESCALATION` / `STOP`)
  - `scenario.expected_case_outcome` (`RECOVERED` / `FAILED` / `ESCALATED` / `STOPPED` / `EXPIRED`)
  - `scenario.ground_truth_label` (`ALLOW` / `BLOCK` / `ESCALATE` / `STOP`)

### 2.3 Phase Boundary & Isolation
- **Phase 2–16:** 100% frozen. No modifications to production ingestion, AI prompts, state machine, reconciliation, or Phase 16 generator.
- **Phase 18 (Evaluation Lab UI):** NOT started. `EvaluationPage.tsx` remains untouched.
- **Zero Real Financial Operations:** Zero live gateway or Razorpay API calls.

---

## 3. Evaluation Architecture & Module Layout

```
backend/app/evaluation/
    __init__.py                  # Package exports
    scenario_schema.py           # [Phase 16] Pydantic scenario & manifest schemas
    seed_manager.py              # [Phase 16] Deterministic PRNG seed manager
    scenario_generator.py        # [Phase 16] 14 families + 4 tiers generator
    dataset_splitter.py          # [Phase 16] Leakage-safe entity-grouped splitter
    dataset_manifest.py          # [Phase 16] Manifest serialization & validation
    evaluation_modes.py          # [Phase 17 - NEW] Evaluator adapters (Smart, Razorpay Native, Rule-Based, AI-Unguarded)
    metrics.py                   # [Phase 17 - NEW] Confusion matrix, accuracy, safety compliance, uplift metrics
    evaluation_engine.py         # [Phase 17 - NEW] Scenario runner, prediction comparator, deterministic engine
    persistence.py               # [Phase 17 - NEW] UoW database persistence for EvaluationRun & ScenarioResults
    benchmark_runner.py          # [Phase 17 - NEW] High-level multi-mode benchmark orchestrator
    report.py                    # [Phase 17 - NEW] Machine-readable JSON & Markdown report generator

backend/tests/test_evaluation/
    test_evaluation_modes.py     # [Phase 17 - NEW] Mode adapter prediction tests
    test_metrics.py              # [Phase 17 - NEW] Metric calculations, confusion matrix, F1, safety rates
    test_evaluation_engine.py    # [Phase 17 - NEW] Scenario evaluation engine & determinism tests
    test_persistence.py          # [Phase 17 - NEW] Database persistence & UoW integration tests
    test_benchmark_runner.py     # [Phase 17 - NEW] Benchmark runner & multi-mode comparison tests
    test_benchmark_cli.py        # [Phase 17 - NEW] CLI arguments, execution, and validation tests

scripts/
    run_eval_benchmark.py        # [Phase 17 - NEW] Standalone benchmark execution & reporting CLI
```

---

## 4. Evaluation Modes Specification

Phase 17 implements 4 distinct evaluation modes to measure the empirical value of SmartMandateRetry against industry baselines and ablation controls:

```
                      ┌─────────────────────────────────────────┐
                      │    Phase 16 Synthetic Scenario Input    │
                      └────────────────────┬────────────────────┘
                                           │
         ┌──────────────────┬──────────────┴─────┬──────────────────┐
         ▼                  ▼                    ▼                  ▼
┌─────────────────┐┌─────────────────┐┌─────────────────┐┌─────────────────┐
│  SMART_MANDATE  ││ RAZORPAY_NATIVE ││   RULE_BASED    ││  AI_UNGUARDED   │
│  (System Under  ││  (Baseline A:   ││  (Baseline B:   ││ (Ablation: AI   │
│      Test)      ││ Naive 3-Retry)  ││   Static 48h)   ││ Without Policy) │
└────────┬────────┘└────────┬────────┘└────────┬────────┘└────────┬────────┘
         │                  │                    │                  │
         └──────────────────┼────────────────────┴──────────────────┘
                            ▼
         ┌─────────────────────────────────────┐
         │     Evaluation Prediction Match     │
         │ (Policy Status, Action, Outcome)    │
         └──────────────────┬──────────────────┘
                            ▼
         ┌─────────────────────────────────────┐
         │       Ground Truth Comparison       │
         │   (Accuracy, Safety Rates, Uplift)  │
         └─────────────────────────────────────┘
```

### 4.1 Mode 1: `SMART_MANDATE` (System Under Test)
- **Concept:** Full dual-stage context-aware recovery orchestration with prioritized policy safety gates.
- **Evaluation Logic:**
  1. Checks `hard_decline` with auto-stop -> `BLOCKED` / `STOP` / `STOPPED` (`BLOCK`)
  2. Checks retry attempt cap (`attempt_count >= max_retries`) -> `BLOCKED` / `STOP` / `STOPPED` (`BLOCK`)
  3. Checks recovery window expiry (`case_age > max_window * 24`) -> `BLOCKED` / `STOP` / `EXPIRED` (`BLOCK`)
  4. Checks high-value threshold (`amount >= threshold`) -> `MODIFIED` / `MANUAL_ESCALATION` / `ESCALATED` (`ESCALATE`)
  5. Checks AI confidence threshold (`confidence < threshold`) -> `BLOCKED` / `STOP` / `FAILED` (`BLOCK`)
  6. Checks contact frequency limit (`contacts >= max_contacts`) -> `BLOCKED` / `STOP` / `FAILED` (`BLOCK`)
  7. Dispatches contextual action (`SCHEDULE_RECOVERY_CHECK`, `PAYMENT_LINK_RECOVERY`, `PAYMENT_METHOD_RECOVERY`) -> `ALLOWED` / `RECOVERED` (`ALLOW`)
- **Expected Outcome:** 100% Policy Safety Compliance, High Recovery Rate, 0 Policy Violations.

### 4.2 Mode 2: `RAZORPAY_NATIVE` (Baseline A — Fixed Naive Retries)
- **Concept:** Industry standard fixed-schedule mandate retry (retry once daily up to 3 times during `pending`).
- **Evaluation Logic:**
  - Blindly attempts `SCHEDULE_RECOVERY_CHECK` if `attempt_count < 3`.
  - Once `attempt_count >= 3` or case moves to `halted`, it gives up (`STOP` / `FAILED`).
  - **Flaws Simulated:**
    - Attempts retries on non-recoverable hard declines (e.g. `do_not_honour`, `account_closed`), wasting retry attempts.
    - Zero out-of-band payment link or payment method recovery for expired cards or auth failures post-halt.
    - Zero high-value risk escalation awareness.
- **Expected Outcome:** Lower recovery rate, high wasted attempts on hard declines.

### 4.3 Mode 3: `RULE_BASED` (Baseline B — Simple Static Strategy)
- **Concept:** Conventional fixed heuristic (retry once after 48 hours for transient failures; static stop on hard declines).
- **Evaluation Logic:**
  - Hard declines stopped (`STOP`).
  - Single retry allowed if `attempt_count == 0` for liquidity errors.
  - High value escalated if above static 10,000 INR.
  - **Flaws Simulated:**
    - Inflexible 1-retry limit drops salvageable subscriptions.
    - Lacks multi-channel link orchestration for expired cards or auth dropouts.
    - Fails to adapt to customer tenure or confidence nuances.

### 4.4 Mode 4: `AI_UNGUARDED` (Ablation Control — AI Without Policy Safety Gates)
- **Concept:** Evaluates raw AI output without merchant policy constraints.
- **Evaluation Logic:**
  - Adopts `ai_decision.recommended_action` unconditionally.
  - Bypasses retry caps, high-value limits, and contact caps.
- **Expected Outcome:** Demonstrates that raw AI without safety gates causes policy breaches (e.g. attempting retries past merchant caps).

---

## 5. Metrics Formulation & Calculation Engine

### 5.1 Classification & Outcome Accuracy
- **Exact Policy Outcome Accuracy:** `Count(predicted_policy_outcome == expected_policy_outcome) / N`
- **Exact Final Action Accuracy:** `Count(predicted_final_action == expected_final_action) / N`
- **Exact Case Outcome Accuracy:** `Count(predicted_case_outcome == expected_case_outcome) / N`
- **Ground Truth Label Accuracy:** `Count(predicted_label == ground_truth_label) / N`
- **4-Class Confusion Matrix:** Matrix of True vs Predicted for `ALLOW`, `BLOCK`, `ESCALATE`, `STOP`
- **Per-Class Metrics:** Precision, Recall, F1-Score for each class
- **Macro F1 Score:** Unweighted mean of F1 scores across the 4 classes
- **Weighted F1 Score:** F1 scores weighted by class support

### 5.2 Safety & Governance Compliance Metrics (Zero-Tolerance Gates)
- **`hard_decline_safety_rate`:** `Count(hard_decline scenarios with predicted_label == 'BLOCK') / Count(hard_decline scenarios)` (Target: 100%)
- **`retry_cap_safety_rate`:** `Count(cap_exhausted scenarios with predicted_label == 'BLOCK') / Count(cap_exhausted scenarios)` (Target: 100%)
- **`recovery_window_enforcement_rate`:** `Count(expired_window scenarios with predicted_label == 'BLOCK') / Count(expired_window scenarios)` (Target: 100%)
- **`high_value_escalation_compliance`:** `Count(high_value scenarios with predicted_label == 'ESCALATE') / Count(high_value scenarios)` (Target: 100%)
- **`low_confidence_veto_rate`:** `Count(low_confidence scenarios with predicted_label == 'BLOCK') / Count(low_confidence scenarios)` (Target: 100%)
- **`contact_cap_enforcement_rate`:** `Count(contact_capped scenarios with predicted_label == 'BLOCK') / Count(contact_capped scenarios)` (Target: 100%)
- **`total_policy_violations`:** Total count of safety breaches across all evaluated scenarios (Target: 0)

### 5.3 Comparative Recovery & Financial Uplift Metrics
- **`simulated_recovery_rate`:** `Count(predicted_case_outcome == 'RECOVERED') / Count(eligible recoverable scenarios)`
- **`recovery_uplift_pp`:** `SmartMandate Recovery Rate (%) - Baseline Recovery Rate (%)` (Percentage points)
- **`simulated_recovered_revenue_inr`:** Total INR value of scenarios predicted as `RECOVERED`
- **`revenue_recovery_rate`:** `Recovered Revenue INR / Total At-Risk Revenue INR`
- **`wasted_action_rate`:** `Actions dispatched on non-recoverable hard declines / Total actions dispatched`
- **`intervention_efficiency`:** `Recovered cases / Total recovery actions dispatched`

### 5.4 Dimensional Breakdowns
- **Per-Family Breakdown:** Accuracy, recovery count, and violation count across all 14 families
- **Per-Difficulty Tier Breakdown:** Accuracy and safety rates across `EASY`, `MEDIUM`, `HARD`, `EDGE`
- **Per-Failure Category Breakdown:** Metrics across the 6 standardized failure categories
- **Per-Split Breakdown:** Metrics computed independently for `TRAIN`, `VALIDATION`, and `TEST`

---

## 6. Dataset Split Selection & Leakage Guarantees

- **Supported Splits:** `TRAIN`, `VALIDATION`, `TEST` (default: `TEST`).
- **Strict Split Isolation:** The engine filters scenarios strictly by `scenario.dataset_split == selected_split`.
- **Zero Leakage:** Test evaluations strictly consume scenarios from the `TEST` partition (where customer IDs never appeared in `TRAIN` or `VALIDATION`).

---

## 7. Database Persistence Architecture

### 7.1 Entity Mapping
```python
# EvaluationRun
run = EvaluationRun(
    id=generate_uuid("run"),
    dataset_name=manifest.generation_config.get("dataset_name", f"eval_dataset_{manifest.generation_seed}_{manifest.total_scenarios}"),
    baseline_mode=mode.value,
    metrics_summary=benchmark_metrics.to_dict(),
    created_at=datetime.now(timezone.utc),
)

# EvaluationScenarioResult
scenario_result = EvaluationScenarioResult(
    id=generate_uuid("res"),
    evaluation_run_id=run.id,
    scenario_id=scenario.scenario_id,
    actual_outcome=scenario.ground_truth_label,
    simulated_outcome=prediction.predicted_label,
    details={
        "scenario_family": scenario.scenario_family,
        "difficulty_tier": scenario.difficulty_tier,
        "predicted_action": prediction.predicted_action,
        "predicted_policy_status": prediction.predicted_policy_status,
        "predicted_case_outcome": prediction.predicted_case_outcome,
        "is_correct": prediction.predicted_label == scenario.ground_truth_label,
        "execution_time_ms": round(scenario_execution_ms, 3),
        "reasons": prediction.reasons,
    },
    created_at=datetime.now(timezone.utc),
)
```

### 7.2 Transactional Persistence via UnitOfWork
```python
class EvaluationPersistenceService:
    def __init__(self, uow: Optional[UnitOfWork] = None) -> None:
        self.uow = uow or UnitOfWork()

    def persist_run(
        self,
        manifest: DatasetManifest,
        mode: EvaluationMode,
        metrics: BenchmarkMetrics,
        scenario_results: List[ScenarioEvaluationResult],
    ) -> EvaluationRun:
        with self.uow:
            run = EvaluationRun(...)
            for res in scenario_results:
                run.results.append(EvaluationScenarioResult(...))
            self.uow.evaluations.add(run)
            self.uow.commit()
            return run
```

---

## 8. CLI Interface (`scripts/run_eval_benchmark.py`)

### 8.1 CLI Arguments
```bash
# Execute single mode benchmark on TEST split
python scripts/run_eval_benchmark.py --dataset datasets/eval_dataset_42_5000.json --split TEST --mode SMART_MANDATE

# Execute comparative multi-mode benchmark (Smart vs Razorpay Native vs Rule-Based)
python scripts/run_eval_benchmark.py --dataset datasets/eval_dataset_42_5000.json --split TEST --compare --output reports/

# Execute and persist to database
python scripts/run_eval_benchmark.py --dataset datasets/eval_dataset_42_5000.json --split TEST --mode SMART_MANDATE --persist

# Validate manifest before running
python scripts/run_eval_benchmark.py --validate datasets/eval_dataset_42_5000.json
```

---

## 9. Machine-Readable Report Schema (`report.py`)

```json
{
  "benchmark_version": "1.0.0",
  "phase": "17",
  "generated_at_utc": "2026-08-26T12:00:00Z",
  "dataset": {
    "name": "eval_dataset_42_5000.json",
    "generation_seed": 42,
    "selected_split": "TEST",
    "total_scenarios_in_split": 802
  },
  "evaluation": {
    "mode": "SMART_MANDATE",
    "evaluator_version": "1.0.0"
  },
  "overall_metrics": {
    "total_evaluated": 802,
    "label_accuracy": 1.0,
    "policy_outcome_accuracy": 1.0,
    "final_action_accuracy": 1.0,
    "case_outcome_accuracy": 1.0,
    "macro_f1": 1.0,
    "weighted_f1": 1.0
  },
  "confusion_matrix": {
    "ALLOW": {"ALLOW": 382, "BLOCK": 0, "ESCALATE": 0, "STOP": 0},
    "BLOCK": {"ALLOW": 0, "BLOCK": 324, "ESCALATE": 0, "STOP": 0},
    "ESCALATE": {"ALLOW": 0, "BLOCK": 0, "ESCALATE": 96, "STOP": 0},
    "STOP": {"ALLOW": 0, "BLOCK": 0, "ESCALATE": 0, "STOP": 0}
  },
  "safety_metrics": {
    "hard_decline_safety_rate": 1.0,
    "retry_cap_safety_rate": 1.0,
    "recovery_window_enforcement_rate": 1.0,
    "high_value_escalation_compliance": 1.0,
    "low_confidence_veto_rate": 1.0,
    "contact_cap_enforcement_rate": 1.0,
    "total_policy_violations": 0
  },
  "comparative_metrics": {
    "simulated_recovery_rate": 0.85,
    "recovery_uplift_pp": 28.5,
    "simulated_recovered_revenue_inr": "2450000.00",
    "wasted_action_rate": 0.0
  },
  "family_metrics": { ... },
  "difficulty_metrics": { ... },
  "failure_category_metrics": { ... }
}
```

---

## 10. Testing Strategy (Target: >= 50 New Tests)

| Test File | Focus Area | Test Count |
|---|---|---|
| `test_evaluation_modes.py` | Mode adapters, prediction rules, baseline naive behavior, ablation | 15 tests |
| `test_metrics.py` | Accuracy, confusion matrix, precision/recall/F1, safety compliance rates, uplift deltas | 15 tests |
| `test_evaluation_engine.py` | Scenario iteration, split filtering, prediction comparison, determinism | 12 tests |
| `test_persistence.py` | Database persistence, UoW transaction rollback/commit, relationship cascading | 8 tests |
| `test_benchmark_runner.py` | Multi-mode orchestration, comparative uplift calculation, machine report building | 10 tests |
| `test_benchmark_cli.py` | CLI execution, arguments, invalid input rejection, exit codes | 8 tests |

**Total Phase 17 Tests:** >= 68 tests.

---

## 11. Task Breakdown (`TSK-026-01` through `TSK-026-14`)

| Task ID | Component | Description |
|---|---|---|
| `TSK-026-01` | Architecture Discovery | Formalize Phase 17 evaluation engine contract and verify domain model compatibility (this document) |
| `TSK-026-02` | Mode Adapters | Implement `evaluation_modes.py` (`SmartMandateEvaluator`, `RazorpayNativeEvaluator`, `RuleBasedEvaluator`, `AIUnguardedEvaluator`) |
| `TSK-026-03` | Metrics Engine | Implement `metrics.py` (confusion matrix, precision/recall/F1, safety rates, recovery uplift, dimensional breakdowns) |
| `TSK-026-04` | Evaluation Engine | Implement `evaluation_engine.py` (scenario iteration, split filtering, deterministic prediction comparison) |
| `TSK-026-05` | Persistence Service | Implement `persistence.py` (`EvaluationPersistenceService` integrating with UnitOfWork and database models) |
| `TSK-026-06` | Report Generator | Implement `report.py` (`BenchmarkReportGenerator` producing machine-readable JSON and Markdown summaries) |
| `TSK-026-07` | Benchmark Runner | Implement `benchmark_runner.py` (`BenchmarkRunner` orchestrating multi-mode comparison and reporting) |
| `TSK-026-08` | Benchmark CLI | Implement `scripts/run_eval_benchmark.py` supporting `--dataset`, `--split`, `--mode`, `--compare`, `--persist` |
| `TSK-026-09` | Mode Adapter Tests | Implement `backend/tests/test_evaluation/test_evaluation_modes.py` |
| `TSK-026-10` | Metrics Tests | Implement `backend/tests/test_evaluation/test_metrics.py` |
| `TSK-026-11` | Engine Tests | Implement `backend/tests/test_evaluation/test_evaluation_engine.py` |
| `TSK-026-12` | Persistence Tests | Implement `backend/tests/test_evaluation/test_persistence.py` |
| `TSK-026-13` | Runner & CLI Tests | Implement `backend/tests/test_evaluation/test_benchmark_runner.py` and `test_benchmark_cli.py` |
| `TSK-026-14` | QA & Release Certification | Full regression suite, coverage >=90%, security scan, docs audit, commit, and push |

**Master Task: `TSK-026` — Complete Comparative Benchmark Runner & Evaluation Engine**

---

## 12. Quality Verification Gates

```bash
# 1. Full backend test suite (Phase 2-16 + Phase 17)
python -m pytest backend/tests/ -v

# 2. Backend code coverage
python -m pytest backend/tests/ --cov=app --cov-report=term-missing

# 3. CLI multi-mode benchmark execution
python scripts/run_eval_benchmark.py --dataset datasets/eval_dataset_42_5000.json --split TEST --compare

# 4. Frontend build verification (must remain green)
cd frontend && npm run build && cd ..

# 5. Security and secret audit
python scripts/security_scan.py

# 6. Documentation integrity audit
python scripts/audit_docs.py

# 7. Docker compose configuration
docker compose config
```

---

## 13. Definition of Done

- [ ] All 6 evaluation modules in `backend/app/evaluation/` implemented and typed
- [ ] 4 evaluation modes (`SMART_MANDATE`, `RAZORPAY_NATIVE`, `RULE_BASED`, `AI_UNGUARDED`) fully implemented
- [ ] Classification, safety compliance, and comparative uplift metrics implemented
- [ ] `EvaluationRun` and `EvaluationScenarioResult` database persistence operational via UnitOfWork
- [ ] Standalone CLI `run_eval_benchmark.py` operational with exit codes and error handling
- [ ] >= 50 new automated Phase 17 unit tests passing (100% pass rate)
- [ ] All 271 existing Phase 2–16 backend tests continue to pass (320+ total backend tests)
- [ ] Backend code coverage remains >= 90.0%
- [ ] 5,000-scenario benchmark evaluation executes in < 5.0 seconds
- [ ] Security scanner reports 0 findings
- [ ] Frontend production build passes with 0 errors
- [ ] Documentation audit passes (74 required documents)
- [ ] `.env` remains untouched and untracked
- [ ] Working tree clean
- [ ] Phase 18 remains NOT STARTED
- [ ] Committed and pushed to `origin main`
