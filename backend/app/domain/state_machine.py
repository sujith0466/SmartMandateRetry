"""Formal state machine definitions and transition contracts."""

from enum import Enum
from typing import Set


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


# Permitted state transition graph
VALID_TRANSITIONS: dict[CaseState, Set[CaseState]] = {
    CaseState.DETECTED: {CaseState.ANALYZING},
    CaseState.ANALYZING: {CaseState.DECISION_PENDING},
    CaseState.DECISION_PENDING: {CaseState.POLICY_REVIEW},
    CaseState.POLICY_REVIEW: {CaseState.SCHEDULED, CaseState.ESCALATED, CaseState.STOPPED},
    CaseState.SCHEDULED: {CaseState.ACTION_PENDING},
    CaseState.ACTION_PENDING: {CaseState.ACTION_EXECUTED, CaseState.FAILED},
    CaseState.ACTION_EXECUTED: {CaseState.WAITING_FOR_OUTCOME},
    CaseState.WAITING_FOR_OUTCOME: {CaseState.RECOVERED, CaseState.FAILED},
    CaseState.FAILED: {CaseState.DECISION_PENDING, CaseState.STOPPED, CaseState.EXPIRED},
    CaseState.ESCALATED: {CaseState.SCHEDULED, CaseState.STOPPED},
    CaseState.STOPPED: set(),  # Terminal state
    CaseState.RECOVERED: set(),  # Terminal state
    CaseState.EXPIRED: set(),  # Terminal state
}


def is_valid_transition(current_state: CaseState, next_state: CaseState) -> bool:
    """Validate whether state transition conforms to formal lifecycle model."""
    allowed = VALID_TRANSITIONS.get(current_state, set())
    return next_state in allowed
