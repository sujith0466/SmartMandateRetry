"""Tests for configuration validation and defaults."""

from app.core.config import Settings


def test_default_settings():
    """Verify settings loads expected baseline defaults."""
    settings = Settings()
    assert settings.APP_NAME == "SmartMandateRetry"
    assert settings.POLICY_MAX_RETRIES == 3
    assert settings.POLICY_MIN_INTERVAL_HOURS == 24
    assert settings.POLICY_MIN_CONFIDENCE == 0.75
    assert settings.LLM_PROVIDER in ["openrouter", "mock"]
