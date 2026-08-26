"""Phase 20: Production Configuration and Environment Audit Tests."""

import pytest
from app.core.config import Settings, get_settings


class TestProductionConfiguration:
    def test_settings_default_safety_invariants(self):
        """Audit: Default configuration must enforce zero-cost AI and safe limits."""
        settings = Settings()
        assert settings.OPENROUTER_FREE_ONLY is True
        assert settings.OPENROUTER_TIMEOUT_SECONDS <= 10.0
        assert settings.OPENROUTER_MAX_RETRIES <= 3
        assert settings.POLICY_MAX_RETRIES <= 10
        assert settings.POLICY_MAX_WINDOW_DAYS <= 60

    def test_production_environment_overrides(self, monkeypatch):
        """Audit: Production environment safely loads all operational overrides."""
        monkeypatch.setenv("APP_ENV", "production")
        monkeypatch.setenv("APP_DEBUG", "false")
        monkeypatch.setenv("APP_SECRET_KEY", "prod_super_secret_key_min_32_characters_long_12345")
        monkeypatch.setenv("DATABASE_URL", "postgresql://prod_user:prod_pass@prod-db.internal:5432/smartmandate_prod")
        monkeypatch.setenv("REDIS_URL", "redis://prod-redis.internal:6379/0")

        prod_settings = Settings()
        assert prod_settings.APP_ENV == "production"
        assert prod_settings.APP_DEBUG is False
        assert prod_settings.DATABASE_URL.startswith("postgresql://prod_user")
        assert prod_settings.REDIS_URL == "redis://prod-redis.internal:6379/0"
        assert prod_settings.OPENROUTER_FREE_ONLY is True
