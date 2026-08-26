"""Tests for Phase 17 Evaluation Mode Adapters."""

import pytest
from decimal import Decimal

from app.evaluation.evaluation_modes import (
    EvaluationMode,
    EvaluationPrediction,
    SmartMandateEvaluator,
    RazorpayNativeEvaluator,
    RuleBasedEvaluator,
    AIUnguardedEvaluator,
    get_evaluator,
)
from app.evaluation.scenario_schema import (
    SyntheticAIDecision,
    SyntheticCustomerProfile,
    SyntheticPolicyConfig,
    SyntheticRecoveryCase,
    SyntheticScenario,
)


def make_scenario(
    family="insufficient_funds",
    failure_code="insufficient_funds",
    recoverability="RECOVERABLE",
    is_hard_decline=False,
    amount="5000.00",
    attempt_count=0,
    case_age=24,
    stage="PENDING_OBSERVATION",
    max_retries=5,
    max_window_days=14,
    high_value_threshold="10000.00",
    min_confidence="0.75",
    hard_decline_auto_stop=True,
    recommended_action="SCHEDULE_RECOVERY_CHECK",
    ai_confidence="0.85",
    contacts_count=0,
    max_contacts=5,
):
    return SyntheticScenario(
        scenario_id="syn_42_test_000001",
        scenario_family=family,
        difficulty_tier="EASY",
        dataset_split="TEST",
        synthetic_customer_id="synth_cust_42_00001",
        synthetic_merchant_id="synth_merch_42_0001",
        failure_code=failure_code,
        failure_category="TEMPORARY_LIQUIDITY",
        recoverability=recoverability,
        severity="LOW",
        is_hard_decline=is_hard_decline,
        customer_profile=SyntheticCustomerProfile(
            tenure_months=12,
            historical_success_rate=Decimal("0.80"),
            consecutive_failures=0,
            prior_recovery_cases=1,
            prior_successful_recoveries=1,
            data_confidence="HIGH",
            contactability="HIGH",
        ),
        recovery_case=SyntheticRecoveryCase(
            amount_inr=Decimal(amount),
            value_band="MEDIUM",
            attempt_count=attempt_count,
            contacts_count=contacts_count,
            stage=stage,
            case_age_hours=case_age,
        ),
        policy_config=SyntheticPolicyConfig(
            max_retries_per_case=max_retries,
            min_retry_interval_hours=24,
            max_recovery_window_days=max_window_days,
            min_confidence_threshold=Decimal(min_confidence),
            high_value_threshold_inr=Decimal(high_value_threshold),
            max_customer_contacts_per_cycle=max_contacts,
            hard_decline_auto_stop=hard_decline_auto_stop,
        ),
        ai_decision=SyntheticAIDecision(
            recommended_action=recommended_action,
            ai_confidence=Decimal(ai_confidence),
            failure_class="TEMPORARY",
        ),
        expected_policy_outcome="ALLOWED",
        expected_final_action=recommended_action,
        expected_case_outcome="RECOVERED",
        ground_truth_label="ALLOW",
        generation_seed=42,
        generation_timestamp_utc="2024-01-01T00:00:00+00:00",
    )


class TestSmartMandateEvaluator:
    def test_mode_properties(self):
        ev = SmartMandateEvaluator()
        assert ev.mode == EvaluationMode.SMART_MANDATE
        assert "SmartMandateRetry" in ev.description

    def test_p0_hard_decline_veto(self):
        ev = SmartMandateEvaluator()
        scen = make_scenario(is_hard_decline=True, hard_decline_auto_stop=True)
        pred = ev.evaluate_scenario(scen)
        assert pred.predicted_policy_outcome == "BLOCKED"
        assert pred.predicted_final_action == "STOP"
        assert pred.predicted_label == "BLOCK"
        assert pred.predicted_case_outcome == "STOPPED"

    def test_p1_max_retries_exceeded(self):
        ev = SmartMandateEvaluator()
        scen = make_scenario(attempt_count=5, max_retries=5)
        pred = ev.evaluate_scenario(scen)
        assert pred.predicted_label == "BLOCK"
        assert pred.predicted_case_outcome == "STOPPED"

    def test_p2a_recovery_window_expired(self):
        ev = SmartMandateEvaluator()
        scen = make_scenario(case_age=400, max_window_days=14)  # 400 > 14*24=336
        pred = ev.evaluate_scenario(scen)
        assert pred.predicted_label == "BLOCK"
        assert pred.predicted_case_outcome == "EXPIRED"

    def test_p2b_high_value_escalation(self):
        ev = SmartMandateEvaluator()
        scen = make_scenario(amount="15000.00", high_value_threshold="10000.00")
        pred = ev.evaluate_scenario(scen)
        assert pred.predicted_policy_outcome == "MODIFIED"
        assert pred.predicted_final_action == "MANUAL_ESCALATION"
        assert pred.predicted_label == "ESCALATE"

    def test_p3a_low_confidence_veto(self):
        ev = SmartMandateEvaluator()
        scen = make_scenario(ai_confidence="0.60", min_confidence="0.75")
        pred = ev.evaluate_scenario(scen)
        assert pred.predicted_label == "BLOCK"
        assert pred.predicted_case_outcome == "FAILED"

    def test_p3b_contact_cap_exceeded(self):
        ev = SmartMandateEvaluator()
        scen = make_scenario(contacts_count=5, max_contacts=5)
        pred = ev.evaluate_scenario(scen)
        assert pred.predicted_label == "BLOCK"
        assert pred.predicted_case_outcome == "FAILED"

    def test_p4_valid_action_allowed(self):
        ev = SmartMandateEvaluator()
        scen = make_scenario(recommended_action="PAYMENT_LINK_RECOVERY")
        pred = ev.evaluate_scenario(scen)
        assert pred.predicted_label == "ALLOW"
        assert pred.predicted_final_action == "PAYMENT_LINK_RECOVERY"
        assert pred.predicted_case_outcome == "RECOVERED"


