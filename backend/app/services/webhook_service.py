"""Inbound webhook ingestion service."""

import json
from typing import Any, Dict, Optional, Tuple

from pydantic import ValidationError

from app.core.config import get_settings
from app.core.errors import AppError, SignatureVerificationError
from app.core.logging import get_logger
from app.domain.webhook_schemas import RazorpayWebhookEnvelope
from app.infrastructure.database import get_session
from app.infrastructure.razorpay_adapter import RazorpayWebhookAdapter
from app.infrastructure.repositories.unit_of_work import UnitOfWork
from app.infrastructure.webhook_verifier import RazorpaySignatureVerifier
from app.services.event_router import IngressEventRouter, IngressRoutingResult

logger = get_logger("smartmandate.webhook_service")


class WebhookIngestionService:
    """Orchestrates signature verification, idempotency persistence, normalization, and routing."""

    def __init__(
        self,
        verifier: Optional[RazorpaySignatureVerifier] = None,
        router: Optional[IngressEventRouter] = None,
        uow: Optional[UnitOfWork] = None,
    ) -> None:
        settings = get_settings()
        self.verifier = verifier or RazorpaySignatureVerifier(settings.RAZORPAY_WEBHOOK_SECRET)
        self.router = router or IngressEventRouter()
        self.uow = uow or UnitOfWork(get_session)

    def process_webhook(
        self,
        raw_body: bytes,
        signature: Optional[str],
        correlation_id: Optional[str] = None
    ) -> Tuple[Dict[str, Any], int]:
        """
        Process inbound webhook request.
        Returns (response_payload: dict, http_status_code: int).
        """
        # 1. Cryptographic Signature Verification
        if not self.verifier.verify(raw_body, signature):
            logger.warning("Rejecting webhook with invalid or missing signature", correlation_id=correlation_id)
            raise SignatureVerificationError("Invalid or missing X-Razorpay-Signature header")

        # 2. JSON Decoding
        try:
            body_dict = json.loads(raw_body.decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError) as e:
            logger.warning("Rejecting malformed JSON payload", error=str(e), correlation_id=correlation_id)
            return {"error": "MALFORMED_JSON", "message": "Request body must be valid JSON"}, 400

        # 3. Pydantic Envelope Validation
        try:
            envelope = RazorpayWebhookEnvelope.model_validate(body_dict)
        except ValidationError as e:
            logger.warning("Rejecting invalid webhook envelope", errors=e.errors(), correlation_id=correlation_id)
            return {"error": "INVALID_SCHEMA", "details": e.errors()}, 400

        # Determine Unique Event Identifier
        entity_id = ""
        payload = envelope.payload
        if "payment" in payload and payload["payment"].get("entity"):
            entity_id = payload["payment"]["entity"].get("id", "")
        elif "subscription" in payload and payload["subscription"].get("entity"):
            entity_id = payload["subscription"]["entity"].get("id", "")
        elif "payment_link" in payload and payload["payment_link"].get("entity"):
            entity_id = payload["payment_link"]["entity"].get("id", "")

        event_id = f"evt_{envelope.event}_{entity_id}_{envelope.created_at}"

        # 4. Atomic Idempotent Persistence & Routing
        with self.uow:
            webhook_record, created = self.uow.webhook_events.insert_if_not_exists(
                event_id=event_id,
                event_type=envelope.event,
                payload=body_dict,
                signature_verified=True,
            )

            # If duplicate delivery, acknowledge immediately without re-routing
            if not created:
                logger.info(
                    "Duplicate webhook delivery acknowledged idempotently",
                    event_id=event_id,
                    event_type=envelope.event,
                    correlation_id=correlation_id,
                )
                self.uow.commit()
                return {
                    "status": "duplicate_ignored",
                    "event_id": event_id,
                    "message": "Event already persisted and processed"
                }, 200

            # 5. Normalization & Ingress Routing
            normalized_event = RazorpayWebhookAdapter.normalize(envelope)
            routing_result: IngressRoutingResult = self.router.route(normalized_event)

            # 6. Mark Webhook Processed & Commit
            self.uow.webhook_events.mark_processed(event_id)
            self.uow.commit()

            logger.info(
                "Webhook event processed and routed successfully",
                event_id=event_id,
                event_type=envelope.event,
                routing_status=routing_result.status,
                target_queue=routing_result.target_queue,
                correlation_id=correlation_id,
            )

            return {
                "status": "received",
                "event_id": event_id,
                "event_type": envelope.event,
                "routing": routing_result.status,
                "target_queue": routing_result.target_queue,
            }, 200
