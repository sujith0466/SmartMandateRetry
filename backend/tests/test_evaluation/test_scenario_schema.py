"""Tests for Phase 16 scenario Pydantic schemas — validation, bounds, and enum membership."""

import pytest
from decimal import Decimal
from pydantic import ValidationError

from app.evaluation.scenario_schema import (
    SyntheticPolicyConfig,
    SyntheticCustomerProfile,
    SyntheticRecoveryCase,
    SyntheticAIDecision,
    SyntheticScenario,
    DatasetManifest,
    VALID_FAILURE_CATEGORIES,
    VALID_RECOVERABILITY,
    VALID_DIFFICULTY_TIERS,
    VALID_DATASET_SPLITS,
    VALID_FINAL_ACTIONS,
    VALID_CASE_OUTCOMES,
    VALID_GROUND_TRUTH_LABELS,
)


def make_valid_policy(**overrides):
    base = dict(
        max_retries_per_case=3,
        min_retry_interval_hours=24,
        max_recovery_window_days=14,
        min_confidence_threshold=Decimal("0.75"),
        high_value_threshold_inr=Decimal("10000.00"),
        max_customer_contacts_per_cycle=3,
        hard_decline_auto_stop=True,
    )
    base.update(overrides)
    return SyntheticPolicyConfig(**base)


def make_valid_customer(**overrides):
    base = dict(
        tenure_months=12,
        historical_success_rate=Decimal("0.80"),
        consecutive_failures=1,
        prior_recovery_cases=3,
        prior_successful_recoveries=2,
        data_confidence="HIGH",
        contactability="MEDIUM",
    )
    base.update(overrides)
    return SyntheticCustomerProfile(**base)


def make_valid_case(**overrides):
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


def make_valid_ai(**overrides):
    base = dict(
        recommended_action="SCHEDULE_RECOVERY_CHECK",
        ai_confidence=Decimal("0.85"),
        failure_class="TEMPORARY",
    )
    base.update(overrides)
    return SyntheticAIDecision(**base)


def make_valid_scenario(**overrides):
    base = dict(
        scenario_id="syn_42_insufficient_funds_000001",
        scenario_family="insufficient_funds",
        difficulty_tier="EASY",
        dataset_split="TRAIN",
        synthetic_customer_id="synth_cust_42_00001",
        synthetic_merchant_id="synth_merch_42_0001",
        failure_code="insufficient_funds",
        failure_category="TEMPORARY_LIQUIDITY",
        recoverability="RECOVERABLE",
        severity="LOW",
        is_hard_decline=False,
        customer_profile=make_valid_customer(),
        recovery_case=make_valid_case(),
        policy_config=make_valid_policy(),
        ai_decision=make_valid_ai(),
        expected_policy_outcome="ALLOWED",
        expected_final_action="SCHEDULE_RECOVERY_CHECK",
        expected_case_outcome="RECOVERED",
        ground_truth_label="ALLOW",
        generation_seed=42,
        generation_timestamp_utc="2024-01-01T00:00:00+00:00",
    )
    base.update(overrides)
    return SyntheticScenario(**base)


class TestPolicyConfigBounds:
    def test_valid_policy_creates(self):
        p = make_valid_policy()
        assert p.max_retries_per_case == 3

    def test_max_retries_lower_bound(self):
        with pytest.raises(ValidationError):
            make_valid_policy(max_retries_per_case=0)

    def test_max_retries_upper_bound(self):
        with pytest.raises(ValidationError):
            make_valid_policy(max_retries_per_case=11)

    def test_min_interval_lower_bound(self):
        with pytest.raises(ValidationError):
            make_valid_policy(min_retry_interval_hours=0)

    def test_confidence_threshold_bounds(self):
        with pytest.raises(ValidationError):
            make_valid_policy(min_confidence_threshold=Decimal("1.01"))
        with pytest.raises(ValidationError):
            make_valid_policy(min_confidence_threshold=Decimal("-0.01"))

    def test_high_value_threshold_non_negative(self):
        with pytest.raises(ValidationError):
            make_valid_policy(high_value_threshold_inr=Decimal("-1"))

    def test_max_contacts_bounds(self):
        with pytest.raises(ValidationError):
            make_valid_policy(max_customer_contacts_per_cycle=11)


