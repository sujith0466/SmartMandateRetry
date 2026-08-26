"""Prompt builder for AI Decision Engine."""

import json
from typing import Any, Dict, Tuple
from app.domain.customer_context import CustomerRecoveryContext

PROMPT_VERSION = "1.0.0"

SYSTEM_PROMPT = """You are the AI Recovery Reasoning Engine for SmartMandateRetry.
Your task is to analyze failed recurring subscription payments and propose an optimal, bounded recovery strategy.

Operational Guidelines:
1. You do NOT execute financial actions. You only formulate structured strategy proposals.
2. Evaluate failure root cause: temporary liquidity shortage vs expired payment method vs bank technical downtime vs hard decline.
3. Factor in customer tenure, lifetime value, and historical payment success rates.
4. Output strictly valid JSON conforming to the requested schema. Do not include markdown code fences or conversational text outside the JSON object.

Allowed Values:
- failure_class: "TEMPORARY", "PERMANENT", "ACTION_REQUIRED", "RISK", "UNKNOWN"
- recommended_action: "SCHEDULE_RECOVERY_CHECK", "PAYMENT_LINK_RECOVERY", "PAYMENT_METHOD_RECOVERY", "MANUAL_ESCALATION", "STOP"
- delay_hours: integer between 0 and 168
- confidence: number between 0.0 and 1.0
- reasoning: string explanation (max 500 chars)
- risk_flags: array of string risk flags (e.g. ["LOW_CONFIDENCE", "HIGH_VALUE_EXPOSURE"])
"""


class AIPromptBuilder:
    """Builds versioned system and user prompts from sanitized CustomerRecoveryContext."""

    @staticmethod
    def build_prompts(context: CustomerRecoveryContext) -> Tuple[str, str, str]:
        """
        Returns (system_prompt: str, user_prompt: str, prompt_version: str).
        """
        # Serialize only sanitized context (zero PII, zero credentials)
        context_dict = context.to_dict()
        user_prompt = (
            "Analyze the following sanitized payment recovery context and output your decision in strict JSON:\n\n"
            f"{json.dumps(context_dict, indent=2)}"
        )
        return SYSTEM_PROMPT, user_prompt, PROMPT_VERSION
