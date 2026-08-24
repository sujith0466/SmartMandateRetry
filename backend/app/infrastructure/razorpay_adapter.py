"""Razorpay webhook payload normalization adapter."""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, Optional

from app.domain.normalized_event import NormalizedWebhookEvent
from app.domain.webhook_schemas import RazorpayWebhookEnvelope


class RazorpayWebhookAdapter:
    """Adapter translating Razorpay webhook payloads into provider-neutral events."""

    @staticmethod
    def normalize(envelope: RazorpayWebhookEnvelope) -> NormalizedWebhookEvent:
        event_name = envelope.event
        payload = envelope.payload
        occurred_at = datetime.fromtimestamp(envelope.created_at, tz=timezone.utc)
        merchant_account_id = envelope.account_id

        # Determine composite / primary entity
        entity_type = "unknown"
        entity_id = ""
        subscription_id: Optional[str] = None
        invoice_id: Optional[str] = None
        amount_inr: Optional[Decimal] = None
        currency: str = "INR"
        error_metadata: Dict[str, Any] = {}

        if "payment" in payload and payload["payment"].get("entity"):
            p_entity = payload["payment"]["entity"]
            entity_type = "payment"
            entity_id = p_entity.get("id", "")
            invoice_id = p_entity.get("invoice_id")
            currency = p_entity.get("currency", "INR")
            if p_entity.get("amount") is not None:
                amount_inr = Decimal(p_entity["amount"]) / Decimal(100)

            # Extract error details if present
            if event_name == "payment.failed" or p_entity.get("error_code"):
                error_metadata = {
                    "error_code": p_entity.get("error_code"),
                    "error_description": p_entity.get("error_description"),
                    "error_source": p_entity.get("error_source"),
                    "error_step": p_entity.get("error_step"),
                    "error_reason": p_entity.get("error_reason"),
                }

        if "subscription" in payload and payload["subscription"].get("entity"):
            s_entity = payload["subscription"]["entity"]
            subscription_id = s_entity.get("id")
            if not entity_id:
                entity_type = "subscription"
                entity_id = subscription_id or ""

        if "payment_link" in payload and payload["payment_link"].get("entity"):
            pl_entity = payload["payment_link"]["entity"]
            entity_type = "payment_link"
            entity_id = pl_entity.get("id", "")
            if pl_entity.get("amount_paid") is not None:
                amount_inr = Decimal(pl_entity["amount_paid"]) / Decimal(100)
            elif pl_entity.get("amount") is not None:
                amount_inr = Decimal(pl_entity["amount"]) / Decimal(100)
            currency = pl_entity.get("currency", "INR")

        # Map event type to standard normalized enum string
        event_type_map = {
            "subscription.pending": "SUBSCRIPTION_PENDING",
            "subscription.halted": "SUBSCRIPTION_HALTED",
            "subscription.charged": "SUBSCRIPTION_CHARGED",
            "payment.failed": "PAYMENT_FAILED",
            "payment.captured": "PAYMENT_CAPTURED",
            "payment_link.paid": "PAYMENT_LINK_PAID",
            "subscription.authenticated": "SUBSCRIPTION_AUTHENTICATED",
            "subscription.activated": "SUBSCRIPTION_ACTIVATED",
            "subscription.paused": "SUBSCRIPTION_PAUSED",
            "subscription.resumed": "SUBSCRIPTION_RESUMED",
            "invoice.paid": "INVOICE_PAID",
            "order.paid": "ORDER_PAID",
        }
        normalized_event_type = event_type_map.get(event_name, event_name.upper().replace(".", "_"))

        # Unique event_id: Razorpay does not always supply top-level event id; use combination or entity ID
        event_id = f"evt_{envelope.event}_{entity_id}_{envelope.created_at}"

        return NormalizedWebhookEvent(
            provider="razorpay",
            event_id=event_id,
            event_type=normalized_event_type,
            occurred_at=occurred_at,
            merchant_account_id=merchant_account_id,
            entity_type=entity_type,
            entity_id=entity_id,
            subscription_id=subscription_id,
            invoice_id=invoice_id,
            amount_inr=amount_inr,
            currency=currency,
            error_metadata=error_metadata,
            raw_payload=payload,
        )
