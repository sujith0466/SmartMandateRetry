# Phase 16 — Synthetic Scenario Generator & Benchmark Dataset Split
## Implementation Plan

> **Document ID:** DOC-PROG-043
> **Phase:** 16 — Synthetic Scenario Generator & Benchmark Dataset Split
> **Status:** PLANNING
> **Baseline:** Phase 2-15 COMPLETE + FROZEN
> **Authored:** 2026-08-26

---

## 1. Phase 16 Objective

Build a deterministic, reproducible, leakage-safe synthetic evaluation dataset and scenario-generation subsystem.

The subsystem generates realistic but fully synthetic payment-recovery scenarios for consumption by:
- **Phase 17** — Comparative Benchmark Runner
- **Phase 18** — Evaluation Lab UI

**Core Principle:**
"Phase 16 generates controlled synthetic evaluation scenarios and deterministic train/validation/test dataset splits. It must never use real customer/payment data, must be reproducible from a seed, must prevent cross-split leakage, and must not alter production recovery behavior."

**Phase 17 and Phase 18 are NOT implemented in Phase 16.**

---

## 2. Existing Evaluation Architecture Discovered

### 2.1 Database Models (Verified — models.py)

**EvaluationRun** (`evaluation_runs`):
- `id`: String(36), PK
- `dataset_name`: String(128)
- `baseline_mode`: String(64)
- `metrics_summary`: JSONB
- `created_at`: DateTime UTC

**EvaluationScenarioResult** (`evaluation_scenario_results`):
- `id`: String(36), PK
- `evaluation_run_id`: FK -> evaluation_runs.id (CASCADE)
- `scenario_id`: String(64) — join key for Phase 17
- `actual_outcome`: String(32) — ground truth from Phase 16
- `simulated_outcome`: String(32) — Phase 17 result
- `details`: JSONB
- `created_at`: DateTime UTC

**No database migration is required.** Existing tables are sufficient.
Phase 16 does NOT write to the database — datasets are JSON manifest files.
Phase 17 will write EvaluationRun/EvaluationScenarioResult records.

### 2.2 EvaluationRepository (Verified)

```python
class EvaluationRepository(BaseRepository[EvaluationRun]):
    def get_latest_runs(self, limit: int = 10) -> List[EvaluationRun]
```

No modification required in Phase 16.

### 2.3 Frontend Placeholder

EvaluationPage.tsx is a placeholder. Unchanged in Phase 16.

### 2.4 Domain Contracts Reused (Read-Only Imports)

| Contract | Source | Usage |
|---|---|---|
| FailureCategory, Recoverability, Severity | failure_taxonomy.py | Failure code classification |
| FailureRuleRegistry._EXACT_REASON_MAP | failure_rules.py | Error code -> category mapping |
| CaseState, RecoveryActionType, TERMINAL_STATES | state_machine.py | Outcome label vocabulary |
| RecoveryPolicy check constraint bounds | models.py | Policy config validation |
| PolicyStatusEnum | policy_decision.py | Policy gate outcome labels |
| RecommendedActionEnum | ai_decision_schemas.py | AI action vocabulary |

---

## 3. Module Layout

```
backend/app/evaluation/
    __init__.py
    scenario_schema.py          # Pydantic schemas: SyntheticScenario, manifest
    seed_manager.py             # Deterministic PRNG + ID generation
    scenario_generator.py       # 14 families + 4 difficulty tiers
    dataset_splitter.py         # Entity-grouped leakage-safe split
    dataset_manifest.py         # Manifest serialize/deserialize

backend/tests/test_evaluation/
    __init__.py
    test_scenario_schema.py
    test_seed_manager.py
    test_scenario_generator.py
    test_dataset_splitter.py
    test_dataset_manifest.py

scripts/
    generate_eval_dataset.py    # CLI entry point
```

No new Flask blueprints. No new REST endpoints. No DB migrations.

---

## 4. Validated Failure Codes (From failure_rules.py)

