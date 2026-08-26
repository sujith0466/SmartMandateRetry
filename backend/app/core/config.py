"""Application configuration management using pydantic-settings."""

import os
from functools import lru_cache
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # Application Info
    APP_NAME: str = "SmartMandateRetry"
    APP_ENV: str = "development"
    APP_DEBUG: bool = False
    APP_SECRET_KEY: str = "dev_secret_key_placeholder_change_in_production"
    PORT: int = 5000

    # PostgreSQL Database
    DATABASE_URL: str = "postgresql://postgres:postgres@localhost:5432/smartmandate_db"

    # Redis Queue & Cache
    REDIS_URL: str = "redis://localhost:6379/0"

    # Razorpay Credentials (Test Mode Default)
    RAZORPAY_KEY_ID: str = "rzp_test_placeholder"
    RAZORPAY_KEY_SECRET: str = "secret_placeholder"
    RAZORPAY_WEBHOOK_SECRET: str = "whsec_placeholder"

    # AI Gateway (OpenRouter)
    LLM_PROVIDER: str = "openrouter"
    OPENROUTER_API_KEY: str = "placeholder_key"
    OPENROUTER_BASE_URL: str = "https://openrouter.ai/api/v1"
    OPENROUTER_MODEL: str = "google/gemini-2.0-flash-001"
    OPENROUTER_TIMEOUT_SECONDS: float = 5.0
    OPENROUTER_MAX_RETRIES: int = 2
    OPENROUTER_FREE_ONLY: bool = True
    OPENROUTER_MODEL_DISCOVERY_ENABLED: bool = True
    OPENROUTER_MODEL_REFRESH_MINUTES: int = 30
    OPENROUTER_MAX_FREE_MODEL_ATTEMPTS: int = 3

    # Policy Defaults
    POLICY_MAX_RETRIES: int = 3
    POLICY_MIN_INTERVAL_HOURS: int = 24
    POLICY_MAX_WINDOW_DAYS: int = 14
    POLICY_MIN_CONFIDENCE: float = 0.75
    POLICY_HIGH_VALUE_INR: float = 10000.00
    POLICY_MAX_CONTACTS: int = 3

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore"
    )


@lru_cache()
def get_settings() -> Settings:
    """Return cached settings instance."""
    return Settings()
