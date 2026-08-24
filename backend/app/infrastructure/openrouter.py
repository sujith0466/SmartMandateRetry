"""OpenRouter AI Gateway Provider Interface and Implementation."""

import json
from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
import requests
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("infrastructure.openrouter")


class LLMProvider(ABC):
    """Abstract base class for AI decision providers."""

    @abstractmethod
    def generate_recovery_plan(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Generate structured recovery plan JSON from context."""
        pass


class OpenRouterProvider(LLMProvider):
    """Production provider connecting to OpenRouter API."""

    def __init__(self, api_key: str, base_url: str, model: str, timeout: float = 5.0):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout

    def generate_recovery_plan(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute OpenRouter chat completion request with JSON mode."""
        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://smartmandateretry.internal",
            "X-Title": "SmartMandateRetry",
            "Content-Type": "application/json"
        }
        payload = {
            "model": self.model,
            "messages": [
                {
                    "role": "system",
                    "content": (
                        "You are the AI Recovery Reasoning Engine for SmartMandateRetry. "
                        "Analyze the payment failure context and propose a bounded recovery strategy in strict JSON."
                    )
                },
                {
                    "role": "user",
                    "content": json.dumps(context)
                }
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1
        }

        try:
            response = requests.post(url, headers=headers, json=payload, timeout=self.timeout)
            response.raise_for_status()
            data = response.json()
            content = data["choices"][0]["message"]["content"]
            return json.loads(content)
        except Exception as e:
            logger.error("OpenRouter invocation error", exc_info=True)
            # Fail-closed safe fallback
            return {
                "failure_class": "UNKNOWN",
                "recommended_action": "MANUAL_ESCALATION",
                "delay_hours": 0,
                "confidence": 0.0,
                "reasoning": f"AI service unavailable or returned invalid output: {str(e)}",
                "risk_flags": ["LLM_ERROR"]
            }


class MockLLMProvider(LLMProvider):
    """Deterministic mock provider for unit and E2E testing without external API calls."""

    def __init__(self, predefined_response: Optional[Dict[str, Any]] = None):
        self.predefined_response = predefined_response or {
            "failure_class": "TEMPORARY",
            "recommended_action": "PAYMENT_LINK_RECOVERY",
            "delay_hours": 48,
            "confidence": 0.92,
            "reasoning": "Mock provider response for automated testing.",
            "risk_flags": []
        }

    def generate_recovery_plan(self, context: Dict[str, Any]) -> Dict[str, Any]:
        return self.predefined_response


def get_llm_provider() -> LLMProvider:
    """Factory returning configured LLM provider."""
    settings = get_settings()
    if settings.LLM_PROVIDER == "mock" or settings.APP_ENV == "testing":
        return MockLLMProvider()
    return OpenRouterProvider(
        api_key=settings.OPENROUTER_API_KEY,
        base_url=settings.OPENROUTER_BASE_URL,
        model=settings.OPENROUTER_MODEL,
        timeout=settings.OPENROUTER_TIMEOUT_SECONDS
    )
