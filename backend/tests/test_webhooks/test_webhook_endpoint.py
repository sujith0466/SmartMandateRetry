"""Inbound Razorpay webhook API endpoint integration tests."""

import time
from flask.testing import FlaskClient
import pytest
from sqlalchemy.orm import Session

from app.core.config import get_settings
from app.domain.models import WebhookEvent
from app.infrastructure.webhook_simulator import RazorpayWebhookSimulator


@pytest.fixture
def simulator() -> RazorpayWebhookSimulator:
    settings = get_settings()
    return RazorpayWebhookSimulator(settings.RAZORPAY_WEBHOOK_SECRET)


def test_webhook_missing_signature(client: FlaskClient):
    response = client.post(
        "/api/v1/webhooks/razorpay",
        data=b'{"event":"payment.failed"}',
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 400
    assert response.get_json()["error"] == "MISSING_SIGNATURE"


def test_webhook_invalid_signature(client: FlaskClient):
    response = client.post(
        "/api/v1/webhooks/razorpay",
        data=b'{"event":"payment.failed"}',
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": "invalid_signature_hex_12345"
        }
    )
    assert response.status_code == 400
    assert response.get_json()["error"] == "INVALID_SIGNATURE"


def test_webhook_malformed_json(client: FlaskClient, simulator: RazorpayWebhookSimulator):
    malformed_raw = b'{"event": "payment.failed", "broken_json": '
    sig = simulator.verifier.compute_signature(malformed_raw)

    response = client.post(
        "/api/v1/webhooks/razorpay",
        data=malformed_raw,
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": sig
        }
    )
    assert response.status_code == 400
    assert response.get_json()["error"] == "MALFORMED_JSON"


def test_webhook_oversized_payload(client: FlaskClient, simulator: RazorpayWebhookSimulator):
    oversized_data = b"x" * (1024 * 1024 + 100)  # > 1MB
    sig = simulator.verifier.compute_signature(oversized_data)

    response = client.post(
        "/api/v1/webhooks/razorpay",
        data=oversized_data,
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": sig
        }
    )
    assert response.status_code == 413
    assert response.get_json()["error"] == "PAYLOAD_TOO_LARGE"


def test_webhook_valid_event_ingestion(client: FlaskClient, simulator: RazorpayWebhookSimulator, db_session: Session):
    unique_ts = int(time.time() * 1000)
    payload = simulator.create_payment_failed_payload(
        payment_id=f"pay_int_{unique_ts}",
        invoice_id=f"inv_int_{unique_ts}",
        error_reason="insufficient_funds"
    )
    raw_bytes, sig = simulator.sign_payload(payload)

    response = client.post(
        "/api/v1/webhooks/razorpay",
        data=raw_bytes,
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": sig,
            "X-Correlation-ID": "corr_test_ingest_01"
        }
    )
    assert response.status_code == 200
    res_data = response.get_json()
    assert res_data["status"] == "received"
    assert res_data["event_type"] == "payment.failed"
    assert res_data["routing"] == "ROUTED"

    # Verify event record in database
    event_record = db_session.query(WebhookEvent).filter_by(event_id=res_data["event_id"]).first()
    assert event_record is not None
    assert event_record.signature_verified is True
    assert event_record.processed is True


def test_webhook_idempotent_duplicate_handling(client: FlaskClient, simulator: RazorpayWebhookSimulator, db_session: Session):
    unique_ts = int(time.time() * 1000)
    payload = simulator.create_subscription_halted_payload(subscription_id=f"sub_idemp_{unique_ts}")
    raw_bytes, sig = simulator.sign_payload(payload)

    # First delivery
    res_1 = client.post(
        "/api/v1/webhooks/razorpay",
        data=raw_bytes,
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": sig
        }
    )
    assert res_1.status_code == 200
    assert res_1.get_json()["status"] == "received"
    event_id = res_1.get_json()["event_id"]

    # Duplicate delivery (same payload & signature)
    res_2 = client.post(
        "/api/v1/webhooks/razorpay",
        data=raw_bytes,
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": sig
        }
    )
    assert res_2.status_code == 200
    assert res_2.get_json()["status"] == "duplicate_ignored"

    # Exactly 1 row in database
    count = db_session.query(WebhookEvent).filter_by(event_id=event_id).count()
    assert count == 1


def test_webhook_ignored_lifecycle_event(client: FlaskClient, simulator: RazorpayWebhookSimulator):
    unique_ts = int(time.time() * 1000)
    payload = {
        "entity": "event",
        "account_id": "acc_rzp_demo_merchant_001",
        "event": "subscription.activated",
        "contains": ["subscription"],
        "payload": {
            "subscription": {
                "entity": {
                    "id": f"sub_act_{unique_ts}",
                    "plan_id": "plan_basic",
                    "status": "active"
                }
            }
        },
        "created_at": int(time.time())
    }
    raw_bytes, sig = simulator.sign_payload(payload)

    response = client.post(
        "/api/v1/webhooks/razorpay",
        data=raw_bytes,
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": sig
        }
    )
    assert response.status_code == 200
    assert response.get_json()["routing"] == "IGNORED"


def test_webhook_unsupported_non_mandate_event(client: FlaskClient, simulator: RazorpayWebhookSimulator):
    unique_ts = int(time.time() * 1000)
    payload = {
        "entity": "event",
        "account_id": "acc_rzp_demo_merchant_001",
        "event": "transfer.processed",
        "contains": ["transfer"],
        "payload": {
            "transfer": {
                "entity": {
                    "id": f"trf_{unique_ts}",
                    "amount": 50000
                }
            }
        },
        "created_at": int(time.time())
    }
    raw_bytes, sig = simulator.sign_payload(payload)

    response = client.post(
        "/api/v1/webhooks/razorpay",
        data=raw_bytes,
        headers={
            "Content-Type": "application/json",
            "X-Razorpay-Signature": sig
        }
    )
    assert response.status_code == 200
    assert response.get_json()["routing"] == "UNSUPPORTED"
