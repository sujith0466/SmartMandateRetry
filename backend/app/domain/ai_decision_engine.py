"""AI Decision Engine orchestrating prompt generation, LLM invocation, and fallback."""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
import uuid

from app.core.config import get_settings
from app.core.logging import get_logger
from app.domain.ai_decision_schemas import AIDecisionOutput, AIDecisionResult, RecommendedActionEnum
from app.domain.ai_decision_validator import AIDecisionValidator
from app.domain.ai_fallback_engine import FallbackDecisionEngine
from app.domain.ai_prompt_builder import AIPromptBuilder
from app.domain.ai_risk_evaluator import AIRiskEvaluator
from app.domain.customer_context import CustomerRecoveryContext
from app.infrastructure.openrouter import LLMProvider, get_llm_provider

logger = get_logger("smartmandate.ai_decision_engine")


class AIDecisionEngine:
    """Core reasoning engine generating validated recovery recommendations."""

    def __init__(self, provider: Optional[LLMProvider] = None) -> None:
        self.provider = provider or get_llm_provider()
        self.settings = get_settings()

    def evaluate(self, context: CustomerRecoveryContext) -> AIDecisionResult:
        """
        Evaluate customer recovery context through LLM reasoning with deterministic fail-safe fallback.
        """
        system_prompt, user_prompt, prompt_version = AIPromptBuilder.build_prompts(context)
        model_name = getattr(self.provider, "model", "mock_llm_model")

        # 1. Invoke LLM Provider with error trapping
        try:
            raw_response = self.provider.generate_decision(
                system_prompt=system_prompt,
                user_prompt=user_prompt
            )
        except Exception as e:
            logger.warning(
                "OpenRouter provider invocation failed; triggering fallback",
                case_id=context.case.case_id,
                error=str(e)
            )
            return FallbackDecisionEngine.create_fallback(
                context=context,
                reason=f"LLM invocation error: {str(e)}",
                model_name=model_name
            )

        # 2. Validate Schema Output
        is_valid, validated_output, validation_err = AIDecisionValidator.validate(raw_response)
        if not is_valid or validated_output is None:
            logger.warning(
                "OpenRouter response failed schema validation; triggering fallback",
                case_id=context.case.case_id,
                error=validation_err
            )
            return FallbackDecisionEngine.create_fallback(
                context=context,
                reason=f"Schema validation failed: {validation_err}",
                model_name=model_name
            )

        # 3. Evaluate Contextual Risk Flags
        enhanced_risk_flags = AIRiskEvaluator.evaluate_risks(validated_output, context)

        # 4. Check Confidence Threshold (<0.75 routes to MANUAL_ESCALATION fallback)
        if validated_output.confidence < Decimal("0.75"):
            logger.info(
                "AI decision confidence below threshold (0.75); routing to MANUAL_ESCALATION fallback",
                case_id=context.case.case_id,
                confidence=str(validated_output.confidence),
            )
            return FallbackDecisionEngine.create_fallback(
                context=context,
                reason=f"Low AI confidence ({validated_output.confidence})",
                model_name=model_name
            )

        decision_id = f"dec_{uuid.uuid4().hex[:12]}"
        decision_result = AIDecisionResult(
            decision_id=decision_id,
            case_id=context.case.case_id,
            failure_class=validated_output.failure_class,
            recommended_action=validated_output.recommended_action,
            delay_hours=validated_output.delay_hours,
            confidence=validated_output.confidence,
            reasoning=validated_output.reasoning,
            risk_flags=enhanced_risk_flags,
            model=model_name,
            prompt_version=prompt_version,
            is_fallback=False,
        )

        logger.info(
            "AI recovery decision generated successfully",
            decision_id=decision_result.decision_id,
            case_id=decision_result.case_id,
            recommended_action=decision_result.recommended_action.value,
            confidence=str(decision_result.confidence),
            is_fallback=decision_result.is_fallback,
        )

        return decision_result
