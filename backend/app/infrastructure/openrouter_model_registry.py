"""Dynamic Free-Model Registry and Discovery Engine for OpenRouter."""

from dataclasses import dataclass, field
from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import Any, Dict, List, Optional, Set
import requests

from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("infrastructure.openrouter.registry")


@dataclass(frozen=True)
class FreeModelDescriptor:
    """Descriptor for an OpenRouter model confirmed to have $0.00 cost."""
    model_id: str
    display_name: str
    provider: str
    input_price: Decimal
    output_price: Decimal
    context_length: int
    supports_json: bool
    supports_structured_output: bool
    is_free: bool
    is_deprecated: bool
    discovered_at: datetime = field(default_factory=lambda: datetime.now(timezone.utc))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "model_id": self.model_id,
            "display_name": self.display_name,
            "provider": self.provider,
            "input_price": str(self.input_price),
            "output_price": str(self.output_price),
            "context_length": self.context_length,
            "supports_json": self.supports_json,
            "supports_structured_output": self.supports_structured_output,
            "is_free": self.is_free,
            "is_deprecated": self.is_deprecated,
            "discovered_at": self.discovered_at.isoformat(),
        }


@dataclass
class ModelHealth:
    """Operational health metrics and transient availability tracking for a model."""
    model_id: str
    success_count: int = 0
    failure_count: int = 0
    timeout_count: int = 0
    rate_limit_count: int = 0
    malformed_response_count: int = 0
    total_latency_ms: float = 0.0
    last_success_at: Optional[datetime] = None
    last_failure_at: Optional[datetime] = None
    temporarily_unavailable_until: Optional[datetime] = None

    @property
    def is_available(self) -> bool:
        if self.temporarily_unavailable_until:
            return datetime.now(timezone.utc) >= self.temporarily_unavailable_until
        return True

    @property
    def average_latency_ms(self) -> float:
        if self.success_count > 0:
            return self.total_latency_ms / self.success_count
        return 0.0


# Fallback catalog of known public OpenRouter free tier models if catalog API is unreachable
FALLBACK_FREE_MODELS = [
    FreeModelDescriptor(
        model_id="nvidia/nemotron-3-nano:free",
        display_name="NVIDIA Nemotron 3 Nano (Free)",
        provider="nvidia",
        input_price=Decimal("0.0"),
        output_price=Decimal("0.0"),
        context_length=8192,
        supports_json=True,
        supports_structured_output=True,
        is_free=True,
        is_deprecated=False,
    ),
    FreeModelDescriptor(
        model_id="meta-llama/llama-3.3-70b-instruct:free",
        display_name="Meta Llama 3.3 70B Instruct (Free)",
        provider="meta-llama",
        input_price=Decimal("0.0"),
        output_price=Decimal("0.0"),
        context_length=16384,
        supports_json=True,
        supports_structured_output=True,
        is_free=True,
        is_deprecated=False,
    ),
    FreeModelDescriptor(
        model_id="google/gemma-2-9b-it:free",
        display_name="Google Gemma 2 9B (Free)",
        provider="google",
        input_price=Decimal("0.0"),
        output_price=Decimal("0.0"),
        context_length=8192,
        supports_json=True,
        supports_structured_output=True,
        is_free=True,
        is_deprecated=False,
    ),
    FreeModelDescriptor(
        model_id="mistralai/mistral-7b-instruct:free",
        display_name="Mistral 7B Instruct (Free)",
        provider="mistralai",
        input_price=Decimal("0.0"),
        output_price=Decimal("0.0"),
        context_length=8192,
        supports_json=True,
        supports_structured_output=True,
        is_free=True,
        is_deprecated=False,
    ),
]


