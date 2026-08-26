"""Integration and idempotency tests for ReconciliationService with PostgreSQL."""

from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import MagicMock
import pytest
import requests
from sqlalchemy.orm import Session

from app.domain.models import AuditEvent, Customer, Merchant, RecoveryAction, RecoveryCase, Subscription
from app.domain.normalized_event import NormalizedWebhookEvent
from app.domain.reconciliation_schemas import (
    PaymentOutcome, ReconciliationEvidence, ReconciliationResult, ReconciliationStatus
)
from app.infrastructure.repositories.unit_of_work import UnitOfWork
from app.services.reconciliation_service import ReconciliationService


@pytest.fixture
def populated_case_db(uow: UnitOfWork) -> str:
    case_id = "case_int_recon_01"
    with uow:
        m = Merchant(id="m_recon_int", name="Recon Merchant", razorpay_account_id="acc_recon_int")
        c = Customer(id="c_recon_int", merchant_id=m.id, razorpay_customer_id="cust_recon_int", email="rec@user.internal", contact="+919876543210")
        s = Subscription(id="s_recon_int", merchant_id=m.id, customer_id=c.id, razorpay_subscription_id="sub_recon_int", status="halted", plan_id="p_recon")
        case = RecoveryCase(
            id=case_id,
            merchant_id=m.id,
            subscription_id=s.id,
            invoice_id="inv_recon_int_01",
            amount_inr=Decimal("2500.00"),
            currency="INR",
            stage="HALTED_RECOVERY",
            state="IN_PROGRESS",
        )
        action = RecoveryAction(
            id="act_recon_int_01",
            recovery_case_id=case.id,
            action_type="PAYMENT_LINK_RECOVERY",
            idempotency_key="phase8:case_int_recon_01:pol_dec_01:PAYMENT_LINK_RECOVERY",
            status="EXECUTED",
            external_reference_id="plink_recon_int_01",
        )
        uow.merchants.add(m)
        uow.customers.add(c)
        uow.subscriptions.add(s)
        uow.cases.add(case)
        uow.actions.add(action)
        uow.commit()

    return case_id


def test_reconciliation_payment_link_paid_success(uow: UnitOfWork, db_session: Session, populated_case_db):
    service = ReconciliationService(uow=uow)
    event = NormalizedWebhookEvent(
        provider="razorpay",
        event_id="evt_plink_paid_01",
        event_type="PAYMENT_LINK_PAID",
        occurred_at=datetime.now(timezone.utc),
        merchant_account_id="acc_recon_int",
        entity_type="payment_link",
        entity_id="plink_recon_int_01",
        subscription_id=None,
        invoice_id=None,
        amount_inr=Decimal("2500.00"),
        currency="INR",
        error_metadata={},
        raw_payload={"id": "plink_recon_int_01", "status": "paid"},
    )

    result = service.reconcile_normalized_event(event, correlation_id="corr_plink_01")

    assert result.reconciliation_status == ReconciliationStatus.RECONCILED
    assert result.payment_outcome == PaymentOutcome.PAYMENT_SUCCEEDED

    # Verify RecoveryCase in DB
    case = db_session.query(RecoveryCase).filter_by(id=populated_case_db).first()
    assert case.state == "RECOVERED"
    assert case.recovered_amount_inr == Decimal("2500.00")
    assert case.resolved_at is not None

    # Verify RecoveryAction in DB
    action = db_session.query(RecoveryAction).filter_by(recovery_case_id=populated_case_db).first()
    assert action.status == "RECONCILED"

    # Verify AuditEvent
    audit = db_session.query(AuditEvent).filter_by(correlation_id="corr_plink_01").first()
    assert audit is not None
    assert audit.event_type == "PAYMENT_OUTCOME_RECONCILED"


def test_reconciliation_failed_payment_mutation(uow: UnitOfWork, db_session: Session, populated_case_db):
    service = ReconciliationService(uow=uow)
    event = NormalizedWebhookEvent(
        provider="razorpay",
        event_id="evt_pay_fail_01",
        event_type="PAYMENT_FAILED",
        occurred_at=datetime.now(timezone.utc),
        merchant_account_id="acc_recon_int",
        entity_type="payment",
        entity_id="pay_fail_01",
        subscription_id=None,
        invoice_id="inv_recon_int_01",
        amount_inr=Decimal("2500.00"),
        currency="INR",
        error_metadata={"code": "INSUFFICIENT_FUNDS", "description": "Not enough balance"},
        raw_payload={},
    )

    result = service.reconcile_normalized_event(event, correlation_id="corr_fail_01")

    assert result.reconciliation_status == ReconciliationStatus.FAILED

    case = db_session.query(RecoveryCase).filter_by(id=populated_case_db).first()
    assert case.state == "FAILED"

    action = db_session.query(RecoveryAction).filter_by(recovery_case_id=populated_case_db).first()
    assert action.status == "FAILED"

    audit = db_session.query(AuditEvent).filter_by(correlation_id="corr_fail_01").first()
    assert audit is not None
    assert audit.event_type == "PAYMENT_OUTCOME_FAILED"


