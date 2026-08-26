"""Unit tests for OpenRouter FreeModelRegistry and catalog discovery."""

from decimal import Decimal
import pytest

from app.infrastructure.openrouter_model_registry import (
    FreeModelDescriptor, FreeModelRegistry, ModelHealth
)


@pytest.fixture
def sample_catalog_response():
    return {
        "data": [
            {
                "id": "nvidia/nemotron-3-nano:free",
                "name": "NVIDIA Nemotron 3 Nano (Free)",
                "pricing": {"prompt": "0", "completion": "0"},
                "context_length": 8192,
                "architecture": {"modality": "text->text"},
                "supported_parameters": ["response_format", "structured_outputs"],
                "is_deprecated": False,
            },
            {
                "id": "openai/gpt-4o",
                "name": "GPT-4o (Paid)",
                "pricing": {"prompt": "0.000005", "completion": "0.000015"},
                "context_length": 128000,
                "architecture": {"modality": "text->text"},
                "supported_parameters": ["response_format"],
                "is_deprecated": False,
            },
            {
                "id": "meta-llama/llama-old:free",
                "name": "Old Llama (Deprecated Free)",
                "pricing": {"prompt": "0", "completion": "0"},
                "context_length": 4096,
                "architecture": {"modality": "text->text"},
                "supported_parameters": [],
                "is_deprecated": True,
            },
            {
                "id": "stability/stable-diffusion-xl",
                "name": "Image Gen (Non-Text)",
                "pricing": {"prompt": "0", "completion": "0"},
                "context_length": 0,
                "architecture": {"modality": "text->image"},
                "supported_parameters": [],
                "is_deprecated": False,
            }
        ]
    }


def test_parse_catalog_isolates_only_free_text_models(sample_catalog_response):
    registry = FreeModelRegistry()
    parsed = registry.parse_catalog(sample_catalog_response)

    assert len(parsed) == 1
    free_model = parsed[0]
    assert free_model.model_id == "nvidia/nemotron-3-nano:free"
    assert free_model.input_price == Decimal("0.0")
    assert free_model.output_price == Decimal("0.0")
    assert free_model.is_free is True
    assert free_model.supports_structured_output is True


def test_paid_and_deprecated_models_rejected(sample_catalog_response):
    registry = FreeModelRegistry()
    parsed = registry.parse_catalog(sample_catalog_response)
    model_ids = [m.model_id for m in parsed]

    assert "openai/gpt-4o" not in model_ids
    assert "meta-llama/llama-old:free" not in model_ids
    assert "stability/stable-diffusion-xl" not in model_ids


def test_is_model_free_verification():
    registry = FreeModelRegistry()
    assert registry.is_model_free("nvidia/nemotron-3-nano:free") is True
    assert registry.is_model_free("openai/gpt-4o") is False
    assert registry.is_model_free("anthropic/claude-3.5-sonnet") is False


def test_cooldown_and_ranking_after_failure():
    registry = FreeModelRegistry()
    models = registry.get_healthy_free_models()
    assert len(models) >= 2

    first_model = models[0].model_id
    # Simulate 429 rate limit failure
    registry.record_failure(first_model, error_type="HTTP 429 Too Many Requests", cooldown_seconds=300)

    # Next call should exclude first_model due to active cooldown
    best = registry.get_best_free_model()
    assert best is not None
    assert best.model_id != first_model
