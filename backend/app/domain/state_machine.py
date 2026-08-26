"""Formal state machine definitions, transition contracts, and invariants."""

from dataclasses import dataclass, field
from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, List, Optional, Set

from app.core.errors import InvalidStateTransitionError, StateConsistencyError, TerminalStateError
from app.core.logging import get_logger

logger = get_logger("domain.state_machine")


class RecoveryStage(str, Enum):
    """Dual-stage recovery operational classification."""
    PENDING_OBSERVATION = "PENDING_OBSERVATION"  # Stage 1: Active during Razorpay native auto-retry
    HALTED_RECOVERY = "HALTED_RECOVERY"          # Stage 2: Active post-halt


class CaseState(str, Enum):
    """Authoritative state machine states for RecoveryCase aggregate."""
    DETECTED = "DETECTED"
    ANALYZING = "ANALYZING"
    DECISION_PENDING = "DECISION_PENDING"
    POLICY_REVIEW = "POLICY_REVIEW"
    SCHEDULED = "SCHEDULED"
    ACTION_PENDING = "ACTION_PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    ACTION_EXECUTED = "ACTION_EXECUTED"
    WAITING_FOR_OUTCOME = "WAITING_FOR_OUTCOME"
    RECOVERED = "RECOVERED"
    FAILED = "FAILED"
    ESCALATED = "ESCALATED"
    STOPPED = "STOPPED"
    EXPIRED = "EXPIRED"


class RecoveryActionType(str, Enum):
    """Bounded, authorized recovery actions."""
    SCHEDULE_RECOVERY_CHECK = "SCHEDULE_RECOVERY_CHECK"
    PAYMENT_LINK_RECOVERY = "PAYMENT_LINK_RECOVERY"
    PAYMENT_METHOD_RECOVERY = "PAYMENT_METHOD_RECOVERY"
    MANUAL_ESCALATION = "MANUAL_ESCALATION"
    STOP = "STOP"


class FailureCategory(str, Enum):
    """Standardized failure classification categories."""
    TEMPORARY = "TEMPORARY"
    PERMANENT = "PERMANENT"
    ACTION_REQUIRED = "ACTION_REQUIRED"
    RISK = "RISK"
    UNKNOWN = "UNKNOWN"


class TransitionStatus(str, Enum):
    """Execution status of a requested state transition."""
    TRANSITIONED = "TRANSITIONED"
    ALREADY_APPLIED = "ALREADY_APPLIED"


TERMINAL_STATES: Set[CaseState] = {
    CaseState.RECOVERED,
    CaseState.STOPPED,
    CaseState.EXPIRED,
}

# Permitted state transition graph
VALID_TRANSITIONS: Dict[CaseState, Set[CaseState]] = {
    CaseState.DETECTED: {
        CaseState.ANALYZING,
        CaseState.SCHEDULED,
        CaseState.IN_PROGRESS,
        CaseState.ACTION_EXECUTED,
        CaseState.STOPPED,
        CaseState.ESCALATED,
        CaseState.FAILED,
    },
    CaseState.ANALYZING: {
        CaseState.DECISION_PENDING,
        CaseState.STOPPED,
        CaseState.FAILED,
    },
    CaseState.DECISION_PENDING: {
        CaseState.POLICY_REVIEW,
        CaseState.STOPPED,
        CaseState.FAILED,
    },
    CaseState.POLICY_REVIEW: {
        CaseState.SCHEDULED,
        CaseState.IN_PROGRESS,
        CaseState.ACTION_EXECUTED,
        CaseState.ESCALATED,
        CaseState.STOPPED,
        CaseState.FAILED,
    },
    CaseState.SCHEDULED: {
        CaseState.ACTION_PENDING,
        CaseState.IN_PROGRESS,
        CaseState.ACTION_EXECUTED,
        CaseState.RECOVERED,
        CaseState.FAILED,
        CaseState.STOPPED,
    },
    CaseState.ACTION_PENDING: {
        CaseState.IN_PROGRESS,
        CaseState.ACTION_EXECUTED,
        CaseState.FAILED,
        CaseState.STOPPED,
    },
    CaseState.IN_PROGRESS: {
        CaseState.WAITING_FOR_OUTCOME,
        CaseState.RECOVERED,
        CaseState.FAILED,
        CaseState.ESCALATED,
        CaseState.STOPPED,
    },
    CaseState.ACTION_EXECUTED: {
        CaseState.WAITING_FOR_OUTCOME,
        CaseState.RECOVERED,
        CaseState.FAILED,
        CaseState.ESCALATED,
        CaseState.STOPPED,
    },
    CaseState.WAITING_FOR_OUTCOME: {
        CaseState.RECOVERED,
        CaseState.FAILED,
        CaseState.STOPPED,
    },
    CaseState.ESCALATED: {
        CaseState.SCHEDULED,
        CaseState.IN_PROGRESS,
        CaseState.ACTION_EXECUTED,
        CaseState.STOPPED,
        CaseState.FAILED,
    },
    CaseState.FAILED: {
        CaseState.DECISION_PENDING,
        CaseState.SCHEDULED,
        CaseState.STOPPED,
        CaseState.EXPIRED,
    },
    CaseState.STOPPED: set(),
    CaseState.RECOVERED: set(),
    CaseState.EXPIRED: set(),
}


