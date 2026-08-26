"""Tests for Phase 17 Evaluation Metrics Engine."""

import pytest
from decimal import Decimal

from app.evaluation.evaluation_modes import EvaluationPrediction
from app.evaluation.metrics import (
    BenchmarkMetrics,
    ClassMetrics,
    MetricsCalculator,
    SafetyMetrics,
    ScenarioEvaluationResult,
)
from app.evaluation.scenario_schema import (
    SyntheticAIDecision,
    SyntheticCustomerProfile,
    SyntheticPolicyConfig,
    SyntheticRecoveryCase,
    SyntheticScenario,
)


def make_mock_result(
    ground_truth_label="ALLOW",
    predicted_label="ALLOW",
    expected_action="SCHEDULE_RECOVERY_CHECK",
    predicted_action="SCHEDULE_RECOVERY_CHECK",
    expected_policy_outcome="ALLOWED",
    predicted_policy_outcome="ALLOWED",
    expected_case_outcome="RECOVERED",
    predicted_case_outcome="RECOVERED",
    is_hard_decline=False,
    amount="1000.00",
    attempt_count=0,
    max_retries=5,
    case_age=24,
    max_window_days=14,
    high_value_threshold="10000.00",
    ai_confidence="0.90",
    min_confidence="0.75",
    contacts_count=0,
    max_contacts=5,
    is_violation=False,
    family="insufficient_funds",
    tier="EASY",
    category="TEMPORARY_LIQUIDITY",
    split="TEST",
):
    scen = SyntheticScenario(
        scenario_id="syn_42_test_000001",
        scenario_family=family,
        difficulty_tier=tier,
        dataset_split=split,
        synthetic_customer_id="synth_cust_42_00001",
        synthetic_merchant_id="synth_merch_42_0001",
        failure_code="insufficient_funds",
        failure_category=category,
        recoverability="RECOVERABLE" if not is_hard_decline else "NON_RECOVERABLE",
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
            value_band="LOW",
            attempt_count=attempt_count,
            contacts_count=contacts_count,
            stage="PENDING_OBSERVATION",
            case_age_hours=case_age,
        ),
        policy_config=SyntheticPolicyConfig(
            max_retries_per_case=max_retries,
            min_retry_interval_hours=24,
            max_recovery_window_days=max_window_days,
            min_confidence_threshold=Decimal(min_confidence),
            high_value_threshold_inr=Decimal(high_value_threshold),
            max_customer_contacts_per_cycle=max_contacts,
            hard_decline_auto_stop=True,
        ),
        ai_decision=SyntheticAIDecision(
            recommended_action=expected_action,
            ai_confidence=Decimal(ai_confidence),
            failure_class="TEMPORARY",
        ),
        expected_policy_outcome=expected_policy_outcome,
        expected_final_action=expected_action,
        expected_case_outcome=expected_case_outcome,
        ground_truth_label=ground_truth_label,
        generation_seed=42,
        generation_timestamp_utc="2024-01-01T00:00:00+00:00",
    )
    pred = EvaluationPrediction(
        predicted_policy_outcome=predicted_policy_outcome,
        predicted_final_action=predicted_action,
        predicted_case_outcome=predicted_case_outcome,
        predicted_label=predicted_label,
        is_policy_violation=is_violation,
    )
    return ScenarioEvaluationResult(
        scenario=scen,
        prediction=pred,
        is_label_correct=ground_truth_label == predicted_label,
        is_policy_outcome_correct=expected_policy_outcome == predicted_policy_outcome,
        is_final_action_correct=expected_action == predicted_action,
        is_case_outcome_correct=expected_case_outcome == predicted_case_outcome,
    )


