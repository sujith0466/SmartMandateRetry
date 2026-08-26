"""Unit tests for Phase 10 state machine transition validation and terminal guards."""

import pytest

from app.core.errors import InvalidStateTransitionError, StateConsistencyError, TerminalStateError
from app.domain.state_machine import (
    CaseState, CrossAggregateConsistencyGuard, StateTransitionValidator,
    TERMINAL_STATES, TransitionStatus, VALID_TRANSITIONS, is_valid_transition
)


def test_valid_transitions_from_every_state():
    validator = StateTransitionValidator()
    for from_state, to_states in VALID_TRANSITIONS.items():
        for to_state in to_states:
            status = validator.validate_transition(from_state.value, to_state.value)
            assert status == TransitionStatus.TRANSITIONED


def test_idempotent_transition_returns_already_applied():
    validator = StateTransitionValidator()
    status = validator.validate_transition("SCHEDULED", "SCHEDULED")
    assert status == TransitionStatus.ALREADY_APPLIED

    # Even on terminal states, requesting the same state is an idempotent no-op
    assert validator.validate_transition("RECOVERED", "RECOVERED") == TransitionStatus.ALREADY_APPLIED
    assert validator.validate_transition("STOPPED", "STOPPED") == TransitionStatus.ALREADY_APPLIED
    assert validator.validate_transition("EXPIRED", "EXPIRED") == TransitionStatus.ALREADY_APPLIED


def test_terminal_states_reject_all_mutations():
    validator = StateTransitionValidator()
    for term in TERMINAL_STATES:
        # Cannot transition to active state
        with pytest.raises(TerminalStateError) as exc_info:
            validator.validate_transition(term.value, "SCHEDULED")
        assert term.value in str(exc_info.value)

        with pytest.raises(TerminalStateError):
            validator.validate_transition(term.value, "IN_PROGRESS")

        with pytest.raises(TerminalStateError):
            validator.validate_transition(term.value, "FAILED")


def test_invalid_graph_transitions_fail_closed():
    validator = StateTransitionValidator()
    # DETECTED directly to RECOVERED without execution is invalid
    with pytest.raises(InvalidStateTransitionError):
        validator.validate_transition("ANALYZING", "RECOVERED")

    with pytest.raises(InvalidStateTransitionError):
        validator.validate_transition("DECISION_PENDING", "RECOVERED")


def test_unknown_states_raise_invalid_transition_error():
    validator = StateTransitionValidator()
    with pytest.raises(InvalidStateTransitionError) as exc:
        validator.validate_transition("UNKNOWN_STATE_X", "SCHEDULED")
    assert "Unknown source state" in str(exc.value.details)

    with pytest.raises(InvalidStateTransitionError) as exc2:
        validator.validate_transition("SCHEDULED", "UNKNOWN_TARGET_Y")
    assert "Unknown target state" in str(exc2.value.details)


def test_cross_aggregate_consistency_guard():
    # STOPPED case cannot have PENDING or SCHEDULED action
    with pytest.raises(StateConsistencyError):
        CrossAggregateConsistencyGuard.validate_consistency("STOPPED", ["PENDING"])

    with pytest.raises(StateConsistencyError):
        CrossAggregateConsistencyGuard.validate_consistency("STOPPED", ["EXECUTED", "SCHEDULED"])

    # Valid stopped case
    CrossAggregateConsistencyGuard.validate_consistency("STOPPED", ["EXECUTED", "BLOCKED"])
