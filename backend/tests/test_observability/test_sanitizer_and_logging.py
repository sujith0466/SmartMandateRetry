"""Unit tests for PII and secret sanitizer and structured JSON logging."""

import json
import logging
import pytest

from app.core.correlation import CorrelationContext
from app.core.logging import JSONFormatter
from app.core.sanitizer import mask_email, mask_phone, sanitize_data


def test_sanitize_nested_dictionary_secrets():
    payload = {
        "merchant": "merch_123",
        "api_key": "sk-or-v1-super-secret-key-12345",
        "nested": {
            "password": "db_password_xyz",
            "razorpay_key_secret": "rzp_secret_999",
            "openrouter_api_key": "sk-secret",
            "safe_field": "public_data",
        },
        "card_info": {
            "pan": "4111111111111111",
            "cvv": "123",
        },
        "items": [
            {"token": "auth_token_abc"},
            {"name": "subscription_plan"},
        ]
    }

    sanitized = sanitize_data(payload)

    assert sanitized["api_key"] == "[REDACTED]"
    assert sanitized["nested"]["password"] == "[REDACTED]"
    assert sanitized["nested"]["razorpay_key_secret"] == "[REDACTED]"
    assert sanitized["nested"]["openrouter_api_key"] == "[REDACTED]"
    assert sanitized["nested"]["safe_field"] == "public_data"
    assert sanitized["card_info"]["pan"] == "[REDACTED]"
    assert sanitized["card_info"]["cvv"] == "[REDACTED]"
    assert sanitized["items"][0]["token"] == "[REDACTED]"
    assert sanitized["items"][1]["name"] == "subscription_plan"


def test_mask_email_and_phone():
    assert mask_email("john.doe@example.com") == "j***e@example.com"
    assert mask_phone("+919876543210") == "+91******3210"


def test_json_formatter_with_correlation_and_sanitization():
    formatter = JSONFormatter()
    logger = logging.getLogger("test_logger")
    record = logger.makeRecord(
        name="test_logger",
        level=logging.INFO,
        fn="test_file.py",
        lno=10,
        msg="Execution started",
        args=(),
        exc_info=None
    )
    record.extra_fields = {
        "api_key": "secret_key_123",
        "customer_email": "alice.wonder@domain.com",
        "case_id": "case_101"
    }

    with CorrelationContext("corr_test_ctx_999"):
        formatted_json = formatter.format(record)
        data = json.loads(formatted_json)

        assert data["level"] == "INFO"
        assert data["message"] == "Execution started"
        assert data["correlation_id"] == "corr_test_ctx_999"
        assert data["api_key"] == "[REDACTED]"
        assert data["case_id"] == "case_101"
        assert "@" in data["customer_email"]
