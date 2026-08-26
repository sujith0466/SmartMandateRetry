"""Unit tests for CorrelationEngine and ReconciliationEngine."""

from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import MagicMock
import pytest

from app.domain.correlation_engine import CorrelationEngine
from app.domain.models import Customer, Merchant, RecoveryAction, RecoveryCase, Subscription
from app.domain.reconciliation_engine import ReconciliationEngine
from app.domain.reconciliation_schemas import (
    PaymentOutcome, ReconciliationEvidence, ReconciliationStatus
)
from app.infrastructure.repositories.unit_of_work import UnitOfWork


@pytest.fixture
def sample_case() -> RecoveryCase:
    return RecoveryCase(
        id="case_recon_01",
        merchant_id="m_recon_01",
        subscription_id="sub_recon_01",
        invoice_id="inv_recon_01",
        payment_id="pay_recon_01",
        amount_inr=Decimal("2000.00"),
        currency="INR",
        stage="HALTED_RECOVERY",
        state="IN_PROGRESS",
    )


@pytest.fixture
def sample_action() -> RecoveryAction:
    return RecoveryAction(
        id="act_recon_01",
        recovery_case_id="case_recon_01",
        action_type="PAYMENT_LINK_RECOVERY",
        idempotency_key="phase8:case_recon_01:dec_01:PAYMENT_LINK_RECOVERY",
        status="EXECUTED",
        external_reference_id="plink_recon_01",
    )


def test_outcome_mapping_all_events():
    engine = ReconciliationEngine()
    assert engine.map_event_to_outcome("payment.captured") == PaymentOutcome.PAYMENT_SUCCEEDED
    assert engine.map_event_to_outcome("PAYMENT_LINK_PAID") == PaymentOutcome.PAYMENT_SUCCEEDED
    assert engine.map_event_to_outcome("subscription.charged") == PaymentOutcome.PAYMENT_SUCCEEDED
    assert engine.map_event_to_outcome("payment.failed") == PaymentOutcome.PAYMENT_FAILED
    assert engine.map_event_to_outcome("payment.pending") == PaymentOutcome.PAYMENT_PENDING
    assert engine.map_event_to_outcome("unknown_nonsense_event") == PaymentOutcome.UNKNOWN


def test_reconciliation_payment_succeeded_exact_match(sample_case, sample_action):
    engine = ReconciliationEngine()
    ev = ReconciliationEvidence(
        evidence_id="ev_01",
        event_type="PAYMENT_LINK_PAID",
        provider="razorpay",
        entity_type="payment_link",
        entity_id="plink_recon_01",
        amount_inr=Decimal("2000.00"),
        currency="INR",
    )

    result = engine.evaluate(ev, sample_case, sample_action, "PAYMENT_LINK_ID", "plink_recon_01")

    assert result.reconciliation_status == ReconciliationStatus.RECONCILED
    assert result.payment_outcome == PaymentOutcome.PAYMENT_SUCCEEDED
    assert result.settled_amount_inr == Decimal("2000.00")
    assert result.case_id == sample_case.id


def test_reconciliation_amount_mismatch(sample_case, sample_action):
    engine = ReconciliationEngine()
    ev = ReconciliationEvidence(
        evidence_id="ev_02",
        event_type="PAYMENT_CAPTURED",
        provider="razorpay",
        entity_type="payment",
        entity_id="pay_01",
        amount_inr=Decimal("1500.00"),  # Expected 2000.00
        currency="INR",
    )

    result = engine.evaluate(ev, sample_case, sample_action, "INVOICE_ID", "inv_recon_01")

    assert result.reconciliation_status == ReconciliationStatus.MISMATCH
    assert "Amount mismatch" in result.notes


def test_reconciliation_currency_mismatch(sample_case, sample_action):
    engine = ReconciliationEngine()
    ev = ReconciliationEvidence(
        evidence_id="ev_03",
        event_type="PAYMENT_CAPTURED",
        provider="razorpay",
        entity_type="payment",
        entity_id="pay_01",
        amount_inr=Decimal("2000.00"),
        currency="USD",  # Expected INR
    )

    result = engine.evaluate(ev, sample_case, sample_action, "INVOICE_ID", "inv_recon_01")

    assert result.reconciliation_status == ReconciliationStatus.MISMATCH
    assert "Currency mismatch" in result.notes


