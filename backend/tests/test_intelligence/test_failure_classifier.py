"""Unit tests for FailureClassificationEngine."""

from datetime import datetime, timezone
from decimal import Decimal
import pytest

from app.domain.failure_classifier import FailureClassificationEngine
from app.domain.failure_taxonomy import FailureCategory, Recoverability, Severity
from app.domain.normalized_event import NormalizedWebhookEvent


def test_failure_classification_engine_produces_assessment():
    engine = FailureClassificationEngine(version="1.0.0")

    event = NormalizedWebhookEvent(
        provider="razorpay",
        event_id="evt_test_cls_001",
        event_type="PAYMENT_FAILED",
        occurred_at=datetime.now(timezone.utc),
        merchant_account_id="acc_demo_001",
        entity_type="payment",
        entity_id="pay_cls_001",
        subscription_id="sub_cls_001",
        invoice_id="inv_cls_001",
        amount_inr=Decimal("2999.00"),
        currency="INR",
        error_metadata={
            "error_code": "BAD_REQUEST_ERROR",
            "error_description": "The card has expired",
            "error_source": "customer",
            "error_step": "payment_authorization",
            "error_reason": "card_expired",
        },
        raw_payload={}
    )

    assessment = engine.classify(event)
    assert assessment.provider == "razorpay"
    assert assessment.payment_id == "pay_cls_001"
    assert assessment.subscription_id == "sub_cls_001"
    assert assessment.invoice_id == "inv_cls_001"
    assert assessment.failure_category == FailureCategory.ACTION_REQUIRED_INSTRUMENT
    assert assessment.failure_code == "CARD_EXPIRED"
    assert assessment.recoverability == Recoverability.CONDITIONAL
    assert assessment.severity == Severity.MEDIUM
    assert assessment.confidence == Decimal("0.95")
    assert assessment.is_hard_decline is False
    assert assessment.classifier_version == "1.0.0"

    # Verify serialization
    as_dict = assessment.to_dict()
    assert as_dict["failure_category"] == "ACTION_REQUIRED_INSTRUMENT"
    assert as_dict["confidence"] == "0.95"
    assert "evidence" in as_dict
