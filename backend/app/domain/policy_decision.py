"""Domain models and contracts for Policy Engine decisions."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, List, Optional


class PolicyStatusEnum(str, Enum):
    """Evaluation status outcome from Policy Engine safety gate."""
    ALLOWED = "ALLOWED"
    MODIFIED = "MODIFIED"
    BLOCKED = "BLOCKED"


@dataclass(frozen=True)
class PolicyDecision:
    """
    Immutable, typed domain contract representing the authoritative safety evaluation
    of an AI recovery recommendation against merchant policies and hard safety rules.
    """
    policy_decision_id: str
    case_id: str
    input_decision_id: str
    original_action: str
    final_action: str
    status: PolicyStatusEnum
    execution_allowed: bool
    policy_reasons: List[str]
    policy_rules_applied: List[str]
    risk_flags: List[str]
    adjusted_delay_hours: Optional[int]
    evaluated_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    policy_version: str = "1.0.0"

    def to_dict(self) -> Dict[str, Any]:
        """Serialize policy decision to dictionary for audit logging and API serialization."""
        return {
            "policy_decision_id": self.policy_decision_id,
            "case_id": self.case_id,
            "input_decision_id": self.input_decision_id,
            "original_action": self.original_action,
            "final_action": self.final_action,
            "status": self.status.value,
            "execution_allowed": self.execution_allowed,
            "policy_reasons": self.policy_reasons,
            "policy_rules_applied": self.policy_rules_applied,
            "risk_flags": self.risk_flags,
            "adjusted_delay_hours": self.adjusted_delay_hours,
            "evaluated_at": self.evaluated_at.isoformat(),
            "policy_version": self.policy_version,
        }
