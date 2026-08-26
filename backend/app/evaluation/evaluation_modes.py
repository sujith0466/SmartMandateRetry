"""Evaluation Mode Adapters for Phase 17 Comparative Benchmark Engine.

Defines the common typed prediction contract and implements 4 evaluation modes:
1. SMART_MANDATE: Full dual-stage context-aware recovery with P0-P4 policy safety gates
2. RAZORPAY_NATIVE: Baseline A (Fixed-schedule naive 3-retry, ignores non-recoverable hard declines)
3. RULE_BASED: Baseline B (Simple static rule heuristic, 48h single retry)
4. AI_UNGUARDED: Ablation control (Raw AI recommendation bypassing policy safety gates)
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from enum import Enum
from typing import Any, Dict, List, Optional

from app.evaluation.scenario_schema import SyntheticScenario


class EvaluationMode(str, Enum):
    """Authoritative evaluation mode identifier."""
    SMART_MANDATE = "SMART_MANDATE"
    RAZORPAY_NATIVE = "RAZORPAY_NATIVE"
    RULE_BASED = "RULE_BASED"
    AI_UNGUARDED = "AI_UNGUARDED"


@dataclass(frozen=True)
class EvaluationPrediction:
    """Standardized prediction contract produced by any evaluation mode."""
    predicted_policy_outcome: str   # ALLOWED / MODIFIED / BLOCKED
    predicted_final_action: str     # SCHEDULE_RECOVERY_CHECK / PAYMENT_LINK_RECOVERY / PAYMENT_METHOD_RECOVERY / MANUAL_ESCALATION / STOP
    predicted_case_outcome: str     # RECOVERED / FAILED / ESCALATED / STOPPED / EXPIRED
    predicted_label: str            # ALLOW / BLOCK / ESCALATE / STOP
    reasons: List[str] = field(default_factory=list)
    is_policy_violation: bool = False
    violation_type: Optional[str] = None
    execution_time_ms: float = 0.0

    def to_dict(self) -> Dict[str, Any]:
        return {
            "predicted_policy_outcome": self.predicted_policy_outcome,
            "predicted_final_action": self.predicted_final_action,
            "predicted_case_outcome": self.predicted_case_outcome,
            "predicted_label": self.predicted_label,
            "reasons": self.reasons,
            "is_policy_violation": self.is_policy_violation,
            "violation_type": self.violation_type,
            "execution_time_ms": self.execution_time_ms,
        }


class BaseEvaluator(ABC):
    """Abstract base class for all evaluation mode adapters."""

    @property
    @abstractmethod
    def mode(self) -> EvaluationMode:
        """Return the unique evaluation mode identifier."""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Return human-readable evaluator description."""
        pass

    @abstractmethod
    def evaluate_scenario(self, scenario: SyntheticScenario) -> EvaluationPrediction:
        """Evaluate a synthetic scenario and return a standardized prediction."""
        pass


