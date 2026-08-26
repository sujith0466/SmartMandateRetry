"""Structured domain contract for payment failure assessments."""

from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, Optional
import uuid

from app.domain.failure_taxonomy import FailureCategory, Recoverability, Severity


@dataclass(frozen=True)
class FailureAssessment:
    """
    Immutable, explainable assessment representing the diagnostic intelligence
    derived from a payment failure event.
    """
    assessment_id: str
    provider: str
    payment_id: str
    subscription_id: Optional[str]
    invoice_id: Optional[str]
    failure_category: FailureCategory
    failure_code: str
    raw_error_reason: Optional[str]
    raw_error_code: Optional[str]
    recoverability: Recoverability
    severity: Severity
    confidence: Decimal
    evidence: Dict[str, Any]
    is_hard_decline: bool
    classifier_version: str = "1.0.0"
    classified_at: datetime = datetime.now(timezone.utc)

    def to_dict(self) -> Dict[str, Any]:
        """Serialize assessment to dict for logging and audit persistence."""
        return {
            "assessment_id": self.assessment_id,
            "provider": self.provider,
            "payment_id": self.payment_id,
            "subscription_id": self.subscription_id,
            "invoice_id": self.invoice_id,
            "failure_category": self.failure_category.value,
            "failure_code": self.failure_code,
            "raw_error_reason": self.raw_error_reason,
            "raw_error_code": self.raw_error_code,
            "recoverability": self.recoverability.value,
            "severity": self.severity.value,
            "confidence": str(self.confidence),
            "evidence": self.evidence,
            "is_hard_decline": self.is_hard_decline,
            "classifier_version": self.classifier_version,
            "classified_at": self.classified_at.isoformat(),
        }
