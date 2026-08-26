"""Unit tests for AIRiskEvaluator."""

from datetime import datetime, timezone
from decimal import Decimal
import pytest

from app.domain.ai_decision_schemas import AIDecisionOutput, FailureClassEnum, RecommendedActionEnum
from app.domain.ai_risk_evaluator import AIRiskEvaluator
from app.domain.customer_context import (
    CaseContext, CustomerProfileContext, CustomerRecoveryContext,
    DataQualityContext, PaymentHistoryContext, RecoveryHistoryContext,
    SubscriptionContext
)
from app.domain.failure_assessment import FailureAssessment
from app.domain.failure_taxonomy import FailureCategory, Recoverability, Severity


def create_test_context(
    amount_inr: Decimal = Decimal("1500.00"),
    consecutive_failures: int = 1,
    is_hard_decline: bool = False,
    completeness: Decimal = Decimal("1.00")
) -> CustomerRecoveryContext:
    now = datetime(2026, 8, 26, 12, 0, 0, tzinfo=timezone.utc)
    return CustomerRecoveryContext(
        case=CaseContext("c_1", "inv_1", amount_inr, "INR", "HALTED_RECOVERY", "DETECTED", now, 1),
        subscription=SubscriptionContext("sub_1", "halted", "plan_1", 2, now, 30),
        customer=CustomerProfileContext("cust_1", 2, Decimal("1.00"), "a***b@c.com", "+91******1234"),
        payment_history=PaymentHistoryContext(2, 1, 1, consecutive_failures, 1, 2, "LOW"),
        recovery_history=RecoveryHistoryContext(0, 0, 0, None, None, None),
        failure_assessment=FailureAssessment(
            "ass_1", "razorpay", "pay_1", "sub_1", "inv_1",
            FailureCategory.PERMANENT_HARD_DECLINE if is_hard_decline else FailureCategory.TEMPORARY_LIQUIDITY,
            "DO_NOT_HONOUR" if is_hard_decline else "INSUFFICIENT_FUNDS",
            "reason", "code",
            Recoverability.NON_RECOVERABLE if is_hard_decline else Recoverability.RECOVERABLE,
            Severity.HIGH if is_hard_decline else Severity.LOW,
            Decimal("1.00"), {}, is_hard_decline
        ),
        quality=DataQualityContext("1.0.0", completeness, False, [])
    )


def test_risk_evaluator_flags_low_confidence():
    output = AIDecisionOutput(
        failure_class=FailureClassEnum.TEMPORARY,
        recommended_action=RecommendedActionEnum.SCHEDULE_RECOVERY_CHECK,
        delay_hours=24,
        confidence=Decimal("0.65"),
        reasoning="Low confidence reasoning",
        risk_flags=[]
    )
    context = create_test_context()
    flags = AIRiskEvaluator.evaluate_risks(output, context)
    assert "LOW_CONFIDENCE" in flags


def test_risk_evaluator_flags_high_value_and_streak():
    output = AIDecisionOutput(
        failure_class=FailureClassEnum.TEMPORARY,
        recommended_action=RecommendedActionEnum.PAYMENT_LINK_RECOVERY,
        delay_hours=0,
        confidence=Decimal("0.90"),
        reasoning="High value case reasoning",
        risk_flags=[]
    )
    context = create_test_context(
        amount_inr=Decimal("25000.00"),
        consecutive_failures=3,
        is_hard_decline=True,
        completeness=Decimal("0.75")
    )
    flags = AIRiskEvaluator.evaluate_risks(output, context)
    assert "HIGH_VALUE_EXPOSURE" in flags
    assert "CONSECUTIVE_FAILURES_HIGH" in flags
    assert "HARD_DECLINE_SUSPECTED" in flags
    assert "DATA_DEFICIENT" in flags