def test_reconciliation_case_already_recovered_duplicate_ignored(sample_case, sample_action):
    sample_case.state = "RECOVERED"
    sample_case.recovered_amount_inr = Decimal("2000.00")

    engine = ReconciliationEngine()
    ev = ReconciliationEvidence(
        evidence_id="ev_04",
        event_type="PAYMENT_CAPTURED",
        provider="razorpay",
        entity_type="payment",
        entity_id="pay_01",
        amount_inr=Decimal("2000.00"),
        currency="INR",
    )

    result = engine.evaluate(ev, sample_case, sample_action, "INVOICE_ID", "inv_recon_01")

    assert result.reconciliation_status == ReconciliationStatus.DUPLICATE_IGNORED


def test_reconciliation_late_failure_after_success_ignored(sample_case, sample_action):
    sample_case.state = "RECOVERED"
    sample_case.recovered_amount_inr = Decimal("2000.00")

    engine = ReconciliationEngine()
    ev = ReconciliationEvidence(
        evidence_id="ev_05",
        event_type="PAYMENT_FAILED",
        provider="razorpay",
        entity_type="payment",
        entity_id="pay_01",
        error_code="BAD_REQUEST_ERROR",
        error_description="Late failure received",
    )

    result = engine.evaluate(ev, sample_case, sample_action, "INVOICE_ID", "inv_recon_01")

    # Must NOT revert recovered case
    assert result.reconciliation_status == ReconciliationStatus.DUPLICATE_IGNORED
    assert "Late failure event ignored" in result.notes


def test_reconciliation_uncorrelated_evidence_returns_unknown():
    engine = ReconciliationEngine()
    ev = ReconciliationEvidence(
        evidence_id="ev_06",
        event_type="PAYMENT_CAPTURED",
        provider="razorpay",
        entity_type="payment",
        entity_id="pay_unknown_123",
        amount_inr=Decimal("1000.00"),
    )

    result = engine.evaluate(ev, case=None, action=None, match_type="NONE", match_key=None)

    assert result.reconciliation_status == ReconciliationStatus.UNKNOWN
    assert result.case_id is None


def test_correlation_engine_subscription_id_and_payment_id(uow: UnitOfWork):
    correlation = CorrelationEngine()
    case_id = "case_corr_test_01"
    with uow:
        m = Merchant(id="m_corr", name="Corr Merchant", razorpay_account_id="acc_corr")
        c = Customer(id="c_corr", merchant_id=m.id, razorpay_customer_id="cust_corr")
        s = Subscription(id="s_corr", merchant_id=m.id, customer_id=c.id, razorpay_subscription_id="sub_corr_01", status="halted", plan_id="p_1")
        case = RecoveryCase(
            id=case_id,
            merchant_id=m.id,
            subscription_id=s.id,
            invoice_id="inv_corr_01",
            payment_id="pay_corr_01",
            amount_inr=Decimal("1000.00"),
            currency="INR",
            stage="HALTED_RECOVERY",
            state="DETECTED",
        )
        uow.merchants.add(m)
        uow.customers.add(c)
        uow.subscriptions.add(s)
        uow.cases.add(case)
        uow.commit()

    with uow:
        # Correlate by subscription ID
        ev_sub = ReconciliationEvidence(
            evidence_id="ev_sub_01",
            event_type="SUBSCRIPTION_CHARGED",
            provider="razorpay",
            entity_type="subscription",
            entity_id="sub_corr_01",
            subscription_id="sub_corr_01",
        )
        c_sub, _, m_type, m_key = correlation.correlate(ev_sub, uow)
        assert c_sub is not None
        assert m_type == "SUBSCRIPTION_ID"
        assert m_key == "sub_corr_01"

        # Correlate by payment ID
        ev_pay = ReconciliationEvidence(
            evidence_id="ev_pay_01",
            event_type="PAYMENT_CAPTURED",
            provider="razorpay",
            entity_type="payment",
            entity_id="pay_corr_01",
            payment_id="pay_corr_01",
        )
        c_pay, _, m_type_pay, m_key_pay = correlation.correlate(ev_pay, uow)
        assert c_pay is not None
        assert m_type_pay == "PAYMENT_ID"
        assert m_key_pay == "pay_corr_01"
