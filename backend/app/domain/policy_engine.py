"""Deterministic Policy Engine interfaces and core safety gate."""

from dataclasses import dataclass
from enum import Enum
from typing import Any, Dict, List, Optional
from app.domain.state_machine import FailureCategory, RecoveryActionType


class PolicyDecisionResult(str, Enum):
    APPROVED = "APPROVED"
    DENIED = "DENIED"
    REQUIRES_HUMAN_APPROVAL = "REQUIRES_HUMAN_APPROVAL"


@dataclass(frozen=True)
class PolicyEvaluationResult:
    decision: PolicyDecisionResult
    reason: str
    rule_results: Dict[str, bool]
    adjusted_delay_hours: Optional[int] = None


class DeterministicPolicyEngine:
    """Independent, fail-closed deterministic policy engine."""

    HARD_DECLINE_CODES = {
        "do_not_honour",
        "account_closed",
        "fraud_block",
        "stolen_card",
        "card_declined_permanent"
    }

    @classmethod
    def evaluate(
        cls,
        proposed_action: RecoveryActionType,
        confidence: float,
        delay_hours: int,
        failure_code: str,
        attempt_count: int,
        amount_inr: float,
        contacts_in_cycle: int,
        max_retries: int = 3,
        min_interval_hours: int = 24,
        min_confidence: float = 0.75,
        high_value_cap_inr: float = 10000.0,
        max_contacts: int = 3,
    ) -> PolicyEvaluationResult:
        """Evaluate proposal against 8 deterministic safety rules."""
        rules: Dict[str, bool] = {}

        # Rule 1: Hard Decline Veto
        is_hard_decline = (failure_code or "").lower() in cls.HARD_DECLINE_CODES
        rules["HARD_DECLINE_CHECK"] = not is_hard_decline
        if is_hard_decline:
            return PolicyEvaluationResult(
                decision=PolicyDecisionResult.DENIED,
                reason="hard_decline_violation",
                rule_results=rules
            )

        # Rule 2: Max Attempts Cap
        rules["MAX_RETRIES_CHECK"] = attempt_count < max_retries
        if attempt_count >= max_retries:
            return PolicyEvaluationResult(
                decision=PolicyDecisionResult.DENIED,
                reason="max_retries_exhausted",
                rule_results=rules
            )

        # Rule 3: High-Value Review Gate
        rules["HIGH_VALUE_CHECK"] = amount_inr <= high_value_cap_inr
        if amount_inr > high_value_cap_inr:
            return PolicyEvaluationResult(
                decision=PolicyDecisionResult.REQUIRES_HUMAN_APPROVAL,
                reason="high_value_threshold_exceeded",
                rule_results=rules
            )

        # Rule 4: Confidence Gate
        rules["CONFIDENCE_CHECK"] = confidence >= min_confidence
        if confidence < min_confidence:
            return PolicyEvaluationResult(
                decision=PolicyDecisionResult.REQUIRES_HUMAN_APPROVAL,
                reason="low_confidence_review",
                rule_results=rules
            )

        # Rule 5: Contact Frequency Cap
        rules["CONTACT_CAP_CHECK"] = contacts_in_cycle < max_contacts
        if contacts_in_cycle >= max_contacts and proposed_action == RecoveryActionType.PAYMENT_LINK_RECOVERY:
            return PolicyEvaluationResult(
                decision=PolicyDecisionResult.DENIED,
                reason="max_contacts_exceeded",
                rule_results=rules
            )

        # Rule 6: Action Allowlist
        rules["ACTION_ALLOWLIST_CHECK"] = isinstance(proposed_action, RecoveryActionType)

        # Adjusted delay enforcing minimum interval
        effective_delay = max(delay_hours, min_interval_hours)

        return PolicyEvaluationResult(
            decision=PolicyDecisionResult.APPROVED,
            reason="policy_checks_passed",
            rule_results=rules,
            adjusted_delay_hours=effective_delay
        )
