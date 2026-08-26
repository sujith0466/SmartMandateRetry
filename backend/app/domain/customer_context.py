"""Provider-neutral customer recovery context domain contracts."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional

from app.domain.failure_assessment import FailureAssessment


@dataclass(frozen=True)
class CaseContext:
    """Diagnostic context of the active recovery case."""
    case_id: str
    invoice_id: str
    amount_inr: Decimal
    currency: str
    stage: str
    state: str
    created_at: datetime
    age_hours: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "case_id": self.case_id,
            "invoice_id": self.invoice_id,
            "amount_inr": str(self.amount_inr),
            "currency": self.currency,
            "stage": self.stage,
            "state": self.state,
            "created_at": self.created_at.isoformat(),
            "age_hours": self.age_hours,
        }


@dataclass(frozen=True)
class SubscriptionContext:
    """Metadata regarding the recurring mandate subscription."""
    subscription_id: str
    status: str
    plan_id: str
    current_cycle: int
    created_at: datetime
    age_days: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "subscription_id": self.subscription_id,
            "status": self.status,
            "plan_id": self.plan_id,
            "current_cycle": self.current_cycle,
            "created_at": self.created_at.isoformat(),
            "age_days": self.age_days,
        }


@dataclass(frozen=True)
class CustomerProfileContext:
    """Sanitized customer profile information."""
    customer_id: str
    tenure_months: int
    historical_success_rate: Decimal
    masked_email: Optional[str]
    masked_contact: Optional[str]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "customer_id": self.customer_id,
            "tenure_months": self.tenure_months,
            "historical_success_rate": str(self.historical_success_rate),
            "masked_email": self.masked_email,
            "masked_contact": self.masked_contact,
        }


@dataclass(frozen=True)
class PaymentHistoryContext:
    """Historical billing and payment performance metrics."""
    total_attempts: int
    successful_payments: int
    failed_payments: int
    consecutive_failures: int
    recent_failures_30d: int
    sample_size: int
    data_confidence: str  # HIGH (sample >= 5), LOW (sample < 5), INSUFFICIENT (sample == 0)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_attempts": self.total_attempts,
            "successful_payments": self.successful_payments,
            "failed_payments": self.failed_payments,
            "consecutive_failures": self.consecutive_failures,
            "recent_failures_30d": self.recent_failures_30d,
            "sample_size": self.sample_size,
            "data_confidence": self.data_confidence,
        }


@dataclass(frozen=True)
class RecoveryHistoryContext:
    """Historical intervention and recovery outcomes."""
    prior_recovery_cases: int
    prior_successful_recoveries: int
    prior_failed_recoveries: int
    recovery_success_rate: Optional[Decimal]
    last_recovery_strategy: Optional[str]
    last_recovery_at: Optional[datetime]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "prior_recovery_cases": self.prior_recovery_cases,
            "prior_successful_recoveries": self.prior_successful_recoveries,
            "prior_failed_recoveries": self.prior_failed_recoveries,
            "recovery_success_rate": str(self.recovery_success_rate) if self.recovery_success_rate is not None else None,
            "last_recovery_strategy": self.last_recovery_strategy,
            "last_recovery_at": self.last_recovery_at.isoformat() if self.last_recovery_at is not None else None,
        }


@dataclass(frozen=True)
class DataQualityContext:
    """Quality and completeness metadata for the aggregated context."""
    context_version: str = "1.0.0"
    completeness_score: Decimal = Decimal("1.00")
    is_enriched_via_api: bool = False
    missing_fields: List[str] = field(default_factory=list)
    generated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "context_version": self.context_version,
            "completeness_score": str(self.completeness_score),
            "is_enriched_via_api": self.is_enriched_via_api,
            "missing_fields": self.missing_fields,
            "generated_at": self.generated_at.isoformat(),
        }


@dataclass(frozen=True)
class CustomerRecoveryContext:
    """
    Consolidated, sanitized, and immutable customer recovery context contract
    ready for consumption by Phase 6 (AI Decision Engine) and Phase 7 (Policy Engine).
    """
    case: CaseContext
    subscription: SubscriptionContext
    customer: CustomerProfileContext
    payment_history: PaymentHistoryContext
    recovery_history: RecoveryHistoryContext
    failure_assessment: FailureAssessment
    quality: DataQualityContext

    def to_dict(self) -> Dict[str, Any]:
        """Serialize complete context tree into a clean dictionary."""
        return {
            "case": self.case.to_dict(),
            "subscription": self.subscription.to_dict(),
            "customer": self.customer.to_dict(),
            "payment_history": self.payment_history.to_dict(),
            "recovery_history": self.recovery_history.to_dict(),
            "failure_assessment": self.failure_assessment.to_dict(),
            "quality": self.quality.to_dict(),
        }
