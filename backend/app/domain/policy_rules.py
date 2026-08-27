"""Declarative, deterministic safety rules for the Policy Engine."""

from abc import ABC, abstractmethod
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional, Set

from app.domain.ai_decision_schemas import AIDecisionResult
from app.domain.customer_context import CustomerRecoveryContext
from app.domain.failure_taxonomy import FailureCategory, Recoverability
from app.domain.models import RecoveryPolicy
from app.domain.policy_decision import PolicyStatusEnum

HARD_DECLINE_CODES: Set[str] = {
    "do_not_honour",
    "account_closed",
    "fraud_block",
    "stolen_card",
    "card_declined_permanent",
    "DO_NOT_HONOUR",
    "ACCOUNT_CLOSED",
    "FRAUD_BLOCK",
    "STOLEN_CARD",
}

TERMINAL_CASE_STATES: Set[str] = {
    "RECOVERED",
    "STOPPED",
    "FAILED",
    "ABANDONED",
    "EXPIRED"
}

AUTHORIZED_ACTIONS: Set[str] = {
    "SCHEDULE_RECOVERY_CHECK",
    "PAYMENT_LINK_RECOVERY",
    "PAYMENT_METHOD_RECOVERY",
    "MANUAL_ESCALATION",
    "STOP"
}


class PolicyRuleEvaluationContext:
    """Internal evaluation context passed across policy rules."""

    def __init__(
        self,
        context: CustomerRecoveryContext,
        decision: AIDecisionResult,
        policy: RecoveryPolicy,
    ) -> None:
        self.context = context
        self.decision = decision
        self.policy = policy
        self.current_action: str = decision.recommended_action.value if hasattr(decision.recommended_action, "value") else str(decision.recommended_action)
        self.status: PolicyStatusEnum = PolicyStatusEnum.ALLOWED
        self.execution_allowed: bool = True
        self.reasons: List[str] = []
        self.rules_applied: List[str] = []
        self.risk_flags: List[str] = list(decision.risk_flags or [])
        self.adjusted_delay_hours: Optional[int] = decision.delay_hours


class BasePolicyRule(ABC):
    """Abstract base class for deterministic policy rules."""

    @property
    @abstractmethod
    def rule_id(self) -> str:
        pass

    @property
    @abstractmethod
    def precedence(self) -> int:
        """Lower number indicates higher execution priority (P0 before P3)."""
        pass

    @abstractmethod
    def evaluate(self, eval_ctx: PolicyRuleEvaluationContext) -> None:
        pass


class HardDeclineSafetyRule(BasePolicyRule):
    """POL-RULE-001: Immediate hard decline safety veto."""

    @property
    def rule_id(self) -> str:
        return "HARD_DECLINE_VETO"

    @property
    def precedence(self) -> int:
        return 1  # Highest priority

    def evaluate(self, eval_ctx: PolicyRuleEvaluationContext) -> None:
        fa = eval_ctx.context.failure_assessment
        is_hard = (
            fa.is_hard_decline or
            fa.failure_category == FailureCategory.PERMANENT_HARD_DECLINE or
            fa.recoverability == Recoverability.NON_RECOVERABLE or
            (fa.raw_error_reason or "") in HARD_DECLINE_CODES or
            (fa.failure_code or "") in HARD_DECLINE_CODES
        )

        if is_hard:
            eval_ctx.rules_applied.append(self.rule_id)
            eval_ctx.reasons.append("HARD_DECLINE_VETO")
            eval_ctx.status = PolicyStatusEnum.BLOCKED if eval_ctx.current_action != "STOP" else PolicyStatusEnum.ALLOWED
            eval_ctx.current_action = "STOP"
            eval_ctx.execution_allowed = False
            eval_ctx.adjusted_delay_hours = 0
            if "HARD_DECLINE_DETECTED" not in eval_ctx.risk_flags:
                eval_ctx.risk_flags.append("HARD_DECLINE_DETECTED")


class TerminalCaseSafetyRule(BasePolicyRule):
    """POL-RULE-004: Terminal state or expired recovery window veto."""

    @property
    def rule_id(self) -> str:
        return "TERMINAL_CASE_VETO"

    @property
    def precedence(self) -> int:
        return 2

    def evaluate(self, eval_ctx: PolicyRuleEvaluationContext) -> None:
        if eval_ctx.current_action == "STOP":
            return

        case_state = eval_ctx.context.case.state
        max_window_hours = eval_ctx.policy.max_recovery_window_days * 24
        is_expired = eval_ctx.context.case.age_hours > max_window_hours

        if case_state in TERMINAL_CASE_STATES or is_expired:
            eval_ctx.rules_applied.append(self.rule_id)
            eval_ctx.reasons.append("CASE_ALREADY_TERMINAL" if case_state in TERMINAL_CASE_STATES else "MAX_RECOVERY_WINDOW_EXCEEDED")
            eval_ctx.status = PolicyStatusEnum.BLOCKED
            eval_ctx.current_action = "STOP"
            eval_ctx.execution_allowed = False
            eval_ctx.adjusted_delay_hours = 0