class SmartMandateEvaluator(BaseEvaluator):
    """System Under Test: Dual-Stage Smart Orchestration with P0-P4 Safety Gates.

    Reproduces the exact prioritized safety gate logic:
      P0: Hard decline + auto_stop -> BLOCK -> STOPPED
      P1: attempt_count >= max_retries -> BLOCK -> STOPPED
      P2a: case_age > recovery window -> BLOCK -> EXPIRED
      P2b: amount >= high_value_threshold -> MODIFY -> ESCALATED
      P3a: ai_confidence < min_confidence_threshold -> BLOCK -> FAILED
      P3b: contacts >= max_customer_contacts_per_cycle -> BLOCK -> FAILED
      P4: authorized AI action -> ALLOW
    """

    @property
    def mode(self) -> EvaluationMode:
        return EvaluationMode.SMART_MANDATE

    @property
    def description(self) -> str:
        return "SmartMandateRetry: Dual-stage context-aware recovery with P0-P4 policy safety gates"

    def evaluate_scenario(self, scenario: SyntheticScenario) -> EvaluationPrediction:
        policy = scenario.policy_config
        case = scenario.recovery_case
        ai = scenario.ai_decision
        is_hard = scenario.is_hard_decline

        # P0: Hard decline veto
        if is_hard and policy.hard_decline_auto_stop:
            return EvaluationPrediction(
                predicted_policy_outcome="BLOCKED",
                predicted_final_action="STOP",
                predicted_case_outcome="STOPPED",
                predicted_label="BLOCK",
                reasons=["HARD_DECLINE_AUTO_STOP_VETO"],
            )

        # P1: Retry cap exhausted
        if case.attempt_count >= policy.max_retries_per_case:
            return EvaluationPrediction(
                predicted_policy_outcome="BLOCKED",
                predicted_final_action="STOP",
                predicted_case_outcome="STOPPED",
                predicted_label="BLOCK",
                reasons=["MAX_RETRIES_EXCEEDED"],
            )

        # P2a: Recovery window expired
        if case.case_age_hours > policy.max_recovery_window_days * 24:
            return EvaluationPrediction(
                predicted_policy_outcome="BLOCKED",
                predicted_final_action="STOP",
                predicted_case_outcome="EXPIRED",
                predicted_label="BLOCK",
                reasons=["MAX_RECOVERY_WINDOW_EXPIRED"],
            )

        # P2b: High-value escalation
        if case.amount_inr >= policy.high_value_threshold_inr and policy.high_value_threshold_inr > 0:
            return EvaluationPrediction(
                predicted_policy_outcome="MODIFIED",
                predicted_final_action="MANUAL_ESCALATION",
                predicted_case_outcome="ESCALATED",
                predicted_label="ESCALATE",
                reasons=["HIGH_VALUE_THRESHOLD_EXCEEDED"],
            )

        # P3a: Low confidence veto
        if ai.ai_confidence < policy.min_confidence_threshold:
            return EvaluationPrediction(
                predicted_policy_outcome="BLOCKED",
                predicted_final_action="STOP",
                predicted_case_outcome="FAILED",
                predicted_label="BLOCK",
                reasons=["AI_CONFIDENCE_BELOW_THRESHOLD"],
            )

        # P3b: Contact frequency cap
        if case.contacts_count >= policy.max_customer_contacts_per_cycle:
            return EvaluationPrediction(
                predicted_policy_outcome="BLOCKED",
                predicted_final_action="STOP",
                predicted_case_outcome="FAILED",
                predicted_label="BLOCK",
                reasons=["MAX_CUSTOMER_CONTACTS_EXCEEDED"],
            )

        # P4: Authorized AI recommendation
        action = ai.recommended_action
        if action == "STOP":
            return EvaluationPrediction(
                predicted_policy_outcome="ALLOWED",
                predicted_final_action="STOP",
                predicted_case_outcome="STOPPED",
                predicted_label="STOP",
                reasons=["AI_RECOMMENDED_STOP"],
            )
        elif action == "MANUAL_ESCALATION":
            return EvaluationPrediction(
                predicted_policy_outcome="ALLOWED",
                predicted_final_action="MANUAL_ESCALATION",
                predicted_case_outcome="ESCALATED",
                predicted_label="ESCALATE",
                reasons=["AI_RECOMMENDED_MANUAL_ESCALATION"],
            )
        else:
            return EvaluationPrediction(
                predicted_policy_outcome="ALLOWED",
                predicted_final_action=action,
                predicted_case_outcome="RECOVERED",
                predicted_label="ALLOW",
                reasons=["AI_RECOVERY_ACTION_APPROVED"],
            )


