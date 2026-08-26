"""Unit tests for FallbackDecisionEngine and AIDecisionEngine."""

from decimal import Decimal
import pytest
from unittest.mock import MagicMock

from app.domain.ai_decision_engine import AIDecisionEngine
from app.domain.ai_decision_schemas import FailureClassEnum, RecommendedActionEnum
from app.domain.ai_fallback_engine import FallbackDecisionEngine
from app.domain.customer_context import (
    CaseContext, CustomerProfileContext, CustomerRecoveryContext,
    DataQualityContext, PaymentHistoryContext, RecoveryHistoryContext,
    SubscriptionContext
)
from app.domain.failure_assessment import FailureAssessment
from app.domain.failure_taxonomy import FailureCategory, Recoverability, Severity
from app.infrastructure.openrouter import LLMProvider, MockLLMProvider


@pytest.fixture
def base_context() -> CustomerRecoveryContext:
    from datetime import datetime, timezone
    now = datetime(2026, 8, 26, 12, 0, 0, tzinfo=timezone.utc)
    return CustomerRecoveryContext(
        case=CaseContext("case_eng_01", "inv_eng_01", Decimal("3500.00"), "INR", "HALTED_RECOVERY", "DETECTED", now, 2),
        subscription=SubscriptionContext("sub_eng_01", "halted", "plan_1", 3, now, 60),
        customer=CustomerProfileContext("cust_eng_01", 3, Decimal("1.00"), "t***t@domain.com", "+91******9999"),
        payment_history=PaymentHistoryContext(3, 2, 1, 1, 1, 3, "LOW"),
        recovery_history=RecoveryHistoryContext(0, 0, 0, None, None, None),
        failure_assessment=FailureAssessment(
            "ass_eng_01", "razorpay", "pay_eng_01", "sub_eng_01", "inv_eng_01",
            FailureCategory.TEMPORARY_LIQUIDITY, "INSUFFICIENT_FUNDS",
            "insufficient_funds", "BAD_REQUEST_ERROR",
            Recoverability.RECOVERABLE, Severity.LOW,
            Decimal("1.00"), {}, False
        ),
        quality=DataQualityContext("1.0.0", Decimal("1.00"), False, [])
    )


def test_fallback_engine_hard_decline(base_context):
    hard_assessment = FailureAssessment(
        "ass_hard", "razorpay", "pay_1", "sub_1", "inv_1",
        FailureCategory.PERMANENT_HARD_DECLINE, "DO_NOT_HONOUR",
        "do_not_honour", "BAD_REQUEST_ERROR",
        Recoverability.NON_RECOVERABLE, Severity.HIGH,
        Decimal("1.00"), {}, True
    )
    hard_context = CustomerRecoveryContext(
        case=base_context.case,
        subscription=base_context.subscription,
        customer=base_context.customer,
        payment_history=base_context.payment_history,
        recovery_history=base_context.recovery_history,
        failure_assessment=hard_assessment,
        quality=base_context.quality
    )

    fb = FallbackDecisionEngine.create_fallback(hard_context, reason="OpenRouter Timeout")
    assert fb.recommended_action == RecommendedActionEnum.STOP
    assert fb.confidence == Decimal("1.00")
    assert fb.is_fallback is True
    assert "HARD_DECLINE_DETECTED" in fb.risk_flags


def test_fallback_engine_general_error(base_context):
    fb = FallbackDecisionEngine.create_fallback(base_context, reason="Gateway 500")
    assert fb.recommended_action == RecommendedActionEnum.MANUAL_ESCALATION
    assert fb.confidence == Decimal("0.50")
    assert fb.is_fallback is True


def test_ai_decision_engine_with_mock_provider(base_context):
    mock_provider = MockLLMProvider({
        "failure_class": "TEMPORARY",
        "recommended_action": "SCHEDULE_RECOVERY_CHECK",
        "delay_hours": 48,
        "confidence": 0.92,
        "reasoning": "Optimal smart retry scheduled.",
        "risk_flags": []
    })

    engine = AIDecisionEngine(provider=mock_provider)
    result = engine.evaluate(base_context)

    assert result.recommended_action == RecommendedActionEnum.SCHEDULE_RECOVERY_CHECK
    assert result.delay_hours == 48
    assert result.confidence == Decimal("0.92")
    assert result.is_fallback is False


def test_ai_decision_engine_triggers_fallback_on_provider_exception(base_context):
    faulty_provider = MagicMock(spec=LLMProvider)
    faulty_provider.generate_decision.side_effect = Exception("Connection Timeout")

    engine = AIDecisionEngine(provider=faulty_provider)
    result = engine.evaluate(base_context)

    assert result.is_fallback is True
    assert result.recommended_action == RecommendedActionEnum.MANUAL_ESCALATION


def test_ai_decision_engine_triggers_fallback_on_low_confidence(base_context):
    low_conf_provider = MockLLMProvider({
        "failure_class": "UNKNOWN",
        "recommended_action": "PAYMENT_LINK_RECOVERY",
        "delay_hours": 24,
        "confidence": 0.60,
        "reasoning": "Uncertain AI reasoning",
        "risk_flags": []
    })

    engine = AIDecisionEngine(provider=low_conf_provider)
    result = engine.evaluate(base_context)

    assert result.is_fallback is True
    assert result.recommended_action == RecommendedActionEnum.MANUAL_ESCALATION