class MaxRetriesCapRule(BasePolicyRule):
    """POL-RULE-002: Maximum retry attempt cap enforcement."""

    @property
    def rule_id(self) -> str:
        return "MAX_RETRIES_EXCEEDED"

    @property
    def precedence(self) -> int:
        return 3

    def evaluate(self, eval_ctx: PolicyRuleEvaluationContext) -> None:
        if eval_ctx.current_action == "STOP":
            return

        attempts = eval_ctx.context.payment_history.failed_payments
        max_allowed = eval_ctx.policy.max_retries_per_case

        if attempts >= max_allowed:
            eval_ctx.rules_applied.append(self.rule_id)
            eval_ctx.reasons.append("MAX_RETRIES_EXCEEDED")
            eval_ctx.status = PolicyStatusEnum.BLOCKED
            eval_ctx.current_action = "STOP"
            eval_ctx.execution_allowed = False
            eval_ctx.adjusted_delay_hours = 0


class HighValueReviewRule(BasePolicyRule):
    """POL-RULE-006: High-value exposure mandatory human review."""

    @property
    def rule_id(self) -> str:
        return "HIGH_VALUE_THRESHOLD"

    @property
    def precedence(self) -> int:
        return 4

    def evaluate(self, eval_ctx: PolicyRuleEvaluationContext) -> None:
        if eval_ctx.current_action in ("STOP", "MANUAL_ESCALATION"):
            return

        amount = eval_ctx.context.case.amount_inr
        threshold = eval_ctx.policy.high_value_threshold_inr

        if amount > threshold:
            eval_ctx.rules_applied.append(self.rule_id)
            eval_ctx.reasons.append("HIGH_VALUE_EXPOSURE")
            eval_ctx.status = PolicyStatusEnum.MODIFIED
            eval_ctx.current_action = "MANUAL_ESCALATION"
            eval_ctx.execution_allowed = False
            eval_ctx.adjusted_delay_hours = 0
            if "HIGH_VALUE_EXPOSURE" not in eval_ctx.risk_flags:
                eval_ctx.risk_flags.append("HIGH_VALUE_EXPOSURE")


class LowConfidenceVetoRule(BasePolicyRule):
    """POL-RULE-005: Low AI confidence review gate."""

    @property
    def rule_id(self) -> str:
        return "LOW_AI_CONFIDENCE"

    @property
    def precedence(self) -> int:
        return 5

    def evaluate(self, eval_ctx: PolicyRuleEvaluationContext) -> None:
        if eval_ctx.current_action in ("STOP", "MANUAL_ESCALATION"):
            return

        min_conf = eval_ctx.policy.min_confidence_threshold
        if eval_ctx.decision.confidence < min_conf:
            eval_ctx.rules_applied.append(self.rule_id)
            eval_ctx.reasons.append("LOW_AI_CONFIDENCE")
            eval_ctx.status = PolicyStatusEnum.MODIFIED
            eval_ctx.current_action = "MANUAL_ESCALATION"
            eval_ctx.execution_allowed = False
            eval_ctx.adjusted_delay_hours = 0
            if "LOW_CONFIDENCE" not in eval_ctx.risk_flags:
                eval_ctx.risk_flags.append("LOW_CONFIDENCE")


class ContactFrequencyCapRule(BasePolicyRule):
    """POL-RULE-007: Customer contact frequency protection."""

    @property
    def rule_id(self) -> str:
        return "MAX_CONTACTS_EXCEEDED"

    @property
    def precedence(self) -> int:
        return 6

    def evaluate(self, eval_ctx: PolicyRuleEvaluationContext) -> None:
        if eval_ctx.current_action not in ("PAYMENT_LINK_RECOVERY", "PAYMENT_METHOD_RECOVERY"):
            return

        contacts = eval_ctx.context.case.age_hours  # or contacts count
        max_contacts = eval_ctx.policy.max_customer_contacts_per_cycle

        # If contacts limit reached
        if eval_ctx.context.payment_history.recent_failures_30d >= max_contacts:
            eval_ctx.rules_applied.append(self.rule_id)
            eval_ctx.reasons.append("MAX_CONTACTS_EXCEEDED")
            eval_ctx.status = PolicyStatusEnum.MODIFIED
            eval_ctx.current_action = "MANUAL_ESCALATION"
            eval_ctx.execution_allowed = False
            eval_ctx.adjusted_delay_hours = 0


