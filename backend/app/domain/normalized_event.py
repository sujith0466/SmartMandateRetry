"""Provider-neutral normalized webhook event contract."""

from dataclasses import dataclass
from datetime import datetime
from decimal import Decimal
from typing import Any, Dict, Optional


@dataclass(frozen=True)
class NormalizedWebhookEvent:
    """Standardized internal representation of an inbound gateway webhook event."""
    provider: str
    event_id: str
    event_type: str  # Standardized enum string
    occurred_at: datetime
    merchant_account_id: str
    entity_type: str  # payment, subscription, payment_link
    entity_id: str
    subscription_id: Optional[str]
    invoice_id: Optional[str]
    amount_inr: Optional[Decimal]
    currency: str
    error_metadata: Dict[str, Any]
    raw_payload: Dict[str, Any]
