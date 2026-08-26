"""Domain models and contracts for Phase 8 Recovery Action Execution."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional
import uuid


class ActionExecutionStatus(str, Enum):
    """Authoritative execution status of a recovery action."""
    PENDING = "PENDING"
    EXECUTED = "EXECUTED"
    SCHEDULED = "SCHEDULED"
    BLOCKED = "BLOCKED"
    FAILED = "FAILED"
    NOT_SUPPORTED = "NOT_SUPPORTED"
    SKIPPED = "SKIPPED"


@dataclass(frozen=True)
class ActionExecutionRequest:
    """
    Immutable domain contract requesting execution of a Phase 7 PolicyDecision.
    """
    case_id: str
    policy_decision_id: str
    final_action: str
    adjusted_delay_hours: Optional[int]
    execution_allowed: bool
    policy_version: str = "1.0.0"
    correlation_id: Optional[str] = None
    idempotency_key: Optional[str] = None

    def compute_idempotency_key(self) -> str:
        """Derive authoritative, deterministic idempotency key for this execution request."""
        if self.idempotency_key:
            return self.idempotency_key
        return f"phase8:{self.case_id}:{self.policy_decision_id}:{self.final_action}"


@dataclass(frozen=True)
class ActionExecutionResult:
    """
    Immutable domain contract representing the outcome of a recovery action execution.
    """
    execution_id: str
    case_id: str
    policy_decision_id: str
    action: str
    status: ActionExecutionStatus
    execution_allowed: bool
    provider: str
    provider_reference: Optional[str] = None
    scheduled_for: Optional[datetime] = None
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    created_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        """Serialize action execution outcome for audit logging and API responses."""
        return {
            "execution_id": self.execution_id,
            "case_id": self.case_id,
            "policy_decision_id": self.policy_decision_id,
            "action": self.action,
            "status": self.status.value,
            "execution_allowed": self.execution_allowed,
            "provider": self.provider,
            "provider_reference": self.provider_reference,
            "scheduled_for": self.scheduled_for.isoformat() if self.scheduled_for else None,
            "error_code": self.error_code,
            "error_message": self.error_message,
            "created_at": self.created_at.isoformat(),
        }
