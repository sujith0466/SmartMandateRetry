"""Unit tests for individual Policy Engine safety rules."""

from datetime import datetime, timezone
from decimal import Decimal
import pytest

from app.domain.ai_decision_schemas import AIDecisionResult, FailureClassEnum, RecommendedActionEnum
from app.domain.customer_context import (
    CaseContext, CustomerProfileContext, CustomerRecoveryContext,
    DataQualityContext, PaymentHistoryContext, RecoveryHistoryContext,
    SubscriptionContext
)
from app.domain.failure_assessment import FailureAssessment
from app.domain.failure_taxonomy import FailureCategory, Recoverability, Severity
from app.domain.models import RecoveryPolicy
from app.domain.policy_decision import PolicyStatusEnum
from app.domain.policy_rules import (
    ActionAllowlistRule, ContactFrequencyCapRule, HardDeclineSafetyRule,
    HighValueReviewRule, LowConfidenceVetoRule, MaxRetriesCapRule,
    MinRetryIntervalRule, PolicyRuleEvaluationContext,
    StrategyStageCompatibilityRule, TerminalCaseSafetyRule
)


@pytest.fixture
def base_policy() -> RecoveryPolicy:
    return RecoveryPolicy(
        merchant_id="m_test",
        max_retries_per_case=3,
        min_retry_interval_hours=24,
        max_recovery_window_days=14,
        min_confidence_threshold=Decimal("0.75"),
        high_value_threshold_inr=Decimal("10000.00"),
        max_customer_contacts_per_cycle=3,
        hard_decline_auto_stop=True,
    )


def create_eval_context(
    action: RecommendedActionEnum = RecommendedActionEnum.SCHEDULE_RECOVERY_CHECK,
    confidence: Decimal = Decimal("0.90"),
    delay_hours: int = 48,
    amount_inr: Decimal = Decimal("1500.00"),
    stage: str = "HALTED_RECOVERY",
    case_state: str = "DETECTED",
    failure_category: FailureCategory = FailureCategory.TEMPORARY_LIQUIDITY,
    failure_code: str = "INSUFFICIENT_FUNDS",
    is_hard_decline: bool = False,
    recoverability: Recoverability = Recoverability.RECOVERABLE,
    attempt_count: int = 1,
    recent_failures_30d: int = 1,
    age_hours: int = 2,
    policy: RecoveryPolicy = None,
) -> PolicyRuleEvaluationContext:
    now = datetime(2026, 8, 26, 12, 0, 0, tzinfo=timezone.utc)
    cust_ctx = CustomerRecoveryContext(
        case=CaseContext("c_1", "inv_1", amount_inr, "INR", stage, case_state, now, age_hours),
        subscription=SubscriptionContext("s_1", "halted", "p_1", 2, now, 30),
        customer=CustomerProfileContext("cust_1", 2, Decimal("1.00"), "u***r@test.com", "+91******1111"),
        payment_history=PaymentHistoryContext(2, 1, attempt_count, 1, recent_failures_30d, 2, "LOW"),
        recovery_history=RecoveryHistoryContext(0, 0, 0, None, None, None),
        failure_assessment=FailureAssessment(
            "ass_1", "razorpay", "pay_1", "s_1", "inv_1",
            failure_category, failure_code, failure_code.lower(), "ERR",
            recoverability, Severity.LOW, Decimal("1.00"), {}, is_hard_decline
        ),
        quality=DataQualityContext("1.0.0", Decimal("1.00"), False, [])
    )
    decision = AIDecisionResult(
        "dec_1", "c_1", FailureClassEnum.TEMPORARY, action, delay_hours,
        confidence, "Test reasoning", [], "mock_model", "1.0.0", False
    )
    pol = policy or RecoveryPolicy(
        merchant_id="m_test", max_retries_per_case=3, min_retry_interval_hours=24,
        max_recovery_window_days=14, min_confidence_threshold=Decimal("0.75"),
        high_value_threshold_inr=Decimal("10000.00"), max_customer_contacts_per_cycle=3,
        hard_decline_auto_stop=True
    )
    return PolicyRuleEvaluationContext(cust_ctx, decision, pol)