class TestMetricsCalculator:
    def test_empty_results_returns_zero_metrics(self):
        m = MetricsCalculator.compute([])
        assert m.total_evaluated == 0
        assert m.label_accuracy == 0.0
        assert m.macro_f1 == 0.0
        assert m.safety_metrics.total_policy_violations == 0

    def test_perfect_accuracy_calculations(self):
        results = [
            make_mock_result("ALLOW", "ALLOW"),
            make_mock_result("BLOCK", "BLOCK"),
            make_mock_result("ESCALATE", "ESCALATE"),
            make_mock_result("STOP", "STOP"),
        ]
        m = MetricsCalculator.compute(results)
        assert m.total_evaluated == 4
        assert m.label_accuracy == 1.0
        assert m.policy_outcome_accuracy == 1.0
        assert m.final_action_accuracy == 1.0
        assert m.case_outcome_accuracy == 1.0
        assert m.macro_f1 == 1.0
        assert m.weighted_f1 == 1.0

    def test_confusion_matrix_structure(self):
        results = [
            make_mock_result("ALLOW", "ALLOW"),
            make_mock_result("ALLOW", "BLOCK"),  # False Negative for ALLOW, False Positive for BLOCK
            make_mock_result("BLOCK", "BLOCK"),
        ]
        m = MetricsCalculator.compute(results)
        cm = m.confusion_matrix
        assert cm["ALLOW"]["ALLOW"] == 1
        assert cm["ALLOW"]["BLOCK"] == 1
        assert cm["BLOCK"]["BLOCK"] == 1
        assert cm["BLOCK"]["ALLOW"] == 0

    def test_precision_recall_f1_calculations(self):
        results = [
            make_mock_result("ALLOW", "ALLOW"),
            make_mock_result("ALLOW", "ALLOW"),
            make_mock_result("ALLOW", "BLOCK"),
            make_mock_result("BLOCK", "ALLOW"),
        ]
        m = MetricsCalculator.compute(results)
        allow_m = m.per_class_metrics["ALLOW"]
        # TP=2, FP=1, FN=1 -> Prec = 2/3, Rec = 2/3, F1 = 2/3
        assert pytest.approx(allow_m.precision, 0.001) == 2 / 3
        assert pytest.approx(allow_m.recall, 0.001) == 2 / 3
        assert pytest.approx(allow_m.f1_score, 0.001) == 2 / 3

    def test_safety_metrics_hard_decline(self):
        # 2 hard declines: 1 blocked, 1 incorrectly allowed
        results = [
            make_mock_result("BLOCK", "BLOCK", is_hard_decline=True),
            make_mock_result("BLOCK", "ALLOW", is_hard_decline=True, is_violation=True),
        ]
        m = MetricsCalculator.compute(results)
        assert m.safety_metrics.hard_decline_safety_rate == 0.5
        assert m.safety_metrics.total_policy_violations == 1

    def test_safety_metrics_retry_cap(self):
        # 1 retry-capped scenario: blocked -> 1.0 safety rate
        results = [
            make_mock_result("BLOCK", "BLOCK", attempt_count=5, max_retries=5),
        ]
        m = MetricsCalculator.compute(results)
        assert m.safety_metrics.retry_cap_safety_rate == 1.0

    def test_safety_metrics_recovery_window(self):
        results = [
            make_mock_result("BLOCK", "BLOCK", case_age=400, max_window_days=14),
        ]
        m = MetricsCalculator.compute(results)
        assert m.safety_metrics.recovery_window_enforcement_rate == 1.0

    def test_safety_metrics_high_value(self):
        results = [
            make_mock_result("ESCALATE", "ESCALATE", amount="20000.00", high_value_threshold="10000.00"),
        ]
        m = MetricsCalculator.compute(results)
        assert m.safety_metrics.high_value_escalation_compliance == 1.0

    def test_safety_metrics_low_confidence(self):
        results = [
            make_mock_result("BLOCK", "BLOCK", ai_confidence="0.50", min_confidence="0.75"),
        ]
        m = MetricsCalculator.compute(results)
        assert m.safety_metrics.low_confidence_veto_rate == 1.0

    def test_safety_metrics_contact_cap(self):
        results = [
            make_mock_result("BLOCK", "BLOCK", contacts_count=5, max_contacts=5),
        ]
        m = MetricsCalculator.compute(results)
        assert m.safety_metrics.contact_cap_enforcement_rate == 1.0

    def test_recovery_uplift_calculation(self):
        results = [
            make_mock_result("ALLOW", "ALLOW", predicted_case_outcome="RECOVERED"),
            make_mock_result("ALLOW", "ALLOW", predicted_case_outcome="FAILED"),
        ]
        # Recovery rate is 1/2 = 50%
        # Baseline is 30% -> Uplift is +20.0 percentage points
        m = MetricsCalculator.compute(results, baseline_recovery_rate=0.30)
        assert pytest.approx(m.simulated_recovery_rate, 0.001) == 0.50
        assert pytest.approx(m.recovery_uplift_pp, 0.01) == 20.00

    def test_financial_revenue_calculations(self):
        results = [
            make_mock_result(amount="1000.00", predicted_case_outcome="RECOVERED"),
            make_mock_result(amount="2000.00", predicted_case_outcome="FAILED"),
        ]
        m = MetricsCalculator.compute(results)
        assert m.total_at_risk_revenue_inr == Decimal("3000.00")
        assert m.simulated_recovered_revenue_inr == Decimal("1000.00")
        assert pytest.approx(m.revenue_recovery_rate, 0.001) == 1 / 3

    def test_wasted_action_rate(self):
        results = [
            make_mock_result(is_hard_decline=False, predicted_action="SCHEDULE_RECOVERY_CHECK"),
            make_mock_result(is_hard_decline=True, predicted_action="SCHEDULE_RECOVERY_CHECK"),  # Wasted on hard decline
        ]
        m = MetricsCalculator.compute(results)
        assert pytest.approx(m.wasted_action_rate, 0.001) == 0.50

    def test_dimensional_breakdowns_computed(self):
        results = [
            make_mock_result(family="insufficient_funds", tier="EASY", split="TRAIN"),
            make_mock_result(family="hard_decline_stop", tier="HARD", split="TEST"),
        ]
        m = MetricsCalculator.compute(results)
        assert "insufficient_funds" in m.family_breakdown
        assert "hard_decline_stop" in m.family_breakdown
        assert "EASY" in m.difficulty_breakdown
        assert "HARD" in m.difficulty_breakdown
        assert "TRAIN" in m.split_breakdown
        assert "TEST" in m.split_breakdown

    def test_metrics_to_dict_serialization(self):
        results = [make_mock_result()]
        m = MetricsCalculator.compute(results)
        d = m.to_dict()
        assert "total_evaluated" in d
        assert "confusion_matrix" in d
        assert "safety_metrics" in d
        assert "family_breakdown" in d
        assert isinstance(d["simulated_recovered_revenue_inr"], str)

    def test_recovery_rate_never_exceeds_100_percent(self):
        """Invariant: 0.0 <= simulated_recovery_rate <= 1.0 under any evaluator behavior."""
        # 1 eligible recoverable scenario, but evaluator predicts RECOVERED on 5 hard declines as well
        results = [
            make_mock_result("ALLOW", "ALLOW", is_hard_decline=False, predicted_case_outcome="RECOVERED"),
            make_mock_result("BLOCK", "ALLOW", is_hard_decline=True, predicted_case_outcome="RECOVERED"),
            make_mock_result("BLOCK", "ALLOW", is_hard_decline=True, predicted_case_outcome="RECOVERED"),
            make_mock_result("BLOCK", "ALLOW", is_hard_decline=True, predicted_case_outcome="RECOVERED"),
            make_mock_result("BLOCK", "ALLOW", is_hard_decline=True, predicted_case_outcome="RECOVERED"),
        ]
        m = MetricsCalculator.compute(results)
        assert 0.0 <= m.simulated_recovery_rate <= 1.0
        # 1 eligible scenario recovered out of 1 eligible = 1.0 (100%), not 5.0 (500%)
        assert m.simulated_recovery_rate == 1.0

    def test_ineligible_scenarios_predicted_recovered_do_not_inflate_rate(self):
        """Ineligible hard-decline scenarios predicted as RECOVERED must not increase numerator."""
        # 2 eligible recoverable scenarios: 1 recovered, 1 failed
        # Plus 3 hard declines all predicted as RECOVERED (e.g. by AI_UNGUARDED)
        results = [
            make_mock_result("ALLOW", "ALLOW", is_hard_decline=False, predicted_case_outcome="RECOVERED"),
            make_mock_result("ALLOW", "ALLOW", is_hard_decline=False, predicted_case_outcome="FAILED"),
            make_mock_result("BLOCK", "ALLOW", is_hard_decline=True, predicted_case_outcome="RECOVERED"),
            make_mock_result("BLOCK", "ALLOW", is_hard_decline=True, predicted_case_outcome="RECOVERED"),
            make_mock_result("BLOCK", "ALLOW", is_hard_decline=True, predicted_case_outcome="RECOVERED"),
        ]
        m = MetricsCalculator.compute(results)
        # Denominator = 2 (eligible), Numerator = 1 (eligible and recovered) -> Rate = 0.50 (50%)
        assert m.simulated_recovery_rate == 0.50

    def test_eligible_recoverable_scenarios_correctly_increment_numerator(self):
        """Eligible scenarios correctly increment both numerator and denominator."""
        results = [
            make_mock_result("ALLOW", "ALLOW", is_hard_decline=False, predicted_case_outcome="RECOVERED"),
            make_mock_result("ALLOW", "ALLOW", is_hard_decline=False, predicted_case_outcome="RECOVERED"),
            make_mock_result("ALLOW", "ALLOW", is_hard_decline=False, predicted_case_outcome="FAILED"),
            make_mock_result("ALLOW", "ALLOW", is_hard_decline=False, predicted_case_outcome="FAILED"),
        ]
        m = MetricsCalculator.compute(results)
        # 2 recovered out of 4 eligible = 0.50
        assert m.simulated_recovery_rate == 0.50

    def test_zero_eligible_scenarios_returns_zero_rate(self):
        """If dataset has zero eligible recoverable scenarios, return 0.0 without division error."""
        results = [
            make_mock_result("BLOCK", "BLOCK", is_hard_decline=True),
            make_mock_result("BLOCK", "BLOCK", is_hard_decline=True),
        ]
        m = MetricsCalculator.compute(results)
        assert m.simulated_recovery_rate == 0.0

    def test_uplift_calculated_from_bounded_rates(self):
        """Uplift delta is mathematically consistent with bounded recovery rates."""
        results = [
            make_mock_result("ALLOW", "ALLOW", is_hard_decline=False, predicted_case_outcome="RECOVERED"),
            make_mock_result("ALLOW", "ALLOW", is_hard_decline=False, predicted_case_outcome="FAILED"),
        ]
        # Evaluator rate = 50%, Baseline = 30% -> Uplift = +20.00 pp
        m = MetricsCalculator.compute(results, baseline_recovery_rate=0.30)
        assert pytest.approx(m.recovery_uplift_pp, 0.01) == 20.00
