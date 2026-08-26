"""End-to-End Cross-Phase Invariant Tests."""

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
from app.domain.policy_engine import PolicyEvaluationEngine


def _make_policy(**kwargs) -> RecoveryPolicy:
    defaults = {
        "merchant_id": "m_inv_01",
        "max_retries_per_case": 3,
        "min_retry_interval_hours": 24,
        "max_recovery_window_days": 14,
        "min_confidence_threshold": Decimal("0.75"),
        "high_value_threshold_inr": Decimal("10000.00"),
        "max_customer_contacts_per_cycle": 3,
        "hard_decline_auto_stop": True,
    }
    defaults.update(kwargs)
    return RecoveryPolicy(**defaults)


class TestCrossPhaseInvariants:
    def _create_context(self, amount: Decimal = Decimal("2500.00"), is_hard_decline: bool = False, failed_payments: int = 1, recent_failures_30d: int = 0):
        now = datetime(2026, 8, 26, 12, 0, 0, tzinfo=timezone.utc)
        return CustomerRecoveryContext(
            case=CaseContext("c_inv_01", "inv_01", amount, "INR", "HALTED_RECOVERY", "DETECTED", now, failed_payments),
            subscription=SubscriptionContext("s_inv_01", "halted", "p_1", 2, now, 30),
            customer=CustomerProfileContext("cust_inv_01", 2, Decimal("1.00"), None, None),
            payment_history=PaymentHistoryContext(5, 4, failed_payments, 0, recent_failures_30d, 5, "HIGH"),
            recovery_history=RecoveryHistoryContext(failed_payments, recent_failures_30d, 0, None, None, None),
            failure_assessment=FailureAssessment(
                "ass_inv_01", "razorpay", "pay_01", "s_inv_01", "inv_01",
                FailureCategory.PERMANENT_HARD_DECLINE if is_hard_decline else FailureCategory.TEMPORARY_LIQUIDITY,
                "DO_NOT_HONOUR" if is_hard_decline else "INSUFFICIENT_FUNDS",
                "reason", "ERR",
                Recoverability.NON_RECOVERABLE if is_hard_decline else Recoverability.RECOVERABLE,
                Severity.HIGH if is_hard_decline else Severity.LOW,
                Decimal("1.00"), {}, is_hard_decline,
            ),
            quality=DataQualityContext("1.0.0", Decimal("1.00"), False, []),
        )

    def test_policy_engine_overrides_unsafe_ai_recommendation(self):
        """Invariant: Raw AI output CANNOT bypass P0 Hard Decline safety gates."""
        context = self._create_context(is_hard_decline=True)
        decision = AIDecisionResult(
            "dec_1", "c_inv_01", FailureClassEnum.PERMANENT, RecommendedActionEnum.PAYMENT_LINK_RECOVERY,
            24, Decimal("0.99"), "AI recommending link recovery", [], "mock_model", "1.0.0", False
        )
        policy = _make_policy(hard_decline_auto_stop=True)

        engine = PolicyEvaluationEngine()
        result = engine.evaluate(context, decision, policy)

        assert result.status == PolicyStatusEnum.BLOCKED
        assert result.final_action == "STOP"
        assert result.execution_allowed is False

    def test_contact_cap_overrides_customer_notification(self):
        """Invariant: When contact limit is reached, AI cannot spam customer."""
        context = self._create_context(recent_failures_30d=2)
        decision = AIDecisionResult(
            "dec_2", "c_inv_01", FailureClassEnum.TEMPORARY, RecommendedActionEnum.PAYMENT_LINK_RECOVERY,
            24, Decimal("0.90"), "AI link recovery", [], "mock_model", "1.0.0", False
        )
        policy = _make_policy(max_customer_contacts_per_cycle=2)

        engine = PolicyEvaluationEngine()
        result = engine.evaluate(context, decision, policy)

        # Policy modifies action to manual review / escalation
        assert result.status == PolicyStatusEnum.MODIFIED
        assert result.final_action == "MANUAL_ESCALATION"

    def test_high_value_escalation_overrides_direct_retry(self):
        """Invariant: Payments > threshold must be escalated to manual review."""
        context = self._create_context(amount=Decimal("75000.00"))
        decision = AIDecisionResult(
            "dec_3", "c_inv_01", FailureClassEnum.TEMPORARY, RecommendedActionEnum.SCHEDULE_RECOVERY_CHECK,
            48, Decimal("0.95"), "AI retry", [], "mock_model", "1.0.0", False
        )
        policy = _make_policy(high_value_threshold_inr=Decimal("50000.00"))

        engine = PolicyEvaluationEngine()
        result = engine.evaluate(context, decision, policy)

        assert result.status == PolicyStatusEnum.MODIFIED
        assert result.final_action == "MANUAL_ESCALATION"
