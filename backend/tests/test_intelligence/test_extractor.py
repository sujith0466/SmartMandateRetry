"""Unit tests for FailureEvidenceExtractor."""

from datetime import datetime, timezone
from decimal import Decimal
import pytest

from app.domain.failure_extractor import FailureEvidenceExtractor
from app.domain.normalized_event import NormalizedWebhookEvent


def test_extractor_full_metadata():
    event = NormalizedWebhookEvent(
        provider="razorpay",
        event_id="evt_123",
        event_type="PAYMENT_FAILED",
        occurred_at=datetime.now(timezone.utc),
        merchant_account_id="acc_001",
        entity_type="payment",
        entity_id="pay_123",
        subscription_id="sub_123",
        invoice_id="inv_123",
        amount_inr=Decimal("1500.00"),
        currency="INR",
        error_metadata={
            "error_code": "BAD_REQUEST_ERROR",
            "error_description": "The card has insufficient funds",
            "error_source": "customer",
            "error_step": "payment_authorization",
            "error_reason": "insufficient_funds",
        },
        raw_payload={
            "payment": {
                "entity": {
                    "id": "pay_123",
                    "method": "card",
                }
            }
        }
    )

    evidence = FailureEvidenceExtractor.extract(event)
    assert evidence.provider == "razorpay"
    assert evidence.payment_id == "pay_123"
    assert evidence.subscription_id == "sub_123"
    assert evidence.invoice_id == "inv_123"
    assert evidence.error_code == "BAD_REQUEST_ERROR"
    assert evidence.error_reason == "insufficient_funds"
    assert evidence.error_source == "customer"
    assert evidence.error_step == "payment_authorization"
    assert evidence.payment_method == "card"


def test_extractor_missing_and_null_fields():
    event = NormalizedWebhookEvent(
        provider="razorpay",
        event_id="evt_empty",
        event_type="PAYMENT_FAILED",
        occurred_at=datetime.now(timezone.utc),
        merchant_account_id="acc_001",
        entity_type="payment",
        entity_id="pay_empty",
        subscription_id=None,
        invoice_id=None,
        amount_inr=None,
        currency="INR",
        error_metadata={},
        raw_payload={}
    )

    evidence = FailureEvidenceExtractor.extract(event)
    assert evidence.error_code is None
    assert evidence.error_reason is None
    assert evidence.error_description is None
    assert evidence.error_source is None
    assert evidence.error_step is None
    assert evidence.payment_method is None
