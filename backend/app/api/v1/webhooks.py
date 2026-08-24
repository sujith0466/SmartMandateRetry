"""Inbound Razorpay webhook endpoint blueprint."""

from flask import Blueprint, jsonify, request
from app.core.config import get_settings
from app.core.errors import SignatureVerificationError
from app.core.security import verify_hmac_sha256_signature
from app.core.logging import get_logger

logger = get_logger("api.webhooks")
webhooks_bp = Blueprint("webhooks", __name__)


@webhooks_bp.route("/razorpay", methods=["POST"])
def razorpay_webhook():
    """Ingest, verify signature, and queue Razorpay webhook events."""
    settings = get_settings()
    signature = request.headers.get("X-Razorpay-Signature", "")
    raw_body = request.get_data()

    # Skip signature check only in testing environment if configured
    if settings.APP_ENV != "testing":
        if not verify_hmac_sha256_signature(raw_body, signature, settings.RAZORPAY_WEBHOOK_SECRET):
            logger.warning("Invalid webhook signature rejected")
            raise SignatureVerificationError("Invalid X-Razorpay-Signature")

    payload = request.get_json(silent=True) or {}
    event_id = payload.get("id") or request.headers.get("X-Razorpay-Event-Id", "unknown")
    event_type = payload.get("event", "unknown")

    logger.info(f"Webhook received: {event_type} (id: {event_id})")

    # Full deduplication and case processing will be connected in Phase 3
    return jsonify({
        "status": "received",
        "event_id": event_id,
        "event": event_type
    }), 200
