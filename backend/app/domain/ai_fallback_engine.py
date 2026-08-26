"""Deterministic safe fallback engine for AI Decision failures."""

from decimal import Decimal
from typing import List, Optional
import uuid

from app.domain.ai_decision_schemas import AIDecisionResult, FailureClassEnum, RecommendedActionEnum
from app.domain.customer_context import CustomerRecoveryContext
from app.domain.failure_taxonomy import FailureCategory

PROMPT_VERSION = "1.0.0"


class FallbackDecisionEngine:
    """Produces deterministic, fail-safe recovery decisions when AI reasoning fails."""

    @staticmethod
    def create_fallback(
        context: CustomerRecoveryContext,
        reason: str,
        model_name: str = "deterministic_fallback_engine"
    ) -> AIDecisionResult:
        """
        Generate a safe, explainable fallback decision based on deterministic context:
        - If failure is PERMANENT_HARD_DECLINE -> recommended_action = STOP
        - All other cases -> recommended_action = MANUAL_ESCALATION
        """
        decision_id = f"dec_fb_{uuid.uuid4().hex[:12]}"
        is_hard = (
            context.failure_assessment.is_hard_decline or
            context.failure_assessment.failure_category == FailureCategory.PERMANENT_HARD_DECLINE
        )

        if is_hard:
            failure_class = FailureClassEnum.PERMANENT
            recommended_action = RecommendedActionEnum.STOP
            delay_hours = 0
            confidence = Decimal("1.00")
            reasoning = f"Deterministic fallback: Hard decline detected ({reason})."
            risk_flags = ["HARD_DECLINE_DETECTED", "DETERMINISTIC_FALLBACK"]
        else:
            failure_class = FailureClassEnum.UNKNOWN
            recommended_action = RecommendedActionEnum.MANUAL_ESCALATION
            delay_hours = 0
            confidence = Decimal("0.50")
            reasoning = f"Deterministic fallback: Safe escalation due to ({reason})."
            risk_flags = ["LLM_FALLBACK", "MANUAL_REVIEW_REQUIRED"]

        return AIDecisionResult(
            decision_id=decision_id,
            case_id=context.case.case_id,
            failure_class=failure_class,
            recommended_action=recommended_action,
            delay_hours=delay_hours,
            confidence=confidence,
            reasoning=reasoning[:500],
            risk_flags=risk_flags,
            model=model_name,
            prompt_version=PROMPT_VERSION,
            is_fallback=True,
        )
