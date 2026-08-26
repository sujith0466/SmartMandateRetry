"""Tests for Phase 16 ScenarioGenerator — families, tiers, ground truth, and determinism."""

import time
import pytest
from decimal import Decimal
from collections import Counter

from app.evaluation.scenario_generator import (
    ScenarioGenerator,
    compute_ground_truth,
    ALL_FAMILIES,
    FAMILY_SPECS,
)
from app.evaluation.scenario_schema import (
    SyntheticPolicyConfig,
    SyntheticRecoveryCase,
    SyntheticAIDecision,
    VALID_DIFFICULTY_TIERS,
    VALID_GROUND_TRUTH_LABELS,
    VALID_CASE_OUTCOMES,
    VALID_FINAL_ACTIONS,
    VALID_POLICY_OUTCOMES,
)
from app.evaluation.seed_manager import SeedManager


def make_generator(seed: int = 42) -> ScenarioGenerator:
    return ScenarioGenerator(SeedManager(seed))


def make_policy(**overrides):
    base = dict(
        max_retries_per_case=5,
        min_retry_interval_hours=24,
        max_recovery_window_days=14,
        min_confidence_threshold=Decimal("0.75"),
        high_value_threshold_inr=Decimal("10000.00"),
        max_customer_contacts_per_cycle=5,
        hard_decline_auto_stop=True,
    )
    base.update(overrides)
    return SyntheticPolicyConfig(**base)


def make_case(**overrides):
    base = dict(
        amount_inr=Decimal("5000.00"),
        value_band="MEDIUM",
        attempt_count=1,
        contacts_count=1,
        stage="HALTED_RECOVERY",
        case_age_hours=48,
    )
    base.update(overrides)
    return SyntheticRecoveryCase(**base)


def make_ai(**overrides):
    base = dict(
        recommended_action="SCHEDULE_RECOVERY_CHECK",
        ai_confidence=Decimal("0.85"),
        failure_class="TEMPORARY",
    )
    base.update(overrides)
    return SyntheticAIDecision(**base)