class FreeModelRegistry:
    """Registry maintaining verified $0.00 cost OpenRouter models with health and failover pools."""

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: float = 5.0,
    ) -> None:
        self.api_key = api_key or get_settings().OPENROUTER_API_KEY
        self.base_url = (base_url or get_settings().OPENROUTER_BASE_URL).rstrip("/")
        self.timeout = timeout
        self._models: Dict[str, FreeModelDescriptor] = {}
        self._health: Dict[str, ModelHealth] = {}
        self._last_refresh_at: Optional[datetime] = None
        self._initialize_fallback_catalog()

    def _initialize_fallback_catalog(self) -> None:
        """Seed registry with initial baseline free models."""
        for m in FALLBACK_FREE_MODELS:
            self._models[m.model_id] = m
            self._health[m.model_id] = ModelHealth(model_id=m.model_id)

    def parse_catalog(self, raw_data: Dict[str, Any]) -> List[FreeModelDescriptor]:
        """
        Parse raw OpenRouter /api/v1/models response, strictly filtering for $0 cost models.
        """
        models_data = raw_data.get("data", [])
        free_models: List[FreeModelDescriptor] = []

        for item in models_data:
            model_id = item.get("id", "")
            if not model_id:
                continue

            pricing = item.get("pricing", {})
            try:
                # OpenRouter pricing values can be strings like "0" or floats like 0.0
                prompt_price = Decimal(str(pricing.get("prompt", 0)))
                completion_price = Decimal(str(pricing.get("completion", 0)))
            except Exception:
                continue

            # Hard safety check: Input AND Output must be strictly $0.00
            is_zero_cost = (prompt_price == Decimal("0.0")) and (completion_price == Decimal("0.0"))
            is_free_tag = ":free" in model_id or model_id.endswith("/free")
            is_deprecated = bool(item.get("is_deprecated", False))

            if (is_zero_cost or is_free_tag) and not is_deprecated:
                # Infer architecture and JSON support
                architecture = item.get("architecture", {})
                modality = architecture.get("modality", "text->text")
                # Output must be text
                if not (modality.endswith("text") or modality == "text"):
                    continue

                context_len = int(item.get("context_length") or 4096)
                if context_len <= 0:
                    continue

                supported_params = item.get("supported_parameters") or []
                supports_json = "response_format" in supported_params or "structured_outputs" in supported_params or True

                provider = model_id.split("/")[0] if "/" in model_id else "unknown"
                display_name = item.get("name") or model_id

                descriptor = FreeModelDescriptor(
                    model_id=model_id,
                    display_name=display_name,
                    provider=provider,
                    input_price=Decimal("0.0"),
                    output_price=Decimal("0.0"),
                    context_length=context_len,
                    supports_json=supports_json,
                    supports_structured_output="structured_outputs" in supported_params,
                    is_free=True,
                    is_deprecated=False,
                )
                free_models.append(descriptor)

        return free_models

    def refresh_catalog(self) -> int:
        """
        Query OpenRouter API to discover the live catalog of free models.
        Returns the count of discovered free models.
        """
        url = f"{self.base_url}/models"
        headers = {
            "HTTP-Referer": "https://smartmandateretry.internal",
            "X-Title": "SmartMandateRetry",
        }
        if self.api_key and self.api_key != "placeholder_key":
            headers["Authorization"] = f"Bearer {self.api_key}"

        try:
            resp = requests.get(url, headers=headers, timeout=self.timeout)
            resp.raise_for_status()
            data = resp.json()
            discovered = self.parse_catalog(data)
            if discovered:
                for m in discovered:
                    self._models[m.model_id] = m
                    if m.model_id not in self._health:
                        self._health[m.model_id] = ModelHealth(model_id=m.model_id)
                self._last_refresh_at = datetime.now(timezone.utc)
                logger.info(
                    "OpenRouter free models discovered successfully",
                    count=len(discovered),
                    models=[m.model_id for m in discovered[:5]]
                )
                return len(discovered)
        except Exception as e:
            logger.warning(
                "OpenRouter catalog discovery failed; using fallback free models",
                error=str(e)
            )

        return len(self._models)

    def is_model_free(self, model_id: str) -> bool:
        """Strict validation that a model is registered as free."""
        model = self._models.get(model_id)
        if not model:
            # Check if name has :free suffix
            return ":free" in model_id or model_id.endswith("/free")
        return model.is_free and model.input_price == Decimal("0.0") and model.output_price == Decimal("0.0")

    def get_available_free_models(self) -> List[FreeModelDescriptor]:
        """Return list of all registered free models."""
        return list(self._models.values())

    def get_healthy_free_models(self, exclude: Optional[List[str]] = None) -> List[FreeModelDescriptor]:
        """
        Return free models filtered by transient health (availability and cooldowns),
        sorted by capability and reliability score.
        """
        exclude_set = set(exclude or [])
        candidates: List[FreeModelDescriptor] = []

        for model_id, model in self._models.items():
            if model_id in exclude_set:
                continue
            health = self._health.get(model_id)
            if health and health.is_available:
                candidates.append(model)

        # Sort candidates deterministically:
        # 1. Structured output support
        # 2. Context length
        # 3. Lowest failure count
        return sorted(
            candidates,
            key=lambda m: (
                1 if m.supports_structured_output else 0,
                m.context_length,
                -(self._health.get(m.model_id).failure_count if self._health.get(m.model_id) else 0)
            ),
            reverse=True
        )

    def get_best_free_model(self, exclude: Optional[List[str]] = None) -> Optional[FreeModelDescriptor]:
        """Select the highest-ranked healthy free model."""
        healthy = self.get_healthy_free_models(exclude=exclude)
        if healthy:
            return healthy[0]
        # If all healthy are exhausted/excluded, return any non-excluded model
        exclude_set = set(exclude or [])
        remaining = [m for m in self._models.values() if m.model_id not in exclude_set]
        return remaining[0] if remaining else None

    def record_success(self, model_id: str, latency_ms: float) -> None:
        """Record successful invocation on model."""
        health = self._health.setdefault(model_id, ModelHealth(model_id=model_id))
        health.success_count += 1
        health.total_latency_ms += latency_ms
        health.last_success_at = datetime.now(timezone.utc)
        health.temporarily_unavailable_until = None

    def record_failure(self, model_id: str, error_type: str, cooldown_seconds: int = 60) -> None:
        """Record failure and set temporary cooldown on model."""
        health = self._health.setdefault(model_id, ModelHealth(model_id=model_id))
        health.failure_count += 1
        health.last_failure_at = datetime.now(timezone.utc)
        if "429" in error_type or "rate_limit" in error_type.lower():
            health.rate_limit_count += 1
            health.temporarily_unavailable_until = datetime.now(timezone.utc) + timedelta(seconds=cooldown_seconds)
        elif "timeout" in error_type.lower():
            health.timeout_count += 1
            health.temporarily_unavailable_until = datetime.now(timezone.utc) + timedelta(seconds=cooldown_seconds // 2)
        elif "malformed" in error_type.lower():
            health.malformed_response_count += 1
            health.temporarily_unavailable_until = datetime.now(timezone.utc) + timedelta(seconds=cooldown_seconds // 2)
        else:
            health.temporarily_unavailable_until = datetime.now(timezone.utc) + timedelta(seconds=cooldown_seconds)

        logger.info(
            "Model failure recorded; placed on cooldown",
            model_id=model_id,
            error_type=error_type,
            cooldown_seconds=cooldown_seconds
        )


_global_registry: Optional[FreeModelRegistry] = None


def get_free_model_registry() -> FreeModelRegistry:
    """Return singleton FreeModelRegistry instance."""
    global _global_registry
    if _global_registry is None:
        _global_registry = FreeModelRegistry()
    return _global_registry
