"""Pydantic schemas and dataclasses for AI decision engine outputs."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, field_validator


class FailureClassEnum(str, Enum):
    """Categorization of failure root cause emitted by AI reasoning."""
    TEMPORARY = "TEMPORARY"
    PERMANENT = "PERMANENT"
    ACTION_REQUIRED = "ACTION_REQUIRED"
    RISK = "RISK"
    UNKNOWN = "UNKNOWN"


class RecommendedActionEnum(str, Enum):
    """Permitted recovery actions aligned with frozen strategy catalog."""
    SCHEDULE_RECOVERY_CHECK = "SCHEDULE_RECOVERY_CHECK"
    PAYMENT_LINK_RECOVERY = "PAYMENT_LINK_RECOVERY"
    PAYMENT_METHOD_RECOVERY = "PAYMENT_METHOD_RECOVERY"
    MANUAL_ESCALATION = "MANUAL_ESCALATION"
    STOP = "STOP"


class AIDecisionOutput(BaseModel):
    """Strict JSON output schema returned by LLM reasoning."""
    failure_class: FailureClassEnum
    recommended_action: RecommendedActionEnum
    delay_hours: int = Field(default=0, ge=0, le=168)
    confidence: Decimal = Field(ge=Decimal("0.0"), le=Decimal("1.0"))
    reasoning: str = Field(min_length=5, max_length=500)
    risk_flags: List[str] = Field(default_factory=list)

    @field_validator("confidence", mode="before")
    @classmethod
    def validate_confidence(cls, v: Any) -> Decimal:
        if isinstance(v, (int, float, str)):
            dec = Decimal(str(v)).quantize(Decimal("0.01"))
            if dec < Decimal("0.0") or dec > Decimal("1.0"):
                raise ValueError("Confidence must be between 0.00 and 1.00")
            return dec
        elif isinstance(v, Decimal):
            return v.quantize(Decimal("0.01"))
        raise ValueError("Invalid confidence format")


@dataclass(frozen=True)
class AIDecisionResult:
    """Consolidated, validated AI decision domain result."""
    decision_id: str
    case_id: str
    failure_class: FailureClassEnum
    recommended_action: RecommendedActionEnum
    delay_hours: int
    confidence: Decimal
    reasoning: str
    risk_flags: List[str]
    model: str
    prompt_version: str
    is_fallback: bool
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "decision_id": self.decision_id,
            "case_id": self.case_id,
            "failure_class": self.failure_class.value,
            "recommended_action": self.recommended_action.value,
            "delay_hours": self.delay_hours,
            "confidence": str(self.confidence),
            "reasoning": self.reasoning,
            "risk_flags": self.risk_flags,
            "model": self.model,
            "prompt_version": self.prompt_version,
            "is_fallback": self.is_fallback,
            "created_at": self.created_at.isoformat(),
        }