def test_reconciliation_mismatch_audit(uow: UnitOfWork, db_session: Session, populated_case_db):
    service = ReconciliationService(uow=uow)
    event = NormalizedWebhookEvent(
        provider="razorpay",
        event_id="evt_mismatch_01",
        event_type="PAYMENT_CAPTURED",
        occurred_at=datetime.now(timezone.utc),
        merchant_account_id="acc_recon_int",
        entity_type="payment",
        entity_id="pay_mis_01",
        subscription_id=None,
        invoice_id="inv_recon_int_01",
        amount_inr=Decimal("100.00"),  # Expected 2500.00
        currency="INR",
        error_metadata={},
        raw_payload={},
    )

    result = service.reconcile_normalized_event(event, correlation_id="corr_mis_01")

    assert result.reconciliation_status == ReconciliationStatus.MISMATCH

    audit = db_session.query(AuditEvent).filter_by(correlation_id="corr_mis_01").first()
    assert audit is not None
    assert audit.event_type == "PAYMENT_OUTCOME_MISMATCH"


def test_reconciliation_unknown_uncorrelatable_audit(uow: UnitOfWork, db_session: Session):
    with uow:
        m = Merchant(id="m_unk_test", name="Unknown Recon Merchant", razorpay_account_id="acc_unknown")
        uow.merchants.add(m)
        uow.commit()

    service = ReconciliationService(uow=uow)
    event = NormalizedWebhookEvent(
        provider="razorpay",
        event_id="evt_unk_01",
        event_type="PAYMENT_CAPTURED",
        occurred_at=datetime.now(timezone.utc),
        merchant_account_id="acc_unknown",
        entity_type="payment",
        entity_id="pay_unk_01",
        subscription_id="sub_non_existent",
        invoice_id="inv_non_existent",
        amount_inr=Decimal("500.00"),
        currency="INR",
        error_metadata={},
        raw_payload={"account_id": "acc_unknown"},
    )

    result = service.reconcile_normalized_event(event, correlation_id="corr_unk_01")

    assert result.reconciliation_status == ReconciliationStatus.UNKNOWN

    audit = db_session.query(AuditEvent).filter_by(correlation_id="corr_unk_01").first()
    assert audit is not None
    assert audit.event_type == "PAYMENT_OUTCOME_UNKNOWN"


def test_reconciliation_duplicate_webhook_idempotent_no_op(uow: UnitOfWork, db_session: Session, populated_case_db):
    service = ReconciliationService(uow=uow)
    event = NormalizedWebhookEvent(
        provider="razorpay",
        event_id="evt_dup_01",
        event_type="PAYMENT_CAPTURED",
        occurred_at=datetime.now(timezone.utc),
        merchant_account_id="acc_recon_int",
        entity_type="payment",
        entity_id="pay_dup_01",
        subscription_id=None,
        invoice_id="inv_recon_int_01",
        amount_inr=Decimal("2500.00"),
        currency="INR",
        error_metadata={},
        raw_payload={},
    )

    # First delivery: reconciles to RECOVERED
    res1 = service.reconcile_normalized_event(event)
    assert res1.reconciliation_status == ReconciliationStatus.RECONCILED

    # Second delivery: acknowledged as duplicate without modifying DB or revenue
    res2 = service.reconcile_normalized_event(event)
    assert res2.reconciliation_status == ReconciliationStatus.DUPLICATE_IGNORED

    case = db_session.query(RecoveryCase).filter_by(id=populated_case_db).first()
    assert case.state == "RECOVERED"
    assert case.recovered_amount_inr == Decimal("2500.00")


def test_direct_gateway_check_fallback_success(uow: UnitOfWork, db_session: Session, populated_case_db):
    mock_rzp = MagicMock()
    mock_rzp.fetch_payment.return_value = {
        "id": "pay_direct_123",
        "status": "captured",
        "amount": 250000,
        "currency": "INR",
        "invoice_id": "inv_recon_int_01",
    }

    service = ReconciliationService(uow=uow, razorpay_client=mock_rzp)
    result = service.reconcile_via_direct_gateway_check(
        payment_id="pay_direct_123",
        case_id=populated_case_db,
        correlation_id="corr_direct_01"
    )

    assert result.reconciliation_status == ReconciliationStatus.RECONCILED
    assert result.payment_outcome == PaymentOutcome.PAYMENT_SUCCEEDED


def test_direct_gateway_check_timeout_handling(uow: UnitOfWork, populated_case_db):
    mock_rzp = MagicMock()
    mock_rzp.fetch_payment.side_effect = requests.exceptions.Timeout("Gateway timeout")

    service = ReconciliationService(uow=uow, razorpay_client=mock_rzp)
    result = service.reconcile_via_direct_gateway_check(
        payment_id="pay_timeout_123",
        case_id=populated_case_db,
    )

    assert result.reconciliation_status == ReconciliationStatus.PENDING_VERIFICATION


def test_direct_gateway_check_generic_error_handling(uow: UnitOfWork, populated_case_db):
    mock_rzp = MagicMock()
    mock_rzp.fetch_payment.side_effect = RuntimeError("500 Internal Server Error")

    service = ReconciliationService(uow=uow, razorpay_client=mock_rzp)
    result = service.reconcile_via_direct_gateway_check(
        payment_id="pay_err_123",
        case_id=populated_case_db,
    )

    assert result.reconciliation_status == ReconciliationStatus.UNKNOWN
