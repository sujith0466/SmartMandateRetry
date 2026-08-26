"""Unit tests for HistoryAggregator."""

from datetime import datetime, timezone, timedelta
from decimal import Decimal
import pytest

from app.domain.history_aggregator import HistoryAggregator
from app.domain.models import Customer, RecoveryCase, RecoveryDecision, Subscription


def test_payment_history_new_customer():
    now = datetime(2026, 8, 26, 12, 0, 0, tzinfo=timezone.utc)
    cust = Customer(id="c_1", merchant_id="m_1", razorpay_customer_id="cust_001", tenure_months=0)
    sub = Subscription(id="s_1", merchant_id="m_1", customer_id="c_1", razorpay_subscription_id="sub_001", status="halted", plan_id="p_1", current_cycle=1)

    pmt = HistoryAggregator.aggregate_payment_history(customer=cust, subscription=sub, prior_cases=[], now=now)
    assert pmt.total_attempts == 1
    assert pmt.failed_payments == 1
    assert pmt.successful_payments == 0
    assert pmt.consecutive_failures == 1
    assert pmt.recent_failures_30d == 1
    assert pmt.data_confidence == "LOW"


def test_payment_history_established_customer():
    now = datetime(2026, 8, 26, 12, 0, 0, tzinfo=timezone.utc)
    cust = Customer(id="c_2", merchant_id="m_1", razorpay_customer_id="cust_002", tenure_months=12)
    sub = Subscription(id="s_2", merchant_id="m_1", customer_id="c_2", razorpay_subscription_id="sub_002", status="halted", plan_id="p_1", current_cycle=10)

    # 1 prior failure 60 days ago
    prior_case = RecoveryCase(
        id="case_old",
        merchant_id="m_1",
        subscription_id="s_2",
        invoice_id="inv_old",
        amount_inr=Decimal("1000.00"),
        stage="HALTED_RECOVERY",
        state="RECOVERED",
        created_at=now - timedelta(days=60),
    )

    pmt = HistoryAggregator.aggregate_payment_history(customer=cust, subscription=sub, prior_cases=[prior_case], now=now)
    assert pmt.total_attempts == 10
    assert pmt.failed_payments == 2  # prior + current
    assert pmt.successful_payments == 8
    assert pmt.recent_failures_30d == 1  # only current failure in last 30d
    assert pmt.data_confidence == "HIGH"


def test_recovery_history_aggregations():
    now = datetime(2026, 8, 26, 12, 0, 0, tzinfo=timezone.utc)
    current_case_id = "case_curr"

    case1 = RecoveryCase(
        id="case_1",
        merchant_id="m_1",
        subscription_id="s_1",
        invoice_id="inv_1",
        amount_inr=Decimal("1000.00"),
        stage="HALTED_RECOVERY",
        state="RECOVERED",
        created_at=now - timedelta(days=40),
        resolved_at=now - timedelta(days=38),
    )
    dec1 = RecoveryDecision(
        id="dec_1",
        recovery_case_id="case_1",
        recommended_action="PAYMENT_LINK_RECOVERY",
        confidence=Decimal("0.90"),
        reasoning="Recovered via link",
    )
    case1.decisions = [dec1]

    case_curr = RecoveryCase(
        id=current_case_id,
        merchant_id="m_1",
        subscription_id="s_1",
        invoice_id="inv_curr",
        amount_inr=Decimal("1000.00"),
        stage="HALTED_RECOVERY",
        state="DETECTED",
        created_at=now,
    )

    rec = HistoryAggregator.aggregate_recovery_history(
        current_case_id=current_case_id,
        all_subscription_cases=[case1, case_curr]
    )

    assert rec.prior_recovery_cases == 1
    assert rec.prior_successful_recoveries == 1
    assert rec.prior_failed_recoveries == 0
    assert rec.recovery_success_rate == Decimal("1.00")
    assert rec.last_recovery_strategy == "PAYMENT_LINK_RECOVERY"
    assert rec.last_recovery_at is not None
