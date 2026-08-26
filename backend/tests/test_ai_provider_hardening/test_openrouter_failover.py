"""Unit and failover tests for OpenRouterProvider free-only rotation."""

import json
from decimal import Decimal
import pytest
import requests
from unittest.mock import MagicMock, patch

from app.domain.ai_decision_engine import AIDecisionEngine
from app.domain.ai_decision_schemas import RecommendedActionEnum
from app.domain.customer_context import (
    CaseContext, CustomerProfileContext, CustomerRecoveryContext,
    DataQualityContext, PaymentHistoryContext, RecoveryHistoryContext,
    SubscriptionContext
)
from app.domain.failure_assessment import FailureAssessment
from app.domain.failure_taxonomy import FailureCategory, Recoverability, Severity
from app.infrastructure.openrouter import OpenRouterProvider
from app.infrastructure.openrouter_model_registry import FreeModelRegistry


@pytest.fixture
def mock_context() -> CustomerRecoveryContext:
    from datetime import datetime, timezone
    now = datetime(2026, 8, 26, 12, 0, 0, tzinfo=timezone.utc)
    return CustomerRecoveryContext(
        case=CaseContext("c_1", "inv_1", Decimal("1500.00"), "INR", "HALTED_RECOVERY", "DETECTED", now, 1),
        subscription=SubscriptionContext("s_1", "halted", "p_1", 2, now, 30),
        customer=CustomerProfileContext("cust_1", 2, Decimal("1.00"), "a***b@c.com", "+91******0000"),
        payment_history=PaymentHistoryContext(2, 1, 1, 1, 1, 2, "LOW"),
        recovery_history=RecoveryHistoryContext(0, 0, 0, None, None, None),
        failure_assessment=FailureAssessment(
            "ass_1", "razorpay", "pay_1", "s_1", "inv_1",
            FailureCategory.TEMPORARY_LIQUIDITY, "INSUFFICIENT_FUNDS",
            "insufficient_funds", "ERR", Recoverability.RECOVERABLE, Severity.LOW,
            Decimal("1.00"), {}, False
        ),
        quality=DataQualityContext("1.0.0", Decimal("1.00"), False, [])
    )


def test_free_only_guard_rejects_paid_model():
    registry = FreeModelRegistry()
    provider = OpenRouterProvider(api_key="test_key", registry=registry)

    # Attempting to call non-free model directly should raise ValueError
    with pytest.raises(ValueError) as exc_info:
        provider._execute_request("openai/gpt-4o", "sys", "usr")
    assert "Refusing to call non-free model" in str(exc_info.value)


@patch("requests.post")
def test_openrouter_rotates_on_429_rate_limit(mock_post):
    # First response: 429 Rate Limit
    resp_429 = MagicMock()
    resp_429.raise_for_status.side_effect = requests.exceptions.HTTPError("429 Too Many Requests")

    # Second response: 200 OK with valid JSON
    resp_200 = MagicMock()
    resp_200.raise_for_status.return_value = None
    resp_200.json.return_value = {
        "choices": [
            {
                "message": {
                    "content": json.dumps({
                        "failure_class": "TEMPORARY",
                        "recommended_action": "SCHEDULE_RECOVERY_CHECK",
                        "delay_hours": 48,
                        "confidence": 0.95,
                        "reasoning": "Recovered via failover free model.",
                        "risk_flags": []
                    })
                }
            }
        ]
    }
    mock_post.side_effect = [resp_429, resp_200]

    registry = FreeModelRegistry()
    provider = OpenRouterProvider(api_key="test_key", registry=registry, max_attempts=3)

    decision = provider.generate_decision("sys_prompt", "user_prompt")
    assert decision["recommended_action"] == "SCHEDULE_RECOVERY_CHECK"
    assert mock_post.call_count == 2


@patch("requests.post")
def test_openrouter_all_models_fail_triggers_safe_deterministic_fallback(mock_post, mock_context):
    # Simulate all requests failing with timeout
    mock_post.side_effect = requests.exceptions.Timeout("Connection timeout")

    registry = FreeModelRegistry()
    provider = OpenRouterProvider(api_key="test_key", registry=registry, max_attempts=2)
    engine = AIDecisionEngine(provider=provider)

    result = engine.evaluate(mock_context)
    # Must safely degrade to deterministic fallback
    assert result.is_fallback is True
    assert result.recommended_action == RecommendedActionEnum.MANUAL_ESCALATION
    assert "LLM invocation error" in result.reasoning
