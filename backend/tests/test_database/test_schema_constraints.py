"""Database schema, unique, and CHECK constraints tests."""

from decimal import Decimal
import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.domain.models import (
    Customer, Merchant, RecoveryAction, RecoveryCase,
    RecoveryDecision, RecoveryPolicy, Subscription, WebhookEvent
)


def test_merchant_unique_razorpay_account(db_session: Session):
    m1 = Merchant(id="m_uniq_1", name="Merchant A", razorpay_account_id="acc_uniq_1")
    m2 = Merchant(id="m_uniq_2", name="Merchant B", razorpay_account_id="acc_uniq_1")
    db_session.add(m1)
    db_session.flush()

    db_session.add(m2)
    with pytest.raises(IntegrityError):
        db_session.flush()


def test_policy_check_constraints(db_session: Session):
    m = Merchant(id="m_pol_chk", name="Merchant Check", razorpay_account_id="acc_pol_chk")
    db_session.add(m)
    db_session.flush()

    # Invalid max_retries > 10
    p_invalid = RecoveryPolicy(
        id="pol_invalid",
        merchant_id=m.id,
        max_retries_per_case=15,
        min_retry_interval_hours=24,
    )
    db_session.add(p_invalid)
    with pytest.raises(IntegrityError):
        db_session.flush()


def test_customer_merchant_uniqueness(db_session: Session):
    m = Merchant(id="m_cust_chk", name="Merchant Cust", razorpay_account_id="acc_cust_chk")
    db_session.add(m)
    db_session.flush()

    c1 = Customer(id="c1", merchant_id=m.id, razorpay_customer_id="rzp_c_1")
    c2 = Customer(id="c2", merchant_id=m.id, razorpay_customer_id="rzp_c_1")
    db_session.add(c1)
    db_session.flush()

    db_session.add(c2)
    with pytest.raises(IntegrityError):
        db_session.flush()


def test_recovery_case_invoice_uniqueness(db_session: Session):
    m = Merchant(id="m_case_chk", name="Merchant Case", razorpay_account_id="acc_case_chk")
    c = Customer(id="c_case_chk", merchant_id=m.id, razorpay_customer_id="rzp_case_chk")
    db_session.add_all([m, c])
    db_session.flush()

    s = Subscription(
        id="s_case_chk",
        merchant_id=m.id,
        customer_id=c.id,
        razorpay_subscription_id="sub_case_chk",
        status="halted",
        plan_id="plan_1",
    )
    db_session.add(s)
    db_session.flush()

    case_1 = RecoveryCase(
        id="case_inv_1",
        merchant_id=m.id,
        subscription_id=s.id,
        invoice_id="inv_duplicate_001",
        amount_inr=Decimal("1000.00"),
        stage="HALTED_RECOVERY",
        state="DETECTED",
    )
    case_2 = RecoveryCase(
        id="case_inv_2",
        merchant_id=m.id,
        subscription_id=s.id,
        invoice_id="inv_duplicate_001",
        amount_inr=Decimal("1000.00"),
        stage="HALTED_RECOVERY",
        state="DETECTED",
    )
    db_session.add(case_1)
    db_session.flush()

    db_session.add(case_2)
    with pytest.raises(IntegrityError):
        db_session.flush()


def test_action_idempotency_key_uniqueness(db_session: Session):
    m = Merchant(id="m_act_chk", name="Merchant Act", razorpay_account_id="acc_act_chk")
    c = Customer(id="c_act_chk", merchant_id=m.id, razorpay_customer_id="rzp_act_chk")
    db_session.add_all([m, c])
    db_session.flush()

    s = Subscription(
        id="s_act_chk",
        merchant_id=m.id,
        customer_id=c.id,
        razorpay_subscription_id="sub_act_chk",
        status="halted",
        plan_id="plan_1",
    )
    case = RecoveryCase(
        id="case_act_chk",
        merchant_id=m.id,
        subscription_id=s.id,
        invoice_id="inv_act_chk",
        amount_inr=Decimal("1000.00"),
        stage="HALTED_RECOVERY",
        state="ACTION_PENDING",
    )
    db_session.add_all([s, case])
    db_session.flush()

    act_1 = RecoveryAction(
        id="act_1",
        recovery_case_id=case.id,
        action_type="PAYMENT_LINK_RECOVERY",
        idempotency_key="idemp_unique_key_001",
        status="EXECUTED",
    )
    act_2 = RecoveryAction(
        id="act_2",
        recovery_case_id=case.id,
        action_type="PAYMENT_LINK_RECOVERY",
        idempotency_key="idemp_unique_key_001",
        status="EXECUTED",
    )
    db_session.add(act_1)
    db_session.flush()

    db_session.add(act_2)
    with pytest.raises(IntegrityError):
        db_session.flush()
