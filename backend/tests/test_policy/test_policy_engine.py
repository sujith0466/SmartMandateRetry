"""Unit and integration tests for PolicyEvaluationEngine and PolicyEngineService."""

from datetime import datetime, timezone
from decimal import Decimal
import pytest
from sqlalchemy.orm import Session

from app.core.errors import ResourceNotFoundError
from app.domain.ai_decision_schemas import AIDecisionResult, FailureClassEnum, RecommendedActionEnum
from app.domain.customer_context import (
    CaseContext, CustomerProfileContext, CustomerRecoveryContext,
    DataQualityContext, PaymentHistoryContext, RecoveryHistoryContext,
    SubscriptionContext
)
from app.domain.failure_assessment import FailureAssessment
from app.domain.failure_taxonomy import FailureCategory, Recoverability, Severity
from app.domain.models import AuditEvent, Customer, Merchant, RecoveryCase, RecoveryPolicy, Subscription
from app.domain.policy_decision import PolicyStatusEnum
from app.domain.policy_engine import PolicyEvaluationEngine
from app.infrastructure.repositories.unit_of_work import UnitOfWork
from app.services.policy_engine_service import PolicyEngineService


@pytest.fixture
def sample_eval_data():
    now = datetime(2026, 8, 26, 12, 0, 0, tzinfo=timezone.utc)
    context = CustomerRecoveryContext(
        case=CaseContext("c_pol_01", "inv_pol_01", Decimal("2500.00"), "INR", "HALTED_RECOVERY", "DETECTED", now, 2),
        subscription=SubscriptionContext("s_pol_01", "halted", "p_1", 2, now, 30),
        customer=CustomerProfileContext("cust_pol_01", 2, Decimal("1.00"), "a***b@test.com", "+91******0000"),
        payment_history=PaymentHistoryContext(2, 1, 1, 1, 1, 2, "LOW"),
        recovery_history=RecoveryHistoryContext(0, 0, 0, None, None, None),
        failure_assessment=FailureAssessment(
            "ass_pol_01", "razorpay", "pay_pol_01", "s_pol_01", "inv_pol_01",
            FailureCategory.TEMPORARY_LIQUIDITY, "INSUFFICIENT_FUNDS",
            "insufficient_funds", "ERR", Recoverability.RECOVERABLE, Severity.LOW,
            Decimal("1.00"), {}, False
        ),
        quality=DataQualityContext("1.0.0", Decimal("1.00"), False, [])
    )
    decision = AIDecisionResult(
        "dec_pol_01", "c_pol_01", FailureClassEnum.TEMPORARY,
        RecommendedActionEnum.SCHEDULE_RECOVERY_CHECK, 48, Decimal("0.95"),
        "Smart retry recommended", [], "mock_model", "1.0.0", False
    )
    policy = RecoveryPolicy(
        merchant_id="m_pol_01", max_retries_per_case=3, min_retry_interval_hours=24,
        max_recovery_window_days=14, min_confidence_threshold=Decimal("0.75"),
        high_value_threshold_inr=Decimal("10000.00"), max_customer_contacts_per_cycle=3,
        hard_decline_auto_stop=True
    )
    return context, decision, policy


def test_policy_engine_evaluates_valid_proposal(sample_eval_data):
    context, decision, policy = sample_eval_data
    engine = PolicyEvaluationEngine()

    result = engine.evaluate(context, decision, policy)
    assert result.status == PolicyStatusEnum.ALLOWED
    assert result.execution_allowed is True
    assert result.final_action == "SCHEDULE_RECOVERY_CHECK"
    assert result.adjusted_delay_hours == 48