def is_valid_transition(current_state: CaseState, next_state: CaseState) -> bool:
    """Validate whether state transition conforms to formal lifecycle model."""
    allowed = VALID_TRANSITIONS.get(current_state, set())
    return next_state in allowed


class StateTransitionValidator:
    """Validator enforcing lifecycle graph boundaries and terminal state immutability."""

    @staticmethod
    def validate_transition(current_state_str: str, target_state_str: str) -> TransitionStatus:
        """
        Validate transition. Returns TRANSITIONED if valid, ALREADY_APPLIED if identical,
        or raises appropriate Domain Error.
        """
        try:
            curr = CaseState(current_state_str)
        except ValueError:
            raise InvalidStateTransitionError(current_state_str, target_state_str, {"reason": f"Unknown source state '{current_state_str}'"})

        try:
            target = CaseState(target_state_str)
        except ValueError:
            raise InvalidStateTransitionError(current_state_str, target_state_str, {"reason": f"Unknown target state '{target_state_str}'"})

        # 1. Idempotency Check: Already in target state
        if curr == target:
            logger.info("Idempotent transition request: case already in state", state=curr.value)
            return TransitionStatus.ALREADY_APPLIED

        # 2. Terminal State Guard
        if curr in TERMINAL_STATES:
            logger.warning("Attempted mutation on terminal state", state=curr.value, target=target.value)
            raise TerminalStateError(curr.value, target.value)

        # 3. State Graph Edge Validation
        if not is_valid_transition(curr, target):
            logger.warning("Invalid state transition rejected", from_state=curr.value, to_state=target.value)
            raise InvalidStateTransitionError(curr.value, target.value)

        return TransitionStatus.TRANSITIONED


class CrossAggregateConsistencyGuard:
    """Validates lifecycle consistency between RecoveryCase and its RecoveryActions."""

    @staticmethod
    def validate_consistency(case_state: str, action_statuses: List[str]) -> None:
        """
        Verify case state invariants against associated recovery action statuses.
        """
        state = CaseState(case_state) if case_state in CaseState._value2member_map_ else None
        if not state:
            return

        if state == CaseState.STOPPED:
            if any(s in ("PENDING", "SCHEDULED") for s in action_statuses):
                raise StateConsistencyError(
                    "STOPPED case cannot contain active PENDING or SCHEDULED actions",
                    {"case_state": case_state, "action_statuses": action_statuses}
                )


@dataclass(frozen=True)
class StateTransitionResult:
    """Immutable outcome of a validated lifecycle state transition."""
    case_id: str
    previous_state: str
    new_state: str
    previous_version: int
    new_version: int
    status: TransitionStatus
    transitioned_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))
    notes: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Serialize transition metadata for audit trail persistence."""
        return {
            "case_id": self.case_id,
            "previous_state": self.previous_state,
            "new_state": self.new_state,
            "previous_version": self.previous_version,
            "new_version": self.new_version,
            "status": self.status.value,
            "transitioned_at": self.transitioned_at.isoformat(),
            "notes": self.notes,
        }