class TestRazorpayNativeEvaluator:
    def test_mode_properties(self):
        ev = RazorpayNativeEvaluator()
        assert ev.mode == EvaluationMode.RAZORPAY_NATIVE

    def test_naive_schedule_on_transient(self):
        ev = RazorpayNativeEvaluator()
        scen = make_scenario(attempt_count=1, stage="PENDING_OBSERVATION", is_hard_decline=False)
        pred = ev.evaluate_scenario(scen)
        assert pred.predicted_label == "ALLOW"
        assert pred.predicted_final_action == "SCHEDULE_RECOVERY_CHECK"
        assert pred.predicted_case_outcome == "RECOVERED"

    def test_naive_retry_on_hard_decline_creates_violation(self):
        ev = RazorpayNativeEvaluator()
        scen = make_scenario(attempt_count=1, stage="PENDING_OBSERVATION", is_hard_decline=True)
        pred = ev.evaluate_scenario(scen)
        # Razorpay native still tries to schedule retry on active hard declines
        assert pred.predicted_final_action == "SCHEDULE_RECOVERY_CHECK"
        assert pred.is_policy_violation is True
        assert pred.violation_type == "HARD_DECLINE_RETRY_VIOLATION"

    def test_stops_after_3_attempts(self):
        ev = RazorpayNativeEvaluator()
        scen = make_scenario(attempt_count=3)
        pred = ev.evaluate_scenario(scen)
        assert pred.predicted_label == "BLOCK"
        assert pred.predicted_final_action == "STOP"

    def test_stops_on_halted_stage(self):
        ev = RazorpayNativeEvaluator()
        scen = make_scenario(stage="HALTED_RECOVERY")
        pred = ev.evaluate_scenario(scen)
        assert pred.predicted_label == "BLOCK"
        assert pred.predicted_final_action == "STOP"


class TestRuleBasedEvaluator:
    def test_mode_properties(self):
        ev = RuleBasedEvaluator()
        assert ev.mode == EvaluationMode.RULE_BASED

    def test_stops_on_hard_decline(self):
        ev = RuleBasedEvaluator()
        scen = make_scenario(is_hard_decline=True)
        pred = ev.evaluate_scenario(scen)
        assert pred.predicted_label == "BLOCK"
        assert pred.predicted_case_outcome == "STOPPED"

    def test_escalates_on_high_value(self):
        ev = RuleBasedEvaluator()
        scen = make_scenario(amount="12000.00")
        pred = ev.evaluate_scenario(scen)
        assert pred.predicted_label == "ESCALATE"
        assert pred.predicted_final_action == "MANUAL_ESCALATION"

    def test_allows_single_retry_only(self):
        ev = RuleBasedEvaluator()
        scen0 = make_scenario(attempt_count=0, recoverability="RECOVERABLE")
        pred0 = ev.evaluate_scenario(scen0)
        assert pred0.predicted_label == "ALLOW"
        assert pred0.predicted_case_outcome == "RECOVERED"

        scen1 = make_scenario(attempt_count=1, recoverability="RECOVERABLE")
        pred1 = ev.evaluate_scenario(scen1)
        assert pred1.predicted_label == "BLOCK"
        assert pred1.predicted_case_outcome == "FAILED"


class TestAIUnguardedEvaluator:
    def test_mode_properties(self):
        ev = AIUnguardedEvaluator()
        assert ev.mode == EvaluationMode.AI_UNGUARDED

    def test_raw_action_dispatched(self):
        ev = AIUnguardedEvaluator()
        scen = make_scenario(recommended_action="PAYMENT_LINK_RECOVERY")
        pred = ev.evaluate_scenario(scen)
        assert pred.predicted_final_action == "PAYMENT_LINK_RECOVERY"

    def test_detects_safety_violation_on_hard_decline(self):
        ev = AIUnguardedEvaluator()
        scen = make_scenario(
            is_hard_decline=True,
            hard_decline_auto_stop=True,
            recommended_action="PAYMENT_LINK_RECOVERY",
        )
        pred = ev.evaluate_scenario(scen)
        assert pred.is_policy_violation is True
        assert pred.violation_type == "HARD_DECLINE_SAFETY_BYPASSED"

    def test_detects_safety_violation_on_retry_cap(self):
        ev = AIUnguardedEvaluator()
        scen = make_scenario(attempt_count=5, max_retries=5, recommended_action="SCHEDULE_RECOVERY_CHECK")
        pred = ev.evaluate_scenario(scen)
        assert pred.is_policy_violation is True
        assert pred.violation_type == "RETRY_CAP_SAFETY_BYPASSED"


class TestGetEvaluatorFactory:
    def test_returns_correct_evaluator_instances(self):
        assert isinstance(get_evaluator(EvaluationMode.SMART_MANDATE), SmartMandateEvaluator)
        assert isinstance(get_evaluator("RAZORPAY_NATIVE"), RazorpayNativeEvaluator)
        assert isinstance(get_evaluator("rule_based"), RuleBasedEvaluator)
        assert isinstance(get_evaluator("AI_UNGUARDED"), AIUnguardedEvaluator)

    def test_invalid_mode_raises(self):
        with pytest.raises(ValueError, match="Unsupported evaluation mode"):
            get_evaluator("INVALID_MODE")
