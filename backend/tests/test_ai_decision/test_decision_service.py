"""Integration tests for AIDecisionService database persistence and audit trail."""

from datetime import datetime, timezone
from decimal import Decimal
import pytest
from sqlalchemy.orm import Session

from app.core.errors import ResourceNotFoundError
from app.domain.ai_decision_engine import AIDecisionEngine
from app.domain.customer_context import (
    CaseContext, CustomerProfileContext, CustomerRecoveryContext,
    DataQualityContext, PaymentHistoryContext, RecoveryHistoryContext,
    SubscriptionContext
)
from app.domain.failure_assessment import FailureAssessment
from app.domain.failure_taxonomy import FailureCategory, Recoverability, Severity
from app.domain.models import AuditEvent, Customer, Merchant, RecoveryCase, RecoveryDecision, Subscription
from app.infrastructure.openrouter import MockLLMProvider
from app.infrastructure.repositories.unit_of_work import UnitOfWork
from app.services.ai_decision_service import AIDecisionService


@pytest.fixture
def mock_engine() -> AIDecisionEngine:
    mock_provider = MockLLMProvider({
        "failure_class": "TEMPORARY",
        "recommended_action": "PAYMENT_LINK_RECOVERY",
        "delay_hours": 24,
        "confidence": 0.88,
        "reasoning": "Recovery via payment link is recommended.",
        "risk_flags": []
    })
    return AIDecisionEngine(provider=mock_provider)


def test_ai_decision_service_persists_decision_and_audit_event(
    uow: UnitOfWork,
    db_session: Session,
    mock_engine: AIDecisionEngine
):
    service = AIDecisionService(engine=mock_engine, uow=uow)

    now = datetime(2026, 8, 26, 12, 0, 0, tzinfo=timezone.utc)
    case_id = "case_ai_srv_01"
    invoice_id = "inv_ai_srv_01"
    amount_inr = Decimal("3999.00")

    # Seed DB records
    with uow:
        m = Merchant(id="m_ai_srv_01", name="AI Merchant", razorpay_account_id="acc_ai_01")
        c = Customer(id="c_ai_srv_01", merchant_id=m.id, razorpay_customer_id="cust_ai_01")
        s = Subscription(id="s_ai_srv_01", merchant_id=m.id, customer_id=c.id, razorpay_subscription_id="sub_ai_01", status="halted", plan_id="p_1")
        case = RecoveryCase(
            id=case_id,
            merchant_id=m.id,
            subscription_id=s.id,
            invoice_id=invoice_id,
            amount_inr=amount_inr,
            stage="HALTED_RECOVERY",
            state="DETECTED",
        )
        uow.merchants.add(m)
        uow.customers.add(c)
        uow.subscriptions.add(s)
        uow.cases.add(case)
        uow.commit()

    context = CustomerRecoveryContext(
        case=CaseContext(case_id, invoice_id, amount_inr, "INR", "HALTED_RECOVERY", "DETECTED", now, 1),
        subscription=SubscriptionContext("sub_ai_01", "halted", "p_1", 2, now, 30),
        customer=CustomerProfileContext("cust_ai_01", 2, Decimal("1.00"), "m***k@corp.com", "+91******8888"),
        payment_history=PaymentHistoryContext(2, 1, 1, 1, 1, 2, "LOW"),
        recovery_history=RecoveryHistoryContext(0, 0, 0, None, None, None),
        failure_assessment=FailureAssessment(
            "ass_1", "razorpay", "pay_1", "sub_ai_01", invoice_id,
            FailureCategory.ACTION_REQUIRED_INSTRUMENT, "CARD_EXPIRED",
            "card_expired", "BAD_REQUEST_ERROR",
            Recoverability.CONDITIONAL, Severity.MEDIUM,
            Decimal("0.95"), {}, False
        ),
        quality=DataQualityContext("1.0.0", Decimal("1.00"), False, [])
    )

    result = service.formulate_decision(context=context, correlation_id="corr_ai_test_001")

    assert result.case_id == case_id
    assert result.recommended_action.value == "PAYMENT_LINK_RECOVERY"
    assert result.confidence == Decimal("0.88")

    # Verify RecoveryDecision in DB
    db_decision = db_session.query(RecoveryDecision).filter_by(recovery_case_id=case_id).first()
    assert db_decision is not None
    assert db_decision.recommended_action == "PAYMENT_LINK_RECOVERY"
    assert db_decision.delay_hours == 24
    assert db_decision.confidence == Decimal("0.88")

    # Verify AuditEvent in DB
    audit = db_session.query(AuditEvent).filter_by(correlation_id="corr_ai_test_001").first()
    assert audit is not None
    assert audit.event_type == "AI_DECISION_PRODUCED"
    assert audit.actor == "AI_DECISION_ENGINE"
    assert audit.payload["recommended_action"] == "PAYMENT_LINK_RECOVERY"


def test_ai_decision_service_non_existent_case_raises_not_found(
    uow: UnitOfWork,
    mock_engine: AIDecisionEngine
):
    service = AIDecisionService(engine=mock_engine, uow=uow)
    now = datetime(2026, 8, 26, 12, 0, 0, tzinfo=timezone.utc)
    context = CustomerRecoveryContext(
        case=CaseContext("case_ghost", "inv_ghost", Decimal("1000.00"), "INR", "HALTED_RECOVERY", "DETECTED", now, 1),
        subscription=SubscriptionContext("sub_1", "halted", "p_1", 1, now, 1),
        customer=CustomerProfileContext("c_1", 1, Decimal("1.00"), None, None),
        payment_history=PaymentHistoryContext(1, 0, 1, 1, 1, 1, "LOW"),
        recovery_history=RecoveryHistoryContext(0, 0, 0, None, None, None),
        failure_assessment=FailureAssessment("a_1", "razorpay", "p_1", "s_1", "i_1", FailureCategory.TEMPORARY_LIQUIDITY, "INSUFFICIENT_FUNDS", None, None, Recoverability.RECOVERABLE, Severity.LOW, Decimal("1.00"), {}, False),
        quality=DataQualityContext("1.0.0", Decimal("1.00"), False, [])
    )

    with pytest.raises(ResourceNotFoundError) as exc_info:
        service.formulate_decision(context)
    assert "RecoveryCase 'case_ghost' not found" in str(exc_info.value)