| Failure Code | Category | Recoverability | Severity | Hard Decline |
|---|---|---|---|---|
| insufficient_funds | TEMPORARY_LIQUIDITY | RECOVERABLE | LOW | No |
| limit_exceeded | TEMPORARY_LIQUIDITY | RECOVERABLE | LOW | No |
| gateway_timeout | TEMPORARY_TECHNICAL | RECOVERABLE | LOW | No |
| bank_technical_error | TEMPORARY_TECHNICAL | RECOVERABLE | LOW | No |
| card_expired | ACTION_REQUIRED_INSTRUMENT | CONDITIONAL | MEDIUM | No |
| mandate_inactive | ACTION_REQUIRED_INSTRUMENT | CONDITIONAL | MEDIUM | No |
| token_invalidated | ACTION_REQUIRED_INSTRUMENT | CONDITIONAL | MEDIUM | No |
| authentication_failed | ACTION_REQUIRED_AUTH | CONDITIONAL | MEDIUM | No |
| customer_cancelled | ACTION_REQUIRED_AUTH | CONDITIONAL | MEDIUM | No |
| do_not_honour | PERMANENT_HARD_DECLINE | NON_RECOVERABLE | HIGH | YES |
| account_closed | PERMANENT_HARD_DECLINE | NON_RECOVERABLE | HIGH | YES |
| mandate_revoked | PERMANENT_HARD_DECLINE | NON_RECOVERABLE | HIGH | YES |
| fraud_suspected | PERMANENT_HARD_DECLINE | NON_RECOVERABLE | HIGH | YES |
| unknown_error | UNKNOWN_AMBIGUOUS | UNKNOWN | MEDIUM | No |

---

## 5. SyntheticScenario Schema

```python
class SyntheticScenario(BaseModel):
    scenario_id: str             # "syn_{seed}_{family}_{index:06d}"
    scenario_family: str
    difficulty_tier: str         # EASY / MEDIUM / HARD / EDGE
    dataset_split: str           # TRAIN / VALIDATION / TEST
    synthetic_customer_id: str   # "synth_cust_{seed}_{idx:05d}"
    synthetic_merchant_id: str   # "synth_merch_{seed}_{idx:04d}"
    failure_code: str
    failure_category: str
    recoverability: str
    severity: str
    is_hard_decline: bool
    customer_profile: SyntheticCustomerProfile
    recovery_case: SyntheticRecoveryCase
    policy_config: SyntheticPolicyConfig
    ai_decision: SyntheticAIDecision
    expected_policy_outcome: str    # ALLOWED / MODIFIED / BLOCKED
    expected_final_action: str
    expected_case_outcome: str      # RECOVERED/FAILED/ESCALATED/STOPPED/EXPIRED
    ground_truth_label: str         # ALLOW / BLOCK / ESCALATE / STOP
    generation_seed: int
    generation_timestamp_utc: str   # stable from seed, NOT system time
```

**Sub-schemas:**
- `SyntheticPolicyConfig` — 7 fields bounded by RecoveryPolicy constraints
- `SyntheticCustomerProfile` — tenure, success_rate, failures, contactability
- `SyntheticRecoveryCase` — amount_inr, value_band, attempt_count, contacts_count, age
- `SyntheticAIDecision` — recommended_action, ai_confidence, failure_class

---

## 6. Scenario Families (14 Validated)

| Family ID | Core Signal | Expected Outcome |
|---|---|---|
| insufficient_funds | RECOVERABLE + LOW severity | ALLOWED -> SCHEDULE_RECOVERY_CHECK |
| hard_decline_stop | NON_RECOVERABLE + auto_stop=True | BLOCKED -> STOPPED |
| expired_instrument | CONDITIONAL, instrument expired | ALLOWED -> PAYMENT_LINK/METHOD_RECOVERY |
| high_value_escalation | amount >= high_value_threshold | MODIFIED -> MANUAL_ESCALATION |
| retry_cap_exhaustion | attempt_count >= max_retries | BLOCKED -> STOPPED |
| low_confidence_veto | ai_confidence < threshold | BLOCKED -> FAILED |
| contact_frequency_cap | contacts_count >= max_contacts | BLOCKED/MODIFIED |
| recovery_window_expired | case_age > window_days*24h | BLOCKED -> EXPIRED |
| auth_failure_recovery | ACTION_REQUIRED_AUTH | ALLOWED -> PAYMENT_LINK_RECOVERY |
| gateway_timeout_retry | TEMPORARY_TECHNICAL | ALLOWED -> SCHEDULE_RECOVERY_CHECK |
| mandate_revoked_stop | mandate_revoked, NON_RECOVERABLE | BLOCKED -> STOPPED |
| veteran_high_success | tenure>=24mo, success_rate>=0.85 | ALLOWED -> RECOVERED |
| new_customer_ambiguous | tenure<3mo, INSUFFICIENT data | MODIFIED -> ESCALATED |
| reconciliation_recovery | PAYMENT_LINK_RECOVERY + settled | ALLOWED -> RECOVERED |

