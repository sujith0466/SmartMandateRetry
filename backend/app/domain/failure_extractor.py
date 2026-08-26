"""Extractor for payment failure evidence from normalized webhook events."""

from dataclasses import dataclass
from typing import Any, Dict, Optional
from app.domain.normalized_event import NormalizedWebhookEvent


@dataclass(frozen=True)
class ExtractedFailureEvidence:
    """Sanitized failure evidence extracted from gateway payloads."""
    provider: str
    payment_id: str
    subscription_id: Optional[str]
    invoice_id: Optional[str]
    error_code: Optional[str]
    error_description: Optional[str]
    error_source: Optional[str]
    error_step: Optional[str]
    error_reason: Optional[str]
    payment_method: Optional[str]
    raw_payload_snippet: Dict[str, Any]


class FailureEvidenceExtractor:
    """Extracts and normalizes raw failure evidence safely."""

    @staticmethod
    def extract(event: NormalizedWebhookEvent) -> ExtractedFailureEvidence:
        error_meta = event.error_metadata or {}
        raw_payload = event.raw_payload or {}

        # Look up method from payload payment entity if available
        payment_method: Optional[str] = None
        if "payment" in raw_payload and isinstance(raw_payload["payment"], dict):
            p_entity = raw_payload["payment"].get("entity", {})
            if isinstance(p_entity, dict):
                payment_method = p_entity.get("method")

        # Clean and sanitize strings
        def clean_str(val: Any) -> Optional[str]:
            if val is None:
                return None
            s = str(val).strip()
            return s if s else None

        error_reason = clean_str(error_meta.get("error_reason"))
        error_code = clean_str(error_meta.get("error_code"))
        error_desc = clean_str(error_meta.get("error_description"))
        error_source = clean_str(error_meta.get("error_source"))
        error_step = clean_str(error_meta.get("error_step"))

        return ExtractedFailureEvidence(
            provider=event.provider,
            payment_id=event.entity_id,
            subscription_id=event.subscription_id,
            invoice_id=event.invoice_id,
            error_code=error_code,
            error_description=error_desc,
            error_source=error_source,
            error_step=error_step,
            error_reason=error_reason,
            payment_method=payment_method,
            raw_payload_snippet={
                "error_metadata": error_meta,
                "amount_inr": str(event.amount_inr) if event.amount_inr else None,
                "occurred_at": event.occurred_at.isoformat(),
            }
        )