class RazorpayNativeEvaluator(BaseEvaluator):
    """Baseline A: Fixed-schedule naive retry (Razorpay industry standard model).

    Behavior:
    - Retries automatically once a day up to 3 attempts during `pending`.
    - Gives up once attempts >= 3 or when subscription enters `halted`.
    - Ignorant of failure root causes: blindly retries hard declines, wasting retries.
    - Zero out-of-band payment link or payment method recovery actions.
    - Zero high-value risk awareness or AI diagnostics.
    """

    @property
    def mode(self) -> EvaluationMode:
        return EvaluationMode.RAZORPAY_NATIVE

    @property
    def description(self) -> str:
        return "Razorpay Native: Fixed-schedule 3-retry naive baseline (ignores hard declines and lacks link recovery)"

    def evaluate_scenario(self, scenario: SyntheticScenario) -> EvaluationPrediction:
        case = scenario.recovery_case
        policy = scenario.policy_config
        is_hard = scenario.is_hard_decline

        # Razorpay native stops once attempt count reaches 3 or stage is HALTED
        if case.attempt_count >= 3 or case.stage == "HALTED_RECOVERY":
            return EvaluationPrediction(
                predicted_policy_outcome="BLOCKED",
                predicted_final_action="STOP",
                predicted_case_outcome="FAILED" if not is_hard else "STOPPED",
                predicted_label="BLOCK",
                reasons=["RAZORPAY_NATIVE_RETRY_LIMIT_OR_HALTED"],
            )

        # Naive schedule: blindly dispatches SCHEDULE_RECOVERY_CHECK on active cases
        # Notice: on hard declines with hard_decline_auto_stop=True, this violates safety policy
        is_violation = is_hard and policy.hard_decline_auto_stop
        violation_type = "HARD_DECLINE_RETRY_VIOLATION" if is_violation else None

        # If recoverable, native retry might recover; if hard decline or conditional (expired card), it fails
        predicted_outcome = "FAILED"
        if scenario.recoverability == "RECOVERABLE" and not is_hard:
            predicted_outcome = "RECOVERED"

        return EvaluationPrediction(
            predicted_policy_outcome="ALLOWED",
            predicted_final_action="SCHEDULE_RECOVERY_CHECK",
            predicted_case_outcome=predicted_outcome,
            predicted_label="ALLOW",
            reasons=["RAZORPAY_NATIVE_SCHEDULED_RETRY"],
            is_policy_violation=is_violation,
            violation_type=violation_type,
        )


class RuleBasedEvaluator(BaseEvaluator):
    """Baseline B: Simple static rule-based heuristic.

    Behavior:
    - Stops immediately on known hard decline codes.
    - Allows a single retry (attempt_count == 0) for transient errors.
    - Escalates if amount >= 10,000 INR statically.
    - Lacks multi-channel link orchestration or adaptive AI context.
    """

    @property
    def mode(self) -> EvaluationMode:
        return EvaluationMode.RULE_BASED

    @property
    def description(self) -> str:
        return "Rule-Based Baseline: Static 1-retry 48h heuristic without adaptive link recovery"

    def evaluate_scenario(self, scenario: SyntheticScenario) -> EvaluationPrediction:
        case = scenario.recovery_case
        is_hard = scenario.is_hard_decline

        # Rule 1: Hard decline stop
        if is_hard:
            return EvaluationPrediction(
                predicted_policy_outcome="BLOCKED",
                predicted_final_action="STOP",
                predicted_case_outcome="STOPPED",
                predicted_label="BLOCK",
                reasons=["STATIC_RULE_HARD_DECLINE_STOP"],
            )

        # Rule 2: Static high value escalation (>= 10,000 INR)
        if case.amount_inr >= 10000:
            return EvaluationPrediction(
                predicted_policy_outcome="MODIFIED",
                predicted_final_action="MANUAL_ESCALATION",
                predicted_case_outcome="ESCALATED",
                predicted_label="ESCALATE",
                reasons=["STATIC_RULE_HIGH_VALUE_ESCALATION"],
            )

        # Rule 3: Single retry allowed only if attempt_count == 0
        if case.attempt_count == 0 and scenario.recoverability == "RECOVERABLE":
            return EvaluationPrediction(
                predicted_policy_outcome="ALLOWED",
                predicted_final_action="SCHEDULE_RECOVERY_CHECK",
                predicted_case_outcome="RECOVERED",
                predicted_label="ALLOW",
                reasons=["STATIC_RULE_SINGLE_RETRY_ALLOWED"],
            )

        # Everything else blocked / stopped
        return EvaluationPrediction(
            predicted_policy_outcome="BLOCKED",
            predicted_final_action="STOP",
            predicted_case_outcome="FAILED",
            predicted_label="BLOCK",
            reasons=["STATIC_RULE_EXHAUSTED_OR_UNSUPPORTED"],
        )


