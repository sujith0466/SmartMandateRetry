"""Tests for Deterministic Policy Engine safety rules."""

from app.domain.policy_engine import DeterministicPolicyEngine, PolicyDecisionResult
from app.domain.state_machine import RecoveryActionType


def test_hard_decline_veto():
    """Verify that hard decline codes immediately trigger DENIED with STOP."""
    result = DeterministicPolicyEngine.evaluate(
        proposed_action=RecoveryActionType.PAYMENT_LINK_RECOVERY,
        confidence=0.95,
        delay_hours=24,
        failure_code="do_not_honour",
        attempt_count=0,
        amount_inr=1499.0,
        contacts_in_cycle=0
    )
    assert result.decision == PolicyDecisionResult.DENIED
    assert result.reason == "hard_decline_violation"
    assert result.rule_results["HARD_DECLINE_CHECK"] is False


def test_max_retries_exhausted():
    """Verify that attempt count >= max_retries triggers DENIED."""
    result = DeterministicPolicyEngine.evaluate(
        proposed_action=RecoveryActionType.PAYMENT_LINK_RECOVERY,
        confidence=0.90,
        delay_hours=24,
        failure_code="insufficient_funds",
        attempt_count=3,
        amount_inr=1499.0,
        contacts_in_cycle=1,
        max_retries=3
    )
    assert result.decision == PolicyDecisionResult.DENIED
    assert result.reason == "max_retries_exhausted"


def test_high_value_escalation():
    """Verify that invoice amounts exceeding high_value threshold route to Human Review."""
    result = DeterministicPolicyEngine.evaluate(
        proposed_action=RecoveryActionType.PAYMENT_LINK_RECOVERY,
        confidence=0.90,
        delay_hours=24,
        failure_code="insufficient_funds",
        attempt_count=1,
        amount_inr=15000.0,
        contacts_in_cycle=1,
        high_value_cap_inr=10000.0
    )
    assert result.decision == PolicyDecisionResult.REQUIRES_HUMAN_APPROVAL
    assert result.reason == "high_value_threshold_exceeded"


def test_low_confidence_escalation():
    """Verify that decisions with confidence below threshold route to Human Review."""
    result = DeterministicPolicyEngine.evaluate(
        proposed_action=RecoveryActionType.PAYMENT_LINK_RECOVERY,
        confidence=0.60,
        delay_hours=24,
        failure_code="insufficient_funds",
        attempt_count=1,
        amount_inr=1499.0,
        contacts_in_cycle=1,
        min_confidence=0.75
    )
    assert result.decision == PolicyDecisionResult.REQUIRES_HUMAN_APPROVAL
    assert result.reason == "low_confidence_review"


def test_valid_approved_proposal():
    """Verify that valid proposal meeting all safety criteria is APPROVED."""
    result = DeterministicPolicyEngine.evaluate(
        proposed_action=RecoveryActionType.PAYMENT_LINK_RECOVERY,
        confidence=0.92,
        delay_hours=48,
        failure_code="insufficient_funds",
        attempt_count=1,
        amount_inr=1499.0,
        contacts_in_cycle=1
    )
    assert result.decision == PolicyDecisionResult.APPROVED
    assert result.reason == "policy_checks_passed"
    assert result.adjusted_delay_hours == 48