---

## 7. Difficulty Tiers

| Tier | Description |
|---|---|
| EASY | Single dominant signal, unambiguous outcome |
| MEDIUM | Two competing signals, rule prioritization required |
| HARD | Multiple conflicting signals, nuanced reasoning |
| EDGE | Boundary conditions (attempt_count == max_retries - 1, amount == threshold + 1) |

Target: 5,000 scenarios across 14 families with EASY/MEDIUM/HARD/EDGE distribution.

---

## 8. Deterministic Seed Strategy

```python
class SeedManager:
    def __init__(self, master_seed: int):
        self._master_seed = master_seed
        self._rng = random.Random(master_seed)

    def derive_family_rng(self, family_id: str) -> random.Random:
        family_seed = master_seed XOR hash(family_id) % 2^31
        return random.Random(family_seed)

    def make_scenario_id(self, family_id: str, index: int) -> str:
        return f"syn_{master_seed}_{family_id}_{index:06d}"

    def make_customer_id(self, customer_index: int) -> str:
        return f"synth_cust_{master_seed}_{customer_index:05d}"

    def stable_timestamp(self, index: int) -> str:
        # Base 2024-01-01 UTC + deterministic offset from seed — NOT wall-clock
        offset_hours = (master_seed + index * 7) % (365 * 24)
        return (base_date + timedelta(hours=offset_hours)).isoformat()
```

Guarantee: Same seed + same config = byte-identical manifest.

---

## 9. Leakage-Safe Dataset Split

**Grouping entity:** synthetic_customer_id

**Algorithm:**
1. Collect all unique synthetic_customer_ids
2. Hash each: hash(customer_id + str(seed)) -> stable numeric
3. Sort customers by hash value (deterministic)
4. Assign: first 70% -> TRAIN, next 15% -> VALIDATION, last 15% -> TEST
5. Each scenario inherits its customer's split assignment

**Default split:** TRAIN 70% / VALIDATION 15% / TEST 15%
**Target counts for 5,000:** TRAIN ~3,500 / VALIDATION ~750 / TEST ~750

Zero cross-split entity leakage guaranteed by construction.

---

## 10. Ground Truth Labeling

Pure Python function applying policy rule precedence (same order as policy_rules.py):

```
P0: is_hard_decline AND hard_decline_auto_stop -> BLOCK -> STOPPED
P1: attempt_count >= max_retries_per_case -> BLOCK -> STOPPED
P2: case_age_hours > max_recovery_window_days * 24 -> BLOCK -> EXPIRED
P2: amount_inr >= high_value_threshold_inr -> MODIFY -> ESCALATED
P2: spacing enforcement -> MODIFY (delay adjusted)
P3: ai_confidence < min_confidence_threshold -> BLOCK -> FAILED
P3: contacts_count >= max_contacts_per_cycle -> BLOCK/MODIFY
P4: authorized action from AI -> ALLOW
```

Ground truth fields: expected_policy_outcome, expected_final_action,
expected_case_outcome, ground_truth_label (ALLOW/BLOCK/ESCALATE/STOP)

---

## 11. Dataset Manifest Structure

```json
{
  "manifest_version": "1.0",
  "generation_seed": 42,
  "total_scenarios": 5000,
  "split_counts": {"TRAIN": 3500, "VALIDATION": 750, "TEST": 750},
  "family_distribution": { ... },
  "tier_distribution": { ... },
  "outcome_distribution": { ... },
  "phase_16_version": "1.0.0",
  "scenarios": [ ... ]
}
```

Files: `datasets/eval_dataset_{seed}_{n}.json` (gitignored, not committed).

---

## 12. CLI Interface

```bash
# Generate 5,000 scenarios
python scripts/generate_eval_dataset.py --seed 42 --n-scenarios 5000 --output datasets/

# Quick test: 100 scenarios
python scripts/generate_eval_dataset.py --seed 42 --n-scenarios 100 --output datasets/quick/

# Validate existing manifest
python scripts/generate_eval_dataset.py --validate datasets/eval_dataset_42_5000.json
```

---

## 13. Security & Privacy Requirements

Absolutely prohibited in generated data:
- Real customer names, emails, phone numbers
- Real Razorpay payment IDs, invoice IDs, subscription IDs
- Real gateway credentials, API keys, webhook secrets
- Production database values

