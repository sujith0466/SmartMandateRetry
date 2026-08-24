"""Inbound Razorpay webhook API endpoint."""

import uuid
from flask import Blueprint, jsonify, request

from app.core.errors import AppError, SignatureVerificationError
from app.core.logging import get_logger
from app.services.webhook_service import WebhookIngestionService

logger = get_logger("smartmandate.api.webhooks")
webhooks_bp = Blueprint("webhooks", __name__, url_prefix="/api/v1/webhooks")

# 1MB maximum payload size limit
MAX_WEBHOOK_SIZE_BYTES = 1024 * 1024


@webhooks_bp.route("/razorpay", methods=["POST"])
def handle_razorpay_webhook():
    """
    Handle inbound Razorpay webhook event notifications.
    Verifies HMAC-SHA256 signature, validates envelope, persists event, and routes.
    """
    correlation_id = request.headers.get("X-Correlation-ID", f"corr_{uuid.uuid4().hex[:12]}")

    # Check content length
    content_length = request.content_length
    if content_length and content_length > MAX_WEBHOOK_SIZE_BYTES:
        logger.warning("Webhook request exceeded 1MB size limit", size=content_length, correlation_id=correlation_id)
        return jsonify({
            "error": "PAYLOAD_TOO_LARGE",
            "message": "Webhook payload must not exceed 1MB",
        }), 413

    # Capture raw unparsed bytes for signature check
    raw_body = request.get_data(cache=True, as_text=False)
    if not raw_body:
        logger.warning("Received empty webhook body", correlation_id=correlation_id)
        return jsonify({
            "error": "EMPTY_PAYLOAD",
            "message": "Request body cannot be empty",
        }), 400

    signature = request.headers.get("X-Razorpay-Signature")
    if not signature:
        logger.warning("Missing X-Razorpay-Signature header", correlation_id=correlation_id)
        return jsonify({
            "error": "MISSING_SIGNATURE",
            "message": "X-Razorpay-Signature header is required",
        }), 400

    service = WebhookIngestionService()
    try:
        response_data, status_code = service.process_webhook(
            raw_body=raw_body,
            signature=signature,
            correlation_id=correlation_id,
        )
        return jsonify(response_data), status_code
    except SignatureVerificationError as e:
        return jsonify({
            "error": "INVALID_SIGNATURE",
            "message": str(e),
        }), 400
    except AppError as e:
        return jsonify({
            "error": e.error_code,
            "message": e.message,
            "details": e.details,
        }), e.status_code
    except Exception as e:
        logger.error("Unhandled exception during webhook processing", error=str(e), correlation_id=correlation_id)
        return jsonify({
            "error": "INTERNAL_SERVER_ERROR",
            "message": "An unexpected error occurred during webhook processing",
        }), 500