def test_policy_engine_rule_precedence_hard_decline_overrides_high_value():
    now = datetime(2026, 8, 26, 12, 0, 0, tzinfo=timezone.utc)
    context = CustomerRecoveryContext(
        case=CaseContext("c_1", "inv_1", Decimal("50000.00"), "INR", "HALTED_RECOVERY", "DETECTED", now, 2),
        subscription=SubscriptionContext("s_1", "halted", "p_1", 2, now, 30),
        customer=CustomerProfileContext("cust_1", 2, Decimal("1.00"), None, None),
        payment_history=PaymentHistoryContext(2, 1, 1, 1, 1, 2, "LOW"),
        recovery_history=RecoveryHistoryContext(0, 0, 0, None, None, None),
        failure_assessment=FailureAssessment(
            "ass_1", "razorpay", "pay_1", "s_1", "inv_1",
            FailureCategory.PERMANENT_HARD_DECLINE, "DO_NOT_HONOUR",
            "do_not_honour", "ERR", Recoverability.NON_RECOVERABLE, Severity.HIGH,
            Decimal("1.00"), {}, True
        ),
        quality=DataQualityContext("1.0.0", Decimal("1.00"), False, [])
    )
    decision = AIDecisionResult(
        "dec_1", "c_1", FailureClassEnum.PERMANENT, RecommendedActionEnum.PAYMENT_LINK_RECOVERY,
        24, Decimal("0.90"), "Erroneous AI action", [], "mock_model", "1.0.0", False
    )
    policy = RecoveryPolicy(merchant_id="m_1", high_value_threshold_inr=Decimal("10000.00"))

    engine = PolicyEvaluationEngine()
    result = engine.evaluate(context, decision, policy)

    # Highest precedence rule (HARD_DECLINE_VETO) must force STOP rather than MANUAL_ESCALATION
    assert result.final_action == "STOP"
    assert result.status == PolicyStatusEnum.BLOCKED
    assert result.execution_allowed is False
    assert "HARD_DECLINE_VETO" in result.policy_rules_applied


def test_policy_engine_service_integration(uow: UnitOfWork, db_session: Session, sample_eval_data):
    context, decision, policy = sample_eval_data
    service = PolicyEngineService(uow=uow)

    case_id = "c_pol_srv_01"
    merchant_id = "m_pol_srv_01"

    # Seed DB
    with uow:
        m = Merchant(id=merchant_id, name="Policy Merchant", razorpay_account_id="acc_pol_01")
        c = Customer(id="c_1", merchant_id=m.id, razorpay_customer_id="cust_01")
        s = Subscription(id="s_1", merchant_id=m.id, customer_id=c.id, razorpay_subscription_id="sub_01", status="halted", plan_id="p_1")
        case = RecoveryCase(
            id=case_id, merchant_id=m.id, subscription_id=s.id,
            invoice_id="inv_pol_01", amount_inr=Decimal("1500.00"),
            stage="HALTED_RECOVERY", state="DETECTED"
        )
        pol = RecoveryPolicy(
            merchant_id=m.id, max_retries_per_case=3, min_retry_interval_hours=24,
            max_recovery_window_days=14, min_confidence_threshold=Decimal("0.75"),
            high_value_threshold_inr=Decimal("10000.00"), max_customer_contacts_per_cycle=3,
            hard_decline_auto_stop=True
        )
        uow.merchants.add(m)
        uow.customers.add(c)
        uow.subscriptions.add(s)
        uow.cases.add(case)
        uow.policies.add(pol)
        uow.commit()

    test_context = CustomerRecoveryContext(
        case=CaseContext(case_id, "inv_pol_01", Decimal("1500.00"), "INR", "HALTED_RECOVERY", "DETECTED", datetime.now(timezone.utc), 1),
        subscription=context.subscription, customer=context.customer,
        payment_history=context.payment_history, recovery_history=context.recovery_history,
        failure_assessment=context.failure_assessment, quality=context.quality
    )

    result = service.evaluate_policy(context=test_context, decision=decision, correlation_id="corr_pol_001")

    assert result.case_id == case_id
    assert result.status == PolicyStatusEnum.ALLOWED
    assert result.execution_allowed is True

    # Verify AuditEvent in DB
    audit = db_session.query(AuditEvent).filter_by(correlation_id="corr_pol_001").first()
    assert audit is not None
    assert audit.event_type == "POLICY_DECISION_EVALUATED"
    assert audit.actor == "POLICY_ENGINE"
    assert audit.payload["status"] == "ALLOWED"


def test_policy_engine_service_missing_case_raises_not_found(uow: UnitOfWork, sample_eval_data):
    context, decision, _ = sample_eval_data
    service = PolicyEngineService(uow=uow)

    with pytest.raises(ResourceNotFoundError) as exc_info:
        service.evaluate_policy(context=context, decision=decision)
    assert "RecoveryCase 'c_pol_01' not found" in str(exc_info.value)