class TestGroundTruthLabeler:
    """Verify deterministic ground truth computation by policy precedence."""

    def test_p0_hard_decline_with_auto_stop(self):
        policy = make_policy(hard_decline_auto_stop=True)
        case = make_case()
        ai = make_ai()
        gt = compute_ground_truth(policy, case, ai, is_hard_decline=True)
        assert gt.expected_policy_outcome == "BLOCKED"
        assert gt.expected_final_action == "STOP"
        assert gt.expected_case_outcome == "STOPPED"
        assert gt.ground_truth_label == "BLOCK"

    def test_hard_decline_without_auto_stop_falls_through(self):
        policy = make_policy(hard_decline_auto_stop=False)
        case = make_case()
        ai = make_ai()
        gt = compute_ground_truth(policy, case, ai, is_hard_decline=True)
        # No P0 block, falls through to P4 ALLOW
        assert gt.ground_truth_label == "ALLOW"

    def test_p1_retry_cap_exhausted(self):
        policy = make_policy(max_retries_per_case=3, hard_decline_auto_stop=False)
        case = make_case(attempt_count=3)
        ai = make_ai()
        gt = compute_ground_truth(policy, case, ai, is_hard_decline=False)
        assert gt.expected_policy_outcome == "BLOCKED"
        assert gt.expected_case_outcome == "STOPPED"
        assert gt.ground_truth_label == "BLOCK"

    def test_p2a_window_expired(self):
        policy = make_policy(
            max_recovery_window_days=7, max_retries_per_case=10,
            hard_decline_auto_stop=False
        )
        case = make_case(case_age_hours=200, attempt_count=0)  # 200h > 7*24=168h
        ai = make_ai()
        gt = compute_ground_truth(policy, case, ai, is_hard_decline=False)
        assert gt.expected_case_outcome == "EXPIRED"
        assert gt.ground_truth_label == "BLOCK"

    def test_p2b_high_value_escalation(self):
        policy = make_policy(
            high_value_threshold_inr=Decimal("1000.00"),
            max_recovery_window_days=60,
            max_retries_per_case=10,
            hard_decline_auto_stop=False,
        )
        case = make_case(amount_inr=Decimal("5000.00"), attempt_count=0)
        ai = make_ai()
        gt = compute_ground_truth(policy, case, ai, is_hard_decline=False)
        assert gt.expected_policy_outcome == "MODIFIED"
        assert gt.expected_final_action == "MANUAL_ESCALATION"
        assert gt.expected_case_outcome == "ESCALATED"
        assert gt.ground_truth_label == "ESCALATE"

    def test_p3a_low_confidence(self):
        policy = make_policy(
            min_confidence_threshold=Decimal("0.80"),
            high_value_threshold_inr=Decimal("100000.00"),
            max_recovery_window_days=60,
            max_retries_per_case=10,
            hard_decline_auto_stop=False,
        )
        case = make_case(attempt_count=0)
        ai = make_ai(ai_confidence=Decimal("0.70"))
        gt = compute_ground_truth(policy, case, ai, is_hard_decline=False)
        assert gt.expected_policy_outcome == "BLOCKED"
        assert gt.expected_case_outcome == "FAILED"
        assert gt.ground_truth_label == "BLOCK"

    def test_p3b_contact_cap(self):
        policy = make_policy(
            max_customer_contacts_per_cycle=3,
            high_value_threshold_inr=Decimal("100000.00"),
            min_confidence_threshold=Decimal("0.50"),
            max_recovery_window_days=60,
            max_retries_per_case=10,
            hard_decline_auto_stop=False,
        )
        case = make_case(contacts_count=3, attempt_count=0)
        ai = make_ai(ai_confidence=Decimal("0.90"))
        gt = compute_ground_truth(policy, case, ai, is_hard_decline=False)
        assert gt.ground_truth_label == "BLOCK"
        assert gt.expected_case_outcome == "FAILED"

    def test_p4_allow_schedule_recovery(self):
        policy = make_policy(
            hard_decline_auto_stop=False,
            max_retries_per_case=10,
            max_recovery_window_days=60,
            high_value_threshold_inr=Decimal("100000.00"),
            min_confidence_threshold=Decimal("0.50"),
            max_customer_contacts_per_cycle=10,
        )
        case = make_case(attempt_count=1, contacts_count=1, case_age_hours=12)
        ai = make_ai(recommended_action="SCHEDULE_RECOVERY_CHECK", ai_confidence=Decimal("0.90"))
        gt = compute_ground_truth(policy, case, ai, is_hard_decline=False)
        assert gt.ground_truth_label == "ALLOW"
        assert gt.expected_case_outcome == "RECOVERED"

    def test_p0_takes_precedence_over_all(self):
        """P0 must fire even if P1, P2, P3 would also apply."""
        policy = make_policy(
            hard_decline_auto_stop=True,
            max_retries_per_case=1,  # P1 would also fire
        )
        case = make_case(attempt_count=5)
        ai = make_ai(ai_confidence=Decimal("0.10"))  # P3 would also fire
        gt = compute_ground_truth(policy, case, ai, is_hard_decline=True)
        assert gt.ground_truth_label == "BLOCK"
        assert gt.expected_case_outcome == "STOPPED"   # P0 outcome (not FAILED)


class TestScenarioGeneratorFamilies:
    """Verify all 14 families are generated."""

    def test_all_14_families_present(self):
        gen = make_generator()
        scenarios = gen.generate(n_scenarios=1400, n_customers=200)
        generated_families = {s.scenario_family for s in scenarios}
        for family in ALL_FAMILIES:
            assert family in generated_families, f"Family '{family}' not found in generated scenarios"

    def test_all_4_tiers_present(self):
        gen = make_generator()
        scenarios = gen.generate(n_scenarios=400, n_customers=100)
        generated_tiers = {s.difficulty_tier for s in scenarios}
        for tier in VALID_DIFFICULTY_TIERS:
            assert tier in generated_tiers, f"Tier '{tier}' not found"


class TestScenarioGeneratorDeterminism:
    """Verify same seed produces identical scenario lists."""

    def test_same_seed_identical_scenarios(self):
        gen1 = make_generator(42)
        gen2 = make_generator(42)
        s1 = gen1.generate(n_scenarios=50, n_customers=20)
        s2 = gen2.generate(n_scenarios=50, n_customers=20)
        assert len(s1) == len(s2)
        for a, b in zip(s1, s2):
            assert a.scenario_id == b.scenario_id
            assert a.scenario_family == b.scenario_family
            assert a.difficulty_tier == b.difficulty_tier
            assert a.ground_truth_label == b.ground_truth_label

    def test_different_seed_different_scenarios(self):
        gen1 = make_generator(42)
        gen2 = make_generator(99)
        s1 = gen1.generate(n_scenarios=50, n_customers=20)
        s2 = gen2.generate(n_scenarios=50, n_customers=20)
        ids1 = [s.scenario_id for s in s1]
        ids2 = [s.scenario_id for s in s2]
        assert ids1 != ids2


