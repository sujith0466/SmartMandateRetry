"""Domain schemas and contracts for Phase 9 Inbound Verification & Settlement Reconciliation."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, Optional


class PaymentOutcome(str, Enum):
    """Authoritative provider-level payment settlement outcome."""
    PAYMENT_SUCCEEDED = "PAYMENT_SUCCEEDED"
    PAYMENT_FAILED = "PAYMENT_FAILED"
    PAYMENT_PENDING = "PAYMENT_PENDING"
    PAYMENT_NOT_FOUND = "PAYMENT_NOT_FOUND"
    PAYMENT_CANCELLED = "PAYMENT_CANCELLED"
    UNKNOWN = "UNKNOWN"


class ReconciliationStatus(str, Enum):
    """Authoritative case and action reconciliation status."""
    RECONCILED = "RECONCILED"
    PENDING_VERIFICATION = "PENDING_VERIFICATION"
    MISMATCH = "MISMATCH"
    FAILED = "FAILED"
    DUPLICATE_IGNORED = "DUPLICATE_IGNORED"
    UNKNOWN = "UNKNOWN"


@dataclass(frozen=True)
class ReconciliationEvidence:
    """Immutable evidence bundle parsed from inbound webhook or direct gateway status."""
    evidence_id: str
    event_type: str
    provider: str
    entity_type: str
    entity_id: str
    payment_id: Optional[str] = None
    invoice_id: Optional[str] = None
    subscription_id: Optional[str] = None
    payment_link_id: Optional[str] = None
    amount_inr: Optional[Decimal] = None
    currency: str = "INR"
    error_code: Optional[str] = None
    error_description: Optional[str] = None
    occurred_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    raw_payload: Dict[str, Any] = field(default_factory=dict)


@dataclass(frozen=True)
class ReconciliationResult:
    """Immutable evaluated reconciliation result attributing settlement to a recovery case."""
    reconciliation_id: str
    case_id: Optional[str]
    recovery_action_id: Optional[str]
    payment_outcome: PaymentOutcome
    reconciliation_status: ReconciliationStatus
    settled_amount_inr: Optional[Decimal]
    currency: str
    evidence_id: str
    correlation_key: Optional[str]
    correlation_match_type: Optional[str]
    reconciled_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    notes: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Serialize outcome for audit logging and API responses."""
        return {
            "reconciliation_id": self.reconciliation_id,
            "case_id": self.case_id,
            "recovery_action_id": self.recovery_action_id,
            "payment_outcome": self.payment_outcome.value,
            "reconciliation_status": self.reconciliation_status.value,
            "settled_amount_inr": str(self.settled_amount_inr) if self.settled_amount_inr is not None else None,
            "currency": self.currency,
            "evidence_id": self.evidence_id,
            "correlation_key": self.correlation_key,
            "correlation_match_type": self.correlation_match_type,
            "reconciled_at": self.reconciled_at.isoformat(),
            "notes": self.notes,
        }