class TestCustomerProfileValidation:
    def test_valid_customer(self):
        c = make_valid_customer()
        assert c.tenure_months == 12

    def test_prior_success_exceeds_cases_raises(self):
        with pytest.raises(ValidationError):
            make_valid_customer(prior_recovery_cases=2, prior_successful_recoveries=5)

    def test_invalid_data_confidence(self):
        with pytest.raises(ValidationError):
            make_valid_customer(data_confidence="ULTRA")

    def test_invalid_contactability(self):
        with pytest.raises(ValidationError):
            make_valid_customer(contactability="UNKNOWN")

    def test_tenure_bounds(self):
        with pytest.raises(ValidationError):
            make_valid_customer(tenure_months=0)


class TestRecoveryCaseValidation:
    def test_valid_case(self):
        c = make_valid_case()
        assert c.amount_inr == Decimal("5000.00")

    def test_amount_must_be_positive(self):
        with pytest.raises(ValidationError):
            make_valid_case(amount_inr=Decimal("0"))

    def test_invalid_value_band(self):
        with pytest.raises(ValidationError):
            make_valid_case(value_band="ULTRA_HIGH")

    def test_invalid_stage(self):
        with pytest.raises(ValidationError):
            make_valid_case(stage="COMPLETED")


class TestAIDecisionValidation:
    def test_valid_ai_decision(self):
        d = make_valid_ai()
        assert d.recommended_action == "SCHEDULE_RECOVERY_CHECK"

    def test_invalid_recommended_action(self):
        with pytest.raises(ValidationError):
            make_valid_ai(recommended_action="INVALID_ACTION")

    def test_confidence_bounds(self):
        with pytest.raises(ValidationError):
            make_valid_ai(ai_confidence=Decimal("1.01"))

    def test_invalid_failure_class(self):
        with pytest.raises(ValidationError):
            make_valid_ai(failure_class="RANDOM")


class TestSyntheticScenarioValidation:
    def test_valid_scenario_creates(self):
        s = make_valid_scenario()
        assert s.scenario_id.startswith("syn_")
        assert s.synthetic_customer_id.startswith("synth_cust_")
        assert s.synthetic_merchant_id.startswith("synth_merch_")

    def test_invalid_difficulty_tier(self):
        with pytest.raises(ValidationError):
            make_valid_scenario(difficulty_tier="ULTRA")

    def test_invalid_dataset_split(self):
        with pytest.raises(ValidationError):
            make_valid_scenario(dataset_split="HOLDOUT")

    def test_invalid_ground_truth_label(self):
        with pytest.raises(ValidationError):
            make_valid_scenario(ground_truth_label="MAYBE")

    def test_scenario_id_requires_syn_prefix(self):
        with pytest.raises(ValidationError):
            make_valid_scenario(scenario_id="real_id_001")

    def test_customer_id_requires_synth_cust_prefix(self):
        with pytest.raises(ValidationError):
            make_valid_scenario(synthetic_customer_id="cust_123")

    def test_to_dict_serializes_decimals(self):
        s = make_valid_scenario()
        d = s.to_dict()
        # amount_inr should be a string representation of Decimal
        assert isinstance(d["recovery_case"]["amount_inr"], str)

    def test_all_valid_difficulty_tiers_accepted(self):
        for tier in VALID_DIFFICULTY_TIERS:
            s = make_valid_scenario(difficulty_tier=tier)
            assert s.difficulty_tier == tier

    def test_all_valid_splits_accepted(self):
        for split in VALID_DATASET_SPLITS:
            s = make_valid_scenario(dataset_split=split)
            assert s.dataset_split == split
