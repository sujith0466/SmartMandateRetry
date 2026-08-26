"""Validation engine for AI decision structured outputs."""

from typing import Any, Dict, Tuple
from pydantic import ValidationError

from app.domain.ai_decision_schemas import AIDecisionOutput


class AIDecisionValidator:
    """Validates raw LLM dictionary responses against the strict AIDecisionOutput schema."""

    @staticmethod
    def validate(raw_data: Dict[str, Any]) -> Tuple[bool, AIDecisionOutput, str]:
        """
        Validate raw dictionary from LLM.
        Returns (is_valid: bool, validated_output: Optional[AIDecisionOutput], error_message: str).
        """
        try:
            output = AIDecisionOutput.model_validate(raw_data)
            return True, output, ""
        except ValidationError as e:
            return False, None, str(e)
        except Exception as e:
            return False, None, f"Unexpected validation error: {str(e)}"