All synthetic IDs prefixed with synth_ or syn_ for obvious identification.
Security scan must report 0 findings after Phase 16 implementation.

---

## 14. Testing Strategy (53+ Tests)

| Test File | Tests | Focus |
|---|---|---|
| test_seed_manager.py | 8 | Determinism, stable IDs, no system-time dependency |
| test_scenario_schema.py | 10 | Pydantic validation, field bounds, enum membership |
| test_scenario_generator.py | 15 | Family generation, difficulty tiers, outcome labeling |
| test_dataset_splitter.py | 12 | No entity leakage, proportions, distribution checks |
| test_dataset_manifest.py | 8 | Serialization, deserialization, manifest integrity |

Critical tests:
1. Same seed + config -> byte-identical manifest
2. Different seeds -> different scenario IDs
3. No scenario appears in >1 split (leakage test)
4. All 14 families in all 3 splits
5. TRAIN/VAL/TEST proportions within +/-2% of 70/15/15
6. Hard decline scenarios always BLOCKED when auto_stop=True
7. Retry cap exhausted scenarios always BLOCKED
8. High-value always ESCALATED when amount >= threshold
9. No PII patterns in manifest
10. 5,000 scenarios generated in < 10 seconds

---

## 15. Task Breakdown

| Task ID | Component | Description |
|---|---|---|
| TSK-025-01 | Domain Discovery | Formalize evaluation contract (this document) |
| TSK-025-02 | Scenario Schema | scenario_schema.py — Pydantic schemas |
| TSK-025-03 | Seed Manager | seed_manager.py — PRNG, stable IDs, stable timestamps |
| TSK-025-04 | Ground Truth Labeler | Pure Python label computation by policy precedence |
| TSK-025-05 | Scenario Generator | scenario_generator.py — 14 families, 4 tiers |
| TSK-025-06 | Synthetic Identity | Synthetic customer/merchant ID pools |
| TSK-025-07 | Dataset Splitter | dataset_splitter.py — entity-grouped splitting |
| TSK-025-08 | Dataset Manifest | dataset_manifest.py — serialize/deserialize |
| TSK-025-09 | CLI Script | scripts/generate_eval_dataset.py |
| TSK-025-10 | Schema & Seed Tests | test_scenario_schema.py + test_seed_manager.py |
| TSK-025-11 | Generator Tests | test_scenario_generator.py |
| TSK-025-12 | Splitter Tests | test_dataset_splitter.py |
| TSK-025-13 | Manifest Tests | test_dataset_manifest.py |
| TSK-025-14 | QA & Release | Full regression, commit, push |

**Master Task: TSK-025 — Complete Synthetic Scenario Generator & Benchmark Dataset Split**

---

## 16. Explicit Phase 16 Boundary

### INCLUDED in Phase 16
- backend/app/evaluation/ (5 files)
- backend/tests/test_evaluation/ (5 test files, 53+ tests)
- scripts/generate_eval_dataset.py
- datasets/.gitignore entry
- PHASE_16_IMPLEMENTATION_PLAN.md (this document)
- PHASE_16_COMPLETION_REPORT.md (after implementation)
- MASTER_TRACKER.md and CHANGELOG.md updates

### NOT INCLUDED in Phase 16 (Reserved for Phase 17 and Phase 18)
- Phase 17: Benchmark Runner
- Phase 18: Evaluation Lab UI
- New Flask REST endpoints
- Database migrations
- EvaluationRepository modifications
- EvaluationPage.tsx changes
- Any changes to Phase 2-15 code

---

## 17. Definition of Done

- backend/app/evaluation/ module with 5 files implemented
- backend/tests/test_evaluation/ with >= 53 tests
- scripts/generate_eval_dataset.py CLI operational
- Same seed produces identical manifest (verified by test)
- No entity leakage across splits (verified by test)
- All 14 families and 4 difficulty tiers implemented
- Ground truth labels deterministically correct by policy precedence
- 5,000-scenario generation completes in < 10 seconds
- 170 existing Phase 2-15 backend tests pass
- >= 53 new evaluation tests pass
- Backend coverage >= 90%
- Frontend build passes (no frontend changes)
- Documentation audit passes (71 + 2 Phase 16 docs)
- Security scan = 0 secrets
- Docker config valid
- .env preserved, untracked, unmodified
- Working tree clean
- Phase 17 and Phase 18: NOT started
- Committed: feat(phase-16): complete synthetic scenario generator and benchmark dataset split
- Pushed to origin main