def test_rule_hard_decline_veto():
    rule = HardDeclineSafetyRule()
    ctx = create_eval_context(
        action=RecommendedActionEnum.PAYMENT_LINK_RECOVERY,
        failure_category=FailureCategory.PERMANENT_HARD_DECLINE,
        failure_code="DO_NOT_HONOUR",
        is_hard_decline=True,
        recoverability=Recoverability.NON_RECOVERABLE
    )
    rule.evaluate(ctx)
    assert ctx.current_action == "STOP"
    assert ctx.execution_allowed is False
    assert ctx.status == PolicyStatusEnum.BLOCKED
    assert "HARD_DECLINE_VETO" in ctx.reasons


def test_rule_terminal_case_veto():
    rule = TerminalCaseSafetyRule()
    ctx = create_eval_context(
        action=RecommendedActionEnum.SCHEDULE_RECOVERY_CHECK,
        case_state="RECOVERED"
    )
    rule.evaluate(ctx)
    assert ctx.current_action == "STOP"
    assert ctx.execution_allowed is False
    assert ctx.status == PolicyStatusEnum.BLOCKED
    assert "CASE_ALREADY_TERMINAL" in ctx.reasons


def test_rule_max_retries_cap():
    rule = MaxRetriesCapRule()
    ctx = create_eval_context(
        action=RecommendedActionEnum.SCHEDULE_RECOVERY_CHECK,
        attempt_count=3
    )
    rule.evaluate(ctx)
    assert ctx.current_action == "STOP"
    assert ctx.execution_allowed is False
    assert ctx.status == PolicyStatusEnum.BLOCKED
    assert "MAX_RETRIES_EXCEEDED" in ctx.reasons


def test_rule_high_value_review():
    rule = HighValueReviewRule()
    ctx = create_eval_context(
        action=RecommendedActionEnum.PAYMENT_LINK_RECOVERY,
        amount_inr=Decimal("15000.00")
    )
    rule.evaluate(ctx)
    assert ctx.current_action == "MANUAL_ESCALATION"
    assert ctx.execution_allowed is False
    assert ctx.status == PolicyStatusEnum.MODIFIED
    assert "HIGH_VALUE_EXPOSURE" in ctx.reasons


def test_rule_low_confidence_veto():
    rule = LowConfidenceVetoRule()
    ctx = create_eval_context(
        action=RecommendedActionEnum.SCHEDULE_RECOVERY_CHECK,
        confidence=Decimal("0.60")
    )
    rule.evaluate(ctx)
    assert ctx.current_action == "MANUAL_ESCALATION"
    assert ctx.execution_allowed is False
    assert ctx.status == PolicyStatusEnum.MODIFIED
    assert "LOW_AI_CONFIDENCE" in ctx.reasons


def test_rule_contact_frequency_cap():
    rule = ContactFrequencyCapRule()
    ctx = create_eval_context(
        action=RecommendedActionEnum.PAYMENT_LINK_RECOVERY,
        recent_failures_30d=3
    )
    rule.evaluate(ctx)
    assert ctx.current_action == "MANUAL_ESCALATION"
    assert ctx.execution_allowed is False
    assert ctx.status == PolicyStatusEnum.MODIFIED
    assert "MAX_CONTACTS_EXCEEDED" in ctx.reasons


def test_rule_strategy_stage_compatibility():
    rule = StrategyStageCompatibilityRule()
    ctx = create_eval_context(
        action=RecommendedActionEnum.PAYMENT_LINK_RECOVERY,
        stage="PENDING_OBSERVATION"
    )
    rule.evaluate(ctx)
    assert ctx.current_action == "SCHEDULE_RECOVERY_CHECK"
    assert ctx.status == PolicyStatusEnum.MODIFIED
    assert "PAYMENT_LINK_NOT_ALLOWED_IN_PENDING_STAGE" in ctx.reasons


def test_rule_min_retry_interval():
    rule = MinRetryIntervalRule()
    ctx = create_eval_context(
        action=RecommendedActionEnum.SCHEDULE_RECOVERY_CHECK,
        delay_hours=12
    )
    rule.evaluate(ctx)
    assert ctx.adjusted_delay_hours == 24
    assert "DELAY_EXTENDED_TO_MIN_INTERVAL" in ctx.reasons
