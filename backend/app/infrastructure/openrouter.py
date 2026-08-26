"""OpenRouter AI Gateway Provider Interface and Implementation."""

from abc import ABC, abstractmethod
import json
from typing import Any, Dict, Optional
import requests

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("infrastructure.openrouter")


class LLMProvider(ABC):
    """Abstract base class for AI decision providers."""

    @abstractmethod
    def generate_decision(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        """Generate structured recovery decision JSON from prompts."""
        pass

    def generate_recovery_plan(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Backward compatibility helper."""
        return self.generate_decision("You are an AI decision engine.", json.dumps(context))


class OpenRouterProvider(LLMProvider):
    """Production provider connecting to OpenRouter API with JSON mode."""

    def __init__(self, api_key: str, base_url: str, model: str, timeout: float = 5.0):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.model = model
        self.timeout = timeout

    def generate_decision(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
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
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1
        }

        response = requests.post(url, headers=headers, json=payload, timeout=self.timeout)
        response.raise_for_status()
        data = response.json()
        content = data["choices"][0]["message"]["content"]
        return json.loads(content)


class MockLLMProvider(LLMProvider):
    """Deterministic mock provider for unit and integration testing without external API calls."""

    def __init__(self, predefined_response: Optional[Dict[str, Any]] = None):
        self.predefined_response = predefined_response or {
            "failure_class": "TEMPORARY",
            "recommended_action": "SCHEDULE_RECOVERY_CHECK",
            "delay_hours": 48,
            "confidence": 0.92,
            "reasoning": "Mock provider response for automated testing.",
            "risk_flags": []
        }

    def generate_decision(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
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
