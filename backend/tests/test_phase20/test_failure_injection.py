"""Phase 20: Controlled Failure Injection and Resiliency Tests."""

from datetime import datetime, timezone
from decimal import Decimal
import json
import time
import uuid
import pytest
from flask.testing import FlaskClient

from app.core.config import get_settings
from app.domain.models import Customer, Merchant, RecoveryAction, RecoveryCase, Subscription
from app.domain.normalized_event import NormalizedWebhookEvent
from app.domain.reconciliation_schemas import PaymentOutcome, ReconciliationStatus
from app.infrastructure.repositories.unit_of_work import UnitOfWork
from app.infrastructure.webhook_simulator import RazorpayWebhookSimulator
from app.services.reconciliation_service import ReconciliationService


@pytest.fixture
def simulator() -> RazorpayWebhookSimulator:
    settings = get_settings()
    return RazorpayWebhookSimulator(settings.RAZORPAY_WEBHOOK_SECRET)


class TestFailureInjection:
    def test_unmatched_reconciliation_event_handled_safely(self, uow: UnitOfWork):
        """Test that reconciliation of an unknown entity returns safely without crashing."""
        service = ReconciliationService(uow=uow)
        event = NormalizedWebhookEvent(
            provider="razorpay",
            event_id=f"evt_unknown_{uuid.uuid4().hex[:6]}",
            event_type="payment.captured",
            occurred_at=datetime.now(timezone.utc),
            merchant_account_id="acc_non_existent",
            entity_type="payment",
            entity_id="pay_non_existent_999",
            subscription_id="sub_non_existent",
            invoice_id=None,
            amount_inr=Decimal("2000.00"),
            currency="INR",
            error_metadata={},
            raw_payload={},
        )
        result = service.reconcile_normalized_event(event, correlation_id="corr_unmatched_01")
        assert result.reconciliation_status in (ReconciliationStatus.UNKNOWN, ReconciliationStatus.FAILED, ReconciliationStatus.MISMATCH)
        assert result.payment_outcome == PaymentOutcome.PAYMENT_SUCCEEDED

    def test_duplicate_webhook_event_idempotency(self, client: FlaskClient, simulator: RazorpayWebhookSimulator):
        """Test that ingesting the same webhook twice returns 200 with duplicate_ignored status."""
        unique_ts = int(time.time() * 1000)
        payload = simulator.create_payment_failed_payload(
            payment_id=f"pay_dup_{unique_ts}",
            invoice_id=f"inv_dup_{unique_ts}",
            error_reason="insufficient_funds",
        )
        raw_body = json.dumps(payload).encode("utf-8")
        sig = simulator.verifier.compute_signature(raw_body)
        headers = {"Content-Type": "application/json", "X-Razorpay-Signature": sig}

        # 1st ingestion -> 200 OK (received)
        resp1 = client.post("/api/v1/webhooks/razorpay", data=raw_body, headers=headers)
        assert resp1.status_code == 200
        assert resp1.get_json()["status"] == "received"

        # 2nd ingestion (exact duplicate payload) -> 200 OK (duplicate_ignored)
        resp2 = client.post("/api/v1/webhooks/razorpay", data=raw_body, headers=headers)
        assert resp2.status_code == 200
        assert resp2.get_json()["status"] == "duplicate_ignored"

    def test_malformed_json_webhook_rejected(self, client: FlaskClient, simulator: RazorpayWebhookSimulator):
        """Test that syntactically broken webhook payloads are rejected cleanly with HTTP 400."""
        malformed = b'{"event": "payment.failed", "payload": {'
        sig = simulator.verifier.compute_signature(malformed)
        headers = {"Content-Type": "application/json", "X-Razorpay-Signature": sig}

        resp = client.post("/api/v1/webhooks/razorpay", data=malformed, headers=headers)
        assert resp.status_code == 400
        assert resp.get_json()["error"] == "MALFORMED_JSON"
