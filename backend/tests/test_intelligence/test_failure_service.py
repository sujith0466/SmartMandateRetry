"""Integration tests for FailureIntelligenceService persistence and audit trail."""

from datetime import datetime, timezone
from decimal import Decimal
import pytest
from sqlalchemy.orm import Session

from app.domain.models import AuditEvent, Customer, Merchant, RecoveryCase, Subscription
from app.domain.normalized_event import NormalizedWebhookEvent
from app.infrastructure.repositories.unit_of_work import UnitOfWork
from app.services.failure_intelligence_service import FailureIntelligenceService


def test_failure_service_updates_case_and_records_audit(uow: UnitOfWork, db_session: Session):
    service = FailureIntelligenceService(uow=uow)

    # Setup database records
    with uow:
        m = Merchant(id="m_fitest_01", name="FI Merchant", razorpay_account_id="acc_fi_test_001")
        c = Customer(id="c_fitest_01", merchant_id=m.id, razorpay_customer_id="rzp_c_fi_01")
        s = Subscription(
            id="s_fitest_01",
            merchant_id=m.id,
            customer_id=c.id,
            razorpay_subscription_id="sub_fi_01",
            status="halted",
            plan_id="plan_fi_01",
        )
        case = RecoveryCase(
            id="case_fitest_01",
            merchant_id=m.id,
            subscription_id=s.id,
            invoice_id="inv_fi_test_001",
            amount_inr=Decimal("4999.00"),
            stage="HALTED_RECOVERY",
            state="DETECTED",
        )
        uow.merchants.add(m)
        uow.customers.add(c)
        uow.subscriptions.add(s)
        uow.cases.add(case)
        uow.commit()

    event = NormalizedWebhookEvent(
        provider="razorpay",
        event_id="evt_fi_test_01",
        event_type="PAYMENT_FAILED",
        occurred_at=datetime.now(timezone.utc),
        merchant_account_id="acc_fi_test_001",
        entity_type="payment",
        entity_id="pay_fi_01",
        subscription_id="sub_fi_01",
        invoice_id="inv_fi_test_001",
        amount_inr=Decimal("4999.00"),
        currency="INR",
        error_metadata={
            "error_code": "BAD_REQUEST_ERROR",
            "error_description": "Payment was declined by issuing bank",
            "error_source": "bank",
            "error_step": "payment_authorization",
            "error_reason": "do_not_honour",
        },
        raw_payload={}
    )

    assessment = service.process_failure(event, correlation_id="corr_fi_001")
    assert assessment.failure_category.value == "PERMANENT_HARD_DECLINE"
    assert assessment.is_hard_decline is True

    # Verify RecoveryCase updated in database
    updated_case = db_session.query(RecoveryCase).filter_by(id="case_fitest_01").first()
    assert updated_case.failure_category == "PERMANENT_HARD_DECLINE"
    assert updated_case.failure_code == "DO_NOT_HONOUR"

    # Verify AuditEvent created in database
    audit_record = db_session.query(AuditEvent).filter_by(recovery_case_id="case_fitest_01").first()
    assert audit_record is not None
    assert audit_record.event_type == "PAYMENT_FAILURE_CLASSIFIED"
    assert audit_record.actor == "FAILURE_INTELLIGENCE_ENGINE"
    assert audit_record.correlation_id == "corr_fi_001"
    assert audit_record.payload["failure_category"] == "PERMANENT_HARD_DECLINE"