class AIUnguardedEvaluator(BaseEvaluator):
    """Ablation Control: AI recommendation executed directly without policy safety gates.

    Behavior:
    - Adopts raw `ai_decision.recommended_action` unconditionally.
    - Bypasses retry caps, high-value thresholds, contact limits, and recovery windows.
    - Illustrates the critical safety value of the merchant Policy Safety Gate.
    """

    @property
    def mode(self) -> EvaluationMode:
        return EvaluationMode.AI_UNGUARDED

    @property
    def description(self) -> str:
        return "AI Unguarded: Raw AI recommendation bypassing merchant policy safety gates"

    def evaluate_scenario(self, scenario: SyntheticScenario) -> EvaluationPrediction:
        ai = scenario.ai_decision
        policy = scenario.policy_config
        case = scenario.recovery_case
        is_hard = scenario.is_hard_decline

        action = ai.recommended_action

        # Detect policy safety violations
        is_violation = False
        violation_type = None

        if is_hard and policy.hard_decline_auto_stop and action != "STOP":
            is_violation = True
            violation_type = "HARD_DECLINE_SAFETY_BYPASSED"
        elif case.attempt_count >= policy.max_retries_per_case and action != "STOP":
            is_violation = True
            violation_type = "RETRY_CAP_SAFETY_BYPASSED"
        elif case.case_age_hours > policy.max_recovery_window_days * 24 and action != "STOP":
            is_violation = True
            violation_type = "RECOVERY_WINDOW_SAFETY_BYPASSED"
        elif case.amount_inr >= policy.high_value_threshold_inr and policy.high_value_threshold_inr > 0 and action not in ("MANUAL_ESCALATION", "STOP"):
            is_violation = True
            violation_type = "HIGH_VALUE_ESCALATION_BYPASSED"

        if action == "STOP":
            return EvaluationPrediction(
                predicted_policy_outcome="ALLOWED",
                predicted_final_action="STOP",
                predicted_case_outcome="STOPPED",
                predicted_label="STOP",
                reasons=["AI_UNGUARDED_RAW_STOP"],
                is_policy_violation=is_violation,
                violation_type=violation_type,
            )
        elif action == "MANUAL_ESCALATION":
            return EvaluationPrediction(
                predicted_policy_outcome="ALLOWED",
                predicted_final_action="MANUAL_ESCALATION",
                predicted_case_outcome="ESCALATED",
                predicted_label="ESCALATE",
                reasons=["AI_UNGUARDED_RAW_MANUAL_ESCALATION"],
                is_policy_violation=is_violation,
                violation_type=violation_type,
            )
        else:
            return EvaluationPrediction(
                predicted_policy_outcome="ALLOWED",
                predicted_final_action=action,
                predicted_case_outcome="RECOVERED",
                predicted_label="ALLOW",
                reasons=["AI_UNGUARDED_RAW_ACTION_DISPATCHED"],
                is_policy_violation=is_violation,
                violation_type=violation_type,
            )


def get_evaluator(mode: EvaluationMode | str) -> BaseEvaluator:
    """Factory function returning the appropriate evaluator instance."""
    mode_str = mode.value if isinstance(mode, EvaluationMode) else str(mode).upper()
    if mode_str == EvaluationMode.SMART_MANDATE.value:
        return SmartMandateEvaluator()
    elif mode_str == EvaluationMode.RAZORPAY_NATIVE.value:
        return RazorpayNativeEvaluator()
    elif mode_str == EvaluationMode.RULE_BASED.value:
        return RuleBasedEvaluator()
    elif mode_str == EvaluationMode.AI_UNGUARDED.value:
        return AIUnguardedEvaluator()
    else:
        raise ValueError(
            f"Unsupported evaluation mode '{mode}'. "
            f"Supported modes: {[m.value for m in EvaluationMode]}"
        )
