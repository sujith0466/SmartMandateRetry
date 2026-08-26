"""OpenRouter AI Gateway Provider Interface with Dynamic Free-Model Failover."""

from abc import ABC, abstractmethod
import json
import time
from typing import Any, Dict, List, Optional
import requests

from app.core.config import get_settings
from app.core.logging import get_logger
from app.infrastructure.openrouter_model_registry import (
    FreeModelRegistry, get_free_model_registry
)

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
    """
    Production provider connecting to OpenRouter API with FREE-ONLY dynamic model discovery,
    strict $0 cost enforcement, and multi-model failover rotation.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: float = 5.0,
        max_attempts: int = 3,
        registry: Optional[FreeModelRegistry] = None,
    ) -> None:
        settings = get_settings()
        self.api_key = api_key or settings.OPENROUTER_API_KEY
        self.base_url = (base_url or settings.OPENROUTER_BASE_URL).rstrip("/")
        self.timeout = timeout
        self.max_attempts = max_attempts
        self.registry = registry or get_free_model_registry()
        self.model = "openrouter_free_pool"

    def _execute_request(self, model_id: str, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        """Execute single chat completion request with JSON mode against a verified free model."""
        # 1. Hard safety assertion: Verify model is strictly FREE ($0 cost)
        if not self.registry.is_model_free(model_id):
            raise ValueError(f"Security/Cost Violation: Refusing to call non-free model '{model_id}'")

        url = f"{self.base_url}/chat/completions"
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "HTTP-Referer": "https://smartmandateretry.internal",
            "X-Title": "SmartMandateRetry",
            "Content-Type": "application/json"
        }
        payload = {
            "model": model_id,
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt}
            ],
            "response_format": {"type": "json_object"},
            "temperature": 0.1
        }

        start_time = time.time()
        resp = requests.post(url, headers=headers, json=payload, timeout=self.timeout)
        resp.raise_for_status()
        latency_ms = (time.time() - start_time) * 1000.0

        data = resp.json()
        content = data["choices"][0]["message"]["content"]
        parsed = json.loads(content)

        # Record successful response
        self.registry.record_success(model_id, latency_ms)
        self.model = model_id  # Update active model name for telemetry

        logger.info(
            "OpenRouter free-model inference succeeded",
            model=model_id,
            latency_ms=round(latency_ms, 2)
        )
        return parsed

    def generate_decision(self, system_prompt: str, user_prompt: str) -> Dict[str, Any]:
        """
        Generate structured decision by selecting from healthy free models and failing over
        across the free model pool upon transient errors.
        """
        # If API key is not configured, fail fast to allow deterministic fallback
        if not self.api_key or self.api_key == "placeholder_key":
            raise RuntimeError("OpenRouter API key is not configured; safe deterministic fallback required")

        excluded_models: List[str] = []
        last_error: Optional[Exception] = None

        for attempt in range(self.max_attempts):
            candidate = self.registry.get_best_free_model(exclude=excluded_models)
            if not candidate:
                break

            model_id = candidate.model_id
            excluded_models.append(model_id)

            try:
                return self._execute_request(model_id, system_prompt, user_prompt)
            except Exception as e:
                last_error = e
                self.registry.record_failure(model_id, error_type=str(e))
                logger.warning(
                    "Free model attempt failed; rotating to next free model",
                    attempt=attempt + 1,
                    failed_model=model_id,
                    error=str(e)
                )

        raise RuntimeError(f"All free model attempts exhausted: {str(last_error)}")


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
        self.model = "mock_deterministic_llm"

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
        timeout=settings.OPENROUTER_TIMEOUT_SECONDS,
        max_attempts=settings.OPENROUTER_MAX_FREE_MODEL_ATTEMPTS
    )
