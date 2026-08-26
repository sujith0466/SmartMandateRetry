"""Unit tests for ContextSanitizer."""

import pytest
from app.domain.context_sanitizer import ContextSanitizer


def test_mask_email_standard():
    assert ContextSanitizer.mask_email("john.doe@example.com") == "j***e@example.com"
    assert ContextSanitizer.mask_email("alice@domain.org") == "a***e@domain.org"


def test_mask_email_short_and_edge_cases():
    assert ContextSanitizer.mask_email("ab@domain.com") == "a*@domain.com"
    assert ContextSanitizer.mask_email("") is None
    assert ContextSanitizer.mask_email(None) is None
    assert ContextSanitizer.mask_email("notanemail") is None


def test_mask_contact_standard_and_short():
    assert ContextSanitizer.mask_contact("+919876543210") == "+91******3210"
    assert ContextSanitizer.mask_contact("9876543210") == "98******3210"
    assert ContextSanitizer.mask_contact("12345") == "******"
    assert ContextSanitizer.mask_contact("") is None
    assert ContextSanitizer.mask_contact(None) is None


def test_scrub_dict_removes_sensitive_keys():
    data = {
        "user_id": "usr_123",
        "api_key": "secret_key_123",
        "webhook_secret": "whsec_456",
        "token": "tok_789",
        "nested": {
            "password": "pass",
            "safe_field": "visible_value"
        },
        "items": [
            {"card_number": "4111222233334444", "status": "active"}
        ]
    }

    scrubbed = ContextSanitizer.scrub_dict(data)
    assert scrubbed["user_id"] == "usr_123"
    assert scrubbed["api_key"] == "[REDACTED]"
    assert scrubbed["webhook_secret"] == "[REDACTED]"
    assert scrubbed["token"] == "[REDACTED]"
    assert scrubbed["nested"]["password"] == "[REDACTED]"
    assert scrubbed["nested"]["safe_field"] == "visible_value"
    assert scrubbed["items"][0]["card_number"] == "[REDACTED]"
    assert scrubbed["items"][0]["status"] == "active"
