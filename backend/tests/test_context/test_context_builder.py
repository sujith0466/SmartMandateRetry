"""Unit tests for CustomerContextBuilder and DataQualityEvaluator."""

from datetime import datetime, timezone
from decimal import Decimal
import pytest
from unittest.mock import MagicMock

from app.domain.context_builder import CustomerContextBuilder, DataQualityEvaluator
from app.domain.failure_assessment import FailureAssessment
from app.domain.failure_taxonomy import FailureCategory, Recoverability, Severity
from app.domain.models import Customer, RecoveryCase, Subscription
from app.infrastructure.razorpay_client import RazorpayClient


@pytest.fixture
def sample_failure_assessment() -> FailureAssessment:
    return FailureAssessment(
        assessment_id="ass_test_001",
        provider="razorpay",
        payment_id="pay_test_001",
        subscription_id="sub_test_001",
        invoice_id="inv_test_001",
        failure_category=FailureCategory.TEMPORARY_LIQUIDITY,
        failure_code="INSUFFICIENT_FUNDS",
        raw_error_reason="insufficient_funds",
        raw_error_code="BAD_REQUEST_ERROR",
        recoverability=Recoverability.RECOVERABLE,
        severity=Severity.LOW,
        confidence=Decimal("1.00"),
        evidence={"matched_rule": "EXACT_REASON_INSUFFICIENT_FUNDS"},
        is_hard_decline=False,
    )


def test_customer_context_builder_complete(sample_failure_assessment):
    now = datetime(2026, 8, 26, 12, 0, 0, tzinfo=timezone.utc)
    cust = Customer(
        id="c_b_01",
        merchant_id="m_1",
        razorpay_customer_id="cust_b_01",
        email="alex.smith@example.com",
        contact="+919876543210",
        tenure_months=6,
        historical_success_rate=Decimal("0.95")
    )
    sub = Subscription(
        id="s_b_01",
        merchant_id="m_1",
        customer_id=cust.id,
        razorpay_subscription_id="sub_b_01",
        status="halted",
        plan_id="plan_monthly",
        current_cycle=6,
        created_at=now,
    )
    case = RecoveryCase(
        id="case_b_01",
        merchant_id="m_1",
        subscription_id=sub.id,
        invoice_id="inv_b_01",
        amount_inr=Decimal("1999.00"),
        currency="INR",
        stage="HALTED_RECOVERY",
        state="DETECTED",
        created_at=now,
    )

    builder = CustomerContextBuilder()
    context = builder.build_context(
        case=case,
        customer=cust,
        subscription=sub,
        all_subscription_cases=[case],
        failure_assessment=sample_failure_assessment,
        now=now,
    )

    assert context.case.case_id == "case_b_01"
    assert context.case.amount_inr == Decimal("1999.00")
    assert context.subscription.subscription_id == "sub_b_01"
    assert context.customer.masked_email == "a***h@example.com"
    assert context.customer.masked_contact == "+91******3210"
    assert context.failure_assessment.failure_code == "INSUFFICIENT_FUNDS"
    assert context.quality.completeness_score == Decimal("1.00")
    assert context.quality.context_version == "1.0.0"

    # Verify dictionary serialization
    as_dict = context.to_dict()
    assert as_dict["case"]["case_id"] == "case_b_01"
    assert as_dict["customer"]["masked_email"] == "a***h@example.com"
    assert "quality" in as_dict


def test_customer_context_builder_api_enrichment_success(sample_failure_assessment):
    mock_rzp = MagicMock(spec=RazorpayClient)
    mock_rzp.fetch_subscription.return_value = {"id": "sub_b_01", "status": "halted"}

    cust = Customer(id="c_1", merchant_id="m_1", razorpay_customer_id="cust_01")
    sub = Subscription(id="s_1", merchant_id="m_1", customer_id="c_1", razorpay_subscription_id="sub_b_01", status="halted", plan_id="p_1")
    case = RecoveryCase(id="case_1", merchant_id="m_1", subscription_id="s_1", invoice_id="inv_1", amount_inr=Decimal("500.00"), stage="HALTED_RECOVERY", state="DETECTED")

    builder = CustomerContextBuilder(razorpay_client=mock_rzp)
    context = builder.build_context(
        case=case,
        customer=cust,
        subscription=sub,
        all_subscription_cases=[case],
        failure_assessment=sample_failure_assessment,
    )

    assert context.quality.is_enriched_via_api is True


def test_customer_context_builder_api_enrichment_fallback_on_error(sample_failure_assessment):
    mock_rzp = MagicMock(spec=RazorpayClient)
    mock_rzp.fetch_subscription.side_effect = Exception("Gateway Timeout")

    cust = Customer(id="c_1", merchant_id="m_1", razorpay_customer_id="cust_01")
    sub = Subscription(id="s_1", merchant_id="m_1", customer_id="c_1", razorpay_subscription_id="sub_b_01", status="halted", plan_id="p_1")
    case = RecoveryCase(id="case_1", merchant_id="m_1", subscription_id="s_1", invoice_id="inv_1", amount_inr=Decimal("500.00"), stage="HALTED_RECOVERY", state="DETECTED")

    builder = CustomerContextBuilder(razorpay_client=mock_rzp)
    context = builder.build_context(
        case=case,
        customer=cust,
        subscription=sub,
        all_subscription_cases=[case],
        failure_assessment=sample_failure_assessment,
    )

    # Gracefully completes without error; marks is_enriched_via_api as False
    assert context.quality.is_enriched_via_api is False
