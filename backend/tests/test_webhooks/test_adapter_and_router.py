"""Webhook normalization adapter and ingress router unit tests."""

from decimal import Decimal
import pytest
from app.domain.webhook_schemas import RazorpayWebhookEnvelope
from app.infrastructure.razorpay_adapter import RazorpayWebhookAdapter
from app.infrastructure.webhook_simulator import RazorpayWebhookSimulator
from app.services.event_router import IngressEventRouter


def test_adapter_normalizes_payment_failed():
    sim = RazorpayWebhookSimulator("test_sec")
    payload = sim.create_payment_failed_payload(
        payment_id="pay_test_001",
        amount_paise=249900,
        invoice_id="inv_test_001",
        error_code="BAD_REQUEST_ERROR",
        error_reason="insufficient_funds"
    )
    envelope = RazorpayWebhookEnvelope.model_validate(payload)
    normalized = RazorpayWebhookAdapter.normalize(envelope)

    assert normalized.provider == "razorpay"
    assert normalized.event_type == "PAYMENT_FAILED"
    assert normalized.entity_id == "pay_test_001"
    assert normalized.invoice_id == "inv_test_001"
    assert normalized.amount_inr == Decimal("2499.00")
    assert normalized.currency == "INR"
    assert normalized.error_metadata["error_reason"] == "insufficient_funds"


def test_adapter_normalizes_subscription_halted():
    sim = RazorpayWebhookSimulator("test_sec")
    payload = sim.create_subscription_halted_payload(subscription_id="sub_test_halted_001")
    envelope = RazorpayWebhookEnvelope.model_validate(payload)
    normalized = RazorpayWebhookAdapter.normalize(envelope)

    assert normalized.event_type == "SUBSCRIPTION_HALTED"
    assert normalized.entity_type == "subscription"
    assert normalized.subscription_id == "sub_test_halted_001"


def test_ingress_router_dispatches_proper_queues():
    router = IngressEventRouter()
    sim = RazorpayWebhookSimulator("test_sec")

    # 1. Stage 1
    pending_payload = sim.create_subscription_pending_payload(subscription_id="sub_p_01")
    pending_norm = RazorpayWebhookAdapter.normalize(RazorpayWebhookEnvelope.model_validate(pending_payload))
    res_1 = router.route(pending_norm)
    assert res_1.status == "ROUTED"
    assert res_1.target_queue == "stage_1_observation"

    # 2. Stage 2
    halted_payload = sim.create_subscription_halted_payload(subscription_id="sub_h_01")
    halted_norm = RazorpayWebhookAdapter.normalize(RazorpayWebhookEnvelope.model_validate(halted_payload))
    res_2 = router.route(halted_norm)
    assert res_2.status == "ROUTED"
    assert res_2.target_queue == "stage_2_recovery"

    # 3. Failure Intelligence
    fail_payload = sim.create_payment_failed_payload(payment_id="pay_f_01")
    fail_norm = RazorpayWebhookAdapter.normalize(RazorpayWebhookEnvelope.model_validate(fail_payload))
    res_3 = router.route(fail_norm)
    assert res_3.status == "ROUTED"
    assert res_3.target_queue == "failure_intelligence"

    # 4. Outcome Verification
    cap_payload = sim.create_payment_captured_payload(payment_id="pay_c_01")
    cap_norm = RazorpayWebhookAdapter.normalize(RazorpayWebhookEnvelope.model_validate(cap_payload))
    res_4 = router.route(cap_norm)
    assert res_4.status == "ROUTED"
    assert res_4.target_queue == "outcome_verification"