class StrategyStageCompatibilityRule(BasePolicyRule):
    """POL-RULE-008: Stage and failure class compatibility validation."""

    @property
    def rule_id(self) -> str:
        return "STRATEGY_STAGE_COMPATIBILITY"

    @property
    def precedence(self) -> int:
        return 7

    def evaluate(self, eval_ctx: PolicyRuleEvaluationContext) -> None:
        if eval_ctx.current_action in ("STOP", "MANUAL_ESCALATION"):
            return

        stage = eval_ctx.context.case.stage
        fa = eval_ctx.context.failure_assessment

        # Payment Link in PENDING_OBSERVATION is invalid (mandate not yet halted)
        if stage == "PENDING_OBSERVATION" and eval_ctx.current_action == "PAYMENT_LINK_RECOVERY":
            eval_ctx.rules_applied.append(self.rule_id)
            eval_ctx.reasons.append("PAYMENT_LINK_NOT_ALLOWED_IN_PENDING_STAGE")
            eval_ctx.status = PolicyStatusEnum.MODIFIED
            eval_ctx.current_action = "SCHEDULE_RECOVERY_CHECK"

        # UNKNOWN_AMBIGUOUS cannot execute automated retries
        if fa.failure_category == FailureCategory.UNKNOWN_AMBIGUOUS and eval_ctx.current_action != "MANUAL_ESCALATION":
            eval_ctx.rules_applied.append(self.rule_id)
            eval_ctx.reasons.append("AMBIGUOUS_FAILURE_REQUIRES_MANUAL_REVIEW")
            eval_ctx.status = PolicyStatusEnum.MODIFIED
            eval_ctx.current_action = "MANUAL_ESCALATION"
            eval_ctx.execution_allowed = False


class ActionAllowlistRule(BasePolicyRule):
    """Action allowlist validation rule."""

    @property
    def rule_id(self) -> str:
        return "ACTION_ALLOWLIST_CHECK"

    @property
    def precedence(self) -> int:
        return 8

    def evaluate(self, eval_ctx: PolicyRuleEvaluationContext) -> None:
        if eval_ctx.current_action not in AUTHORIZED_ACTIONS:
            eval_ctx.rules_applied.append(self.rule_id)
            eval_ctx.reasons.append("UNRECOGNIZED_ACTION_OVERRIDE")
            eval_ctx.status = PolicyStatusEnum.BLOCKED
            eval_ctx.current_action = "MANUAL_ESCALATION"
            eval_ctx.execution_allowed = False


class MinRetryIntervalRule(BasePolicyRule):
    """POL-RULE-003: Minimum interval between retries enforcement."""

    @property
    def rule_id(self) -> str:
        return "MIN_RETRY_INTERVAL"

    @property
    def precedence(self) -> int:
        return 9

    def evaluate(self, eval_ctx: PolicyRuleEvaluationContext) -> None:
        if eval_ctx.current_action == "SCHEDULE_RECOVERY_CHECK":
            min_hours = eval_ctx.policy.min_retry_interval_hours
            current_delay = eval_ctx.adjusted_delay_hours or 0
            if current_delay < min_hours:
                eval_ctx.rules_applied.append(self.rule_id)
                eval_ctx.adjusted_delay_hours = min_hours
                if eval_ctx.status == PolicyStatusEnum.ALLOWED:
                    eval_ctx.reasons.append("DELAY_EXTENDED_TO_MIN_INTERVAL")


class PromiseToPayProtectionRule(BasePolicyRule):
    """POL-RULE-010: Active promise-to-pay contact suppression and scheduling."""

    @property
    def rule_id(self) -> str:
        return "ACTIVE_PROMISE_PROTECTION"

    @property
    def precedence(self) -> int:
        return 7

    def evaluate(self, eval_ctx: PolicyRuleEvaluationContext) -> None:
        if eval_ctx.current_action in ("STOP", "MANUAL_ESCALATION"):
            return

        due_at = getattr(eval_ctx.context, "active_promise_due_at", None)
        if due_at and datetime.now(timezone.utc) < due_at:
            eval_ctx.rules_applied.append(self.rule_id)
            eval_ctx.reasons.append("ACTIVE_PROMISE_TO_PAY_WINDOW")
            eval_ctx.status = PolicyStatusEnum.MODIFIED
            eval_ctx.current_action = "SCHEDULE_RECOVERY_CHECK"
            eval_ctx.execution_allowed = False
            eval_ctx.adjusted_delay_hours = max(1, int((due_at - datetime.now(timezone.utc)).total_seconds() / 3600))

