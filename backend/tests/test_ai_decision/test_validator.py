"""Unit tests for AIDecisionValidator."""

from decimal import Decimal
import pytest

from app.domain.ai_decision_schemas import FailureClassEnum, RecommendedActionEnum
from app.domain.ai_decision_validator import AIDecisionValidator


def test_validator_valid_payload():
    payload = {
        "failure_class": "TEMPORARY",
        "recommended_action": "SCHEDULE_RECOVERY_CHECK",
        "delay_hours": 48,
        "confidence": 0.95,
        "reasoning": "Transient balance issue with established customer.",
        "risk_flags": []
    }

    is_valid, output, err = AIDecisionValidator.validate(payload)
    assert is_valid is True
    assert output is not None
    assert output.failure_class == FailureClassEnum.TEMPORARY
    assert output.recommended_action == RecommendedActionEnum.SCHEDULE_RECOVERY_CHECK
    assert output.delay_hours == 48
    assert output.confidence == Decimal("0.95")
    assert err == ""


def test_validator_rejects_invalid_action():
    payload = {
        "failure_class": "TEMPORARY",
        "recommended_action": "INVALID_ACTION_NAME",
        "delay_hours": 24,
        "confidence": 0.90,
        "reasoning": "Invalid action test",
    }
    is_valid, output, err = AIDecisionValidator.validate(payload)
    assert is_valid is False
    assert output is None
    assert "Input should be" in err or "validation error" in err.lower()


def test_validator_rejects_out_of_bounds_values():
    # Negative delay
    is_valid, _, _ = AIDecisionValidator.validate({
        "failure_class": "TEMPORARY",
        "recommended_action": "STOP",
        "delay_hours": -5,
        "confidence": 0.9,
        "reasoning": "Negative delay"
    })
    assert is_valid is False

    # Confidence > 1.0
    is_valid, _, _ = AIDecisionValidator.validate({
        "failure_class": "TEMPORARY",
        "recommended_action": "STOP",
        "delay_hours": 0,
        "confidence": 1.5,
        "reasoning": "Excess confidence"
    })
    assert is_valid is False
