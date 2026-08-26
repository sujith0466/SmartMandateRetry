"""End-to-end integration test: Webhook Ingress -> Failure Intelligence."""

import time
from flask.testing import FlaskClient
import pytest
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.domain.models import AuditEvent, WebhookEvent
from app.infrastructure.webhook_simulator import RazorpayWebhookSimulator


@pytest.fixture
def simulator() -> RazorpayWebhookSimulator:
    settings = get_settings()
    return RazorpayWebhookSimulator(settings.RAZORPAY_WEBHOOK_SECRET)


def test_e2e_payment_failed_webhook_triggers_classification(client: FlaskClient, simulator: RazorpayWebhookSimulator, db_session: Session):
    unique_ts = int(time.time() * 1000)
    payload = simulator.create_payment_failed_payload(
        payment_id=f"pay_e2e_{unique_ts}",
        invoice_id=f"inv_e2e_{unique_ts}",
        error_code="BAD_REQUEST_ERROR",
        error_reason="insufficient_funds",
        account_id="acc_rzp_demo_merchant_001",
    )
    raw_bytes, sig = simulator.sign_payload(payload)

    response = client.post(
        "/api/v1/webhooks/razorpay",
        data=raw_bytes,
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": sig,
            "X-Correlation-ID": f"corr_e2e_{unique_ts}"
        }
    )

    assert response.status_code == 200
    res_json = response.get_json()
    assert res_json["status"] == "received"
    assert res_json["event_type"] == "payment.failed"
    assert res_json["routing"] == "ROUTED"

    # Verify WebhookEvent stored
    wh_event = db_session.query(WebhookEvent).filter_by(event_id=res_json["event_id"]).first()
    assert wh_event is not None
    assert wh_event.processed is True

    # Verify AuditEvent recorded by Failure Intelligence Engine
    audit = db_session.query(AuditEvent).filter_by(correlation_id=f"corr_e2e_{unique_ts}").first()
    assert audit is not None
    assert audit.event_type == "PAYMENT_FAILURE_CLASSIFIED"
    assert audit.actor == "FAILURE_INTELLIGENCE_ENGINE"
    assert audit.payload["failure_category"] == "TEMPORARY_LIQUIDITY"
    assert audit.payload["failure_code"] == "INSUFFICIENT_FUNDS"
    assert audit.payload["confidence"] == "1.00"
