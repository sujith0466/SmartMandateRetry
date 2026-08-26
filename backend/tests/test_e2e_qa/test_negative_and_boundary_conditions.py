"""End-to-End Boundary and Negative Condition Tests."""

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
        "merchant_id": "m_bnd_01",
        "max_retries_per_case": 3,
        "min_retry_interval_hours": 24,
        "max_recovery_window_days": 14,
        "min_confidence_threshold": Decimal("0.75"),
        "high_value_threshold_inr": Decimal("50000.00"),
        "max_customer_contacts_per_cycle": 3,
        "hard_decline_auto_stop": True,
    }
    defaults.update(kwargs)
    return RecoveryPolicy(**defaults)


class TestBoundaryAndNegativeConditions:
    def _create_context(self, amount: Decimal = Decimal("50000.00"), failed_payments: int = 1):
        now = datetime(2026, 8, 26, 12, 0, 0, tzinfo=timezone.utc)
        return CustomerRecoveryContext(
            case=CaseContext("c_bnd_01", "inv_01", amount, "INR", "HALTED_RECOVERY", "DETECTED", now, failed_payments),
            subscription=SubscriptionContext("s_bnd_01", "halted", "p_1", 2, now, 30),
            customer=CustomerProfileContext("cust_bnd_01", 2, Decimal("1.00"), None, None),
            payment_history=PaymentHistoryContext(5, 4, failed_payments, 0, 1, 2, "LOW"),
            recovery_history=RecoveryHistoryContext(failed_payments, 0, 0, None, None, None),
            failure_assessment=FailureAssessment(
                "ass_bnd_01", "razorpay", "pay_01", "s_bnd_01", "inv_01",
                FailureCategory.TEMPORARY_LIQUIDITY, "INSUFFICIENT_FUNDS",
                "reason", "ERR", Recoverability.RECOVERABLE, Severity.LOW,
                Decimal("1.00"), {}, False,
            ),
            quality=DataQualityContext("1.0.0", Decimal("1.00"), False, []),
        )

    def test_high_value_exact_boundary(self):
        """Test amount exactly equal to threshold vs 1 paisa above threshold."""
        policy = _make_policy(high_value_threshold_inr=Decimal("50000.00"))
        engine = PolicyEvaluationEngine()

        # Exact threshold ₹50,000.00 -> Allowed
        ctx_exact = self._create_context(amount=Decimal("50000.00"))
        dec = AIDecisionResult("d_1", "c_1", FailureClassEnum.TEMPORARY, RecommendedActionEnum.SCHEDULE_RECOVERY_CHECK, 48, Decimal("0.90"), "test", [], "m", "1.0", False)
        res_exact = engine.evaluate(ctx_exact, dec, policy)
        assert res_exact.status == PolicyStatusEnum.ALLOWED
        assert res_exact.final_action == "SCHEDULE_RECOVERY_CHECK"

        # 1 paisa above threshold ₹50,000.01 -> Escalated
        ctx_above = self._create_context(amount=Decimal("50000.01"))
        res_above = engine.evaluate(ctx_above, dec, policy)
        assert res_above.status == PolicyStatusEnum.MODIFIED
        assert res_above.final_action == "MANUAL_ESCALATION"

    def test_confidence_threshold_exact_boundary(self):
        """Test confidence exactly equal to min threshold (0.70) vs below threshold (0.69)."""
        policy = _make_policy(min_confidence_threshold=Decimal("0.70"))
        engine = PolicyEvaluationEngine()
        ctx = self._create_context(amount=Decimal("2000.00"))

        # Exact threshold 0.70 -> Allowed
        dec_exact = AIDecisionResult("d_2", "c_1", FailureClassEnum.TEMPORARY, RecommendedActionEnum.SCHEDULE_RECOVERY_CHECK, 48, Decimal("0.70"), "test", [], "m", "1.0", False)
        res_exact = engine.evaluate(ctx, dec_exact, policy)
        assert res_exact.status == PolicyStatusEnum.ALLOWED

        # Below threshold 0.69 -> Modified / Vetoed
        dec_below = AIDecisionResult("d_3", "c_1", FailureClassEnum.TEMPORARY, RecommendedActionEnum.SCHEDULE_RECOVERY_CHECK, 48, Decimal("0.69"), "test", [], "m", "1.0", False)
        res_below = engine.evaluate(ctx, dec_below, policy)
        assert res_below.status == PolicyStatusEnum.MODIFIED
        assert res_below.final_action == "MANUAL_ESCALATION"

    def test_retry_attempt_cap_exact_boundary(self):
        """Test failed payments = 2 (under cap) vs 3 (cap reached)."""
        policy = _make_policy(max_retries_per_case=3)
        engine = PolicyEvaluationEngine()
        dec = AIDecisionResult("d_4", "c_1", FailureClassEnum.TEMPORARY, RecommendedActionEnum.SCHEDULE_RECOVERY_CHECK, 48, Decimal("0.85"), "test", [], "m", "1.0", False)

        # 2 failures -> Allowed
        ctx_under = self._create_context(failed_payments=2)
        res_under = engine.evaluate(ctx_under, dec, policy)
        assert res_under.status == PolicyStatusEnum.ALLOWED

        # 3 failures -> Cap reached, blocked from automated retry
        ctx_capped = self._create_context(failed_payments=3)
        res_capped = engine.evaluate(ctx_capped, dec, policy)
        assert res_capped.status == PolicyStatusEnum.BLOCKED
        assert res_capped.final_action == "STOP"
