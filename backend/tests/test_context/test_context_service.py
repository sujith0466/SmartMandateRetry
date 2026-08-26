"""Integration tests for CustomerContextService and audit event logging."""

from datetime import datetime, timezone
from decimal import Decimal
import pytest
from sqlalchemy.orm import Session

from app.core.errors import EntityNotFoundError
from app.domain.failure_assessment import FailureAssessment
from app.domain.failure_taxonomy import FailureCategory, Recoverability, Severity
from app.domain.models import AuditEvent, Customer, Merchant, RecoveryCase, Subscription
from app.infrastructure.repositories.unit_of_work import UnitOfWork
from app.services.customer_context_service import CustomerContextService


@pytest.fixture
def sample_assessment() -> FailureAssessment:
    return FailureAssessment(
        assessment_id="ass_ctx_001",
        provider="razorpay",
        payment_id="pay_ctx_001",
        subscription_id="sub_ctx_001",
        invoice_id="inv_ctx_001",
        failure_category=FailureCategory.TEMPORARY_TECHNICAL,
        failure_code="GATEWAY_OUTAGE",
        raw_error_reason="gateway_technical_error",
        raw_error_code="GATEWAY_ERROR",
        recoverability=Recoverability.RECOVERABLE,
        severity=Severity.LOW,
        confidence=Decimal("1.00"),
        evidence={"matched_rule": "EXACT_REASON_GATEWAY_TECHNICAL_ERROR"},
        is_hard_decline=False,
    )


def test_customer_context_service_aggregates_and_audits(
    uow: UnitOfWork,
    db_session: Session,
    sample_assessment: FailureAssessment
):
    service = CustomerContextService(uow=uow)

    # Seed data
    with uow:
        m = Merchant(id="m_ctx_01", name="Context Merchant", razorpay_account_id="acc_ctx_01")
        c = Customer(
            id="c_ctx_01",
            merchant_id=m.id,
            razorpay_customer_id="cust_ctx_rzp_01",
            email="developer@company.in",
            contact="+919123456789",
            tenure_months=8,
            historical_success_rate=Decimal("1.00"),
        )
        s = Subscription(
            id="s_ctx_01",
            merchant_id=m.id,
            customer_id=c.id,
            razorpay_subscription_id="sub_ctx_01",
            status="halted",
            plan_id="plan_enterprise",
            current_cycle=8,
        )
        case = RecoveryCase(
            id="case_ctx_01",
            merchant_id=m.id,
            subscription_id=s.id,
            invoice_id="inv_ctx_01",
            amount_inr=Decimal("12500.00"),
            stage="HALTED_RECOVERY",
            state="DETECTED",
        )
        uow.merchants.add(m)
        uow.customers.add(c)
        uow.subscriptions.add(s)
        uow.cases.add(case)
        uow.commit()

    context = service.aggregate_context(
        case_id="case_ctx_01",
        failure_assessment=sample_assessment,
        correlation_id="corr_ctx_test_001"
    )

    assert context.case.case_id == "case_ctx_01"
    assert context.case.amount_inr == Decimal("12500.00")
    assert context.customer.masked_email == "d***r@company.in"
    assert context.customer.masked_contact == "+91******6789"
    assert context.payment_history.successful_payments == 7
    assert context.payment_history.failed_payments == 1
    assert context.quality.completeness_score == Decimal("1.00")

    # Verify AuditEvent created in database
    audit = db_session.query(AuditEvent).filter_by(correlation_id="corr_ctx_test_001").first()
    assert audit is not None
    assert audit.event_type == "CUSTOMER_CONTEXT_AGGREGATED"
    assert audit.actor == "CUSTOMER_CONTEXT_SERVICE"
    assert audit.recovery_case_id == "case_ctx_01"
    assert audit.payload["customer"]["customer_id"] == "cust_ctx_rzp_01"


def test_customer_context_service_invalid_case_id_raises_not_found(
    uow: UnitOfWork,
    sample_assessment: FailureAssessment
):
    service = CustomerContextService(uow=uow)
    with pytest.raises(EntityNotFoundError) as exc_info:
        service.aggregate_context(case_id="case_non_existent", failure_assessment=sample_assessment)
    assert "RecoveryCase 'case_non_existent' not found" in str(exc_info.value)
