"""Deterministic Policy Engine interfaces and core safety gate."""

from datetime import datetime, timezone
from decimal import Decimal
from enum import Enum
from typing import Any, Dict, List, Optional
import uuid

from app.domain.ai_decision_schemas import AIDecisionResult
from app.domain.customer_context import CustomerRecoveryContext
from app.domain.models import RecoveryPolicy
from app.domain.policy_decision import PolicyDecision, PolicyStatusEnum
from app.domain.policy_rules import (
    ActionAllowlistRule, BasePolicyRule, ContactFrequencyCapRule,
    HardDeclineSafetyRule, HighValueReviewRule, LowConfidenceVetoRule,
    MaxRetriesCapRule, MinRetryIntervalRule, PolicyRuleEvaluationContext,
    PromiseToPayProtectionRule, StrategyStageCompatibilityRule, TerminalCaseSafetyRule
)
from app.domain.state_machine import RecoveryActionType


class PolicyDecisionResult(str, Enum):
    APPROVED = "APPROVED"
    DENIED = "DENIED"
    REQUIRES_HUMAN_APPROVAL = "REQUIRES_HUMAN_APPROVAL"


class PolicyEvaluationResult:
    def __init__(
        self,
        decision: PolicyDecisionResult,
        reason: str,
        rule_results: Dict[str, bool],
        adjusted_delay_hours: Optional[int] = None
    ) -> None:
        self.decision = decision
        self.reason = reason
        self.rule_results = rule_results
        self.adjusted_delay_hours = adjusted_delay_hours


class PolicyRuleRegistry:
    """Registry maintaining prioritized deterministic policy safety rules."""

    def __init__(self, custom_rules: Optional[List[BasePolicyRule]] = None) -> None:
        if custom_rules is not None:
            self._rules = sorted(custom_rules, key=lambda r: r.precedence)
        else:
            self._rules = sorted([
                HardDeclineSafetyRule(),
                TerminalCaseSafetyRule(),
                MaxRetriesCapRule(),
                HighValueReviewRule(),
                LowConfidenceVetoRule(),
                ContactFrequencyCapRule(),
                PromiseToPayProtectionRule(),
                StrategyStageCompatibilityRule(),
                ActionAllowlistRule(),
                MinRetryIntervalRule(),
            ], key=lambda r: r.precedence)

    @property
    def rules(self) -> List[BasePolicyRule]:
        return list(self._rules)


class PolicyEvaluationEngine:
    """Core deterministic Policy Engine evaluating AI proposals against safety rules."""

    def __init__(self, registry: Optional[PolicyRuleRegistry] = None) -> None:
        self.registry = registry or PolicyRuleRegistry()

    def evaluate(
        self,
        context: CustomerRecoveryContext,
        decision: AIDecisionResult,
        policy: RecoveryPolicy,
    ) -> PolicyDecision:
        """
        Evaluate AI decision proposal through prioritized deterministic safety rules.
        """
        eval_ctx = PolicyRuleEvaluationContext(
            context=context,
            decision=decision,
            policy=policy,
        )

        for rule in self.registry.rules:
            rule.evaluate(eval_ctx)

        # Build final immutable PolicyDecision
        decision_id = f"pol_{uuid.uuid4().hex[:12]}"
        original_action = decision.recommended_action.value if hasattr(decision.recommended_action, "value") else str(decision.recommended_action)

        return PolicyDecision(
            policy_decision_id=decision_id,
            case_id=context.case.case_id,
            input_decision_id=decision.decision_id,
            original_action=original_action,
            final_action=eval_ctx.current_action,
            status=eval_ctx.status,
            execution_allowed=eval_ctx.execution_allowed,
            policy_reasons=eval_ctx.reasons if eval_ctx.reasons else ["POLICY_CHECKS_PASSED"],
            policy_rules_applied=eval_ctx.rules_applied,
            risk_flags=eval_ctx.risk_flags,
            adjusted_delay_hours=eval_ctx.adjusted_delay_hours,
            evaluated_at=datetime.now(timezone.utc),
            policy_version="1.0.0",
        )


class DeterministicPolicyEngine:
    """Backward compatibility interface for earlier baseline tests."""

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
        rules: Dict[str, bool] = {}

        is_hard_decline = (failure_code or "").lower() in cls.HARD_DECLINE_CODES
        rules["HARD_DECLINE_CHECK"] = not is_hard_decline
        if is_hard_decline:
            return PolicyEvaluationResult(
                decision=PolicyDecisionResult.DENIED,
                reason="hard_decline_violation",
                rule_results=rules
            )

        rules["MAX_RETRIES_CHECK"] = attempt_count < max_retries
        if attempt_count >= max_retries:
            return PolicyEvaluationResult(
                decision=PolicyDecisionResult.DENIED,
                reason="max_retries_exhausted",
                rule_results=rules
            )

        rules["HIGH_VALUE_CHECK"] = amount_inr <= high_value_cap_inr
        if amount_inr > high_value_cap_inr:
            return PolicyEvaluationResult(
                decision=PolicyDecisionResult.REQUIRES_HUMAN_APPROVAL,
                reason="high_value_threshold_exceeded",
                rule_results=rules
            )

        rules["CONFIDENCE_CHECK"] = confidence >= min_confidence
        if confidence < min_confidence:
            return PolicyEvaluationResult(
                decision=PolicyDecisionResult.REQUIRES_HUMAN_APPROVAL,
                reason="low_confidence_review",
                rule_results=rules
            )

        rules["CONTACT_CAP_CHECK"] = contacts_in_cycle < max_contacts
        if contacts_in_cycle >= max_contacts and proposed_action == RecoveryActionType.PAYMENT_LINK_RECOVERY:
            return PolicyEvaluationResult(
                decision=PolicyDecisionResult.DENIED,
                reason="max_contacts_exceeded",
                rule_results=rules
            )

        rules["ACTION_ALLOWLIST_CHECK"] = isinstance(proposed_action, RecoveryActionType)
        effective_delay = max(delay_hours, min_interval_hours)

        return PolicyEvaluationResult(
            decision=PolicyDecisionResult.APPROVED,
            reason="policy_checks_passed",
            rule_results=rules,
            adjusted_delay_hours=effective_delay
        )