class TestScenarioGeneratorInvariants:
    """Verify schema and semantic invariants on generated scenarios."""

    def test_all_scenarios_have_valid_ground_truth_labels(self):
        gen = make_generator()
        scenarios = gen.generate(n_scenarios=200, n_customers=50)
        for s in scenarios:
            assert s.ground_truth_label in VALID_GROUND_TRUTH_LABELS

    def test_all_scenarios_have_valid_case_outcomes(self):
        gen = make_generator()
        scenarios = gen.generate(n_scenarios=200, n_customers=50)
        for s in scenarios:
            assert s.expected_case_outcome in VALID_CASE_OUTCOMES

    def test_hard_decline_stop_family_always_blocked(self):
        gen = make_generator()
        scenarios = gen.generate(n_scenarios=200, n_customers=50)
        hd_scenarios = [s for s in scenarios if s.scenario_family == "hard_decline_stop"]
        assert len(hd_scenarios) > 0, "Should have hard_decline_stop scenarios"
        for s in hd_scenarios:
            assert s.ground_truth_label == "BLOCK", (
                f"hard_decline_stop should always BLOCK, got {s.ground_truth_label}"
            )
            assert s.expected_case_outcome == "STOPPED"

    def test_mandate_revoked_stop_family_always_blocked(self):
        gen = make_generator()
        scenarios = gen.generate(n_scenarios=300, n_customers=60)
        mr_scenarios = [s for s in scenarios if s.scenario_family == "mandate_revoked_stop"]
        assert len(mr_scenarios) > 0
        for s in mr_scenarios:
            assert s.ground_truth_label == "BLOCK"
            assert s.expected_case_outcome == "STOPPED"

    def test_retry_cap_exhaustion_always_blocked(self):
        gen = make_generator()
        scenarios = gen.generate(n_scenarios=500, n_customers=100)
        rc_scenarios = [
            s for s in scenarios
            if s.scenario_family == "retry_cap_exhaustion" and s.difficulty_tier != "EDGE"
        ]
        assert len(rc_scenarios) > 0
        for s in rc_scenarios:
            assert s.ground_truth_label == "BLOCK", (
                f"retry_cap_exhaustion (non-EDGE) should BLOCK: {s.scenario_id}"
            )

    def test_high_value_escalation_always_escalated(self):
        gen = make_generator()
        scenarios = gen.generate(n_scenarios=500, n_customers=100)
        hv_scenarios = [
            s for s in scenarios
            if s.scenario_family == "high_value_escalation" and s.difficulty_tier != "EDGE"
        ]
        assert len(hv_scenarios) > 0
        for s in hv_scenarios:
            assert s.ground_truth_label == "ESCALATE", (
                f"high_value_escalation (non-EDGE) should ESCALATE: {s.scenario_id}"
            )

    def test_all_scenario_ids_start_with_syn(self):
        gen = make_generator()
        scenarios = gen.generate(n_scenarios=100, n_customers=30)
        for s in scenarios:
            assert s.scenario_id.startswith("syn_")

    def test_no_real_pii_in_ids(self):
        gen = make_generator()
        scenarios = gen.generate(n_scenarios=100, n_customers=30)
        import re
        email_pattern = re.compile(r"[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}")
        phone_pattern = re.compile(r"\b\d{10}\b")
        for s in scenarios:
            assert not email_pattern.search(s.scenario_id)
            assert not email_pattern.search(s.synthetic_customer_id)
            assert not phone_pattern.search(s.synthetic_customer_id)


class TestScenarioGeneratorPerformance:
    """Verify 5,000 scenarios generate in < 10 seconds."""

    def test_5000_scenarios_under_10_seconds(self):
        gen = make_generator()
        start = time.monotonic()
        scenarios = gen.generate(n_scenarios=5000, n_customers=500)
        elapsed = time.monotonic() - start
        assert len(scenarios) == 5000
        assert elapsed < 10.0, f"Generation took {elapsed:.2f}s, expected < 10s"
