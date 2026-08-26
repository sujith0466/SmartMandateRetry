"""Sanitizer for customer recovery context ensuring PII masking and secret scrubbing."""

import re
from typing import Any, Dict, Optional

SENSITIVE_KEYS = {
    "secret", "api_key", "webhook_secret", "razorpay_key_secret",
    "razorpay_webhook_secret", "openrouter_api_key", "password",
    "token", "authorization", "cvv", "card_number"
}


class ContextSanitizer:
    """Provides deterministic masking of PII and scrubbing of sensitive keys."""

    @staticmethod
    def mask_email(email: Optional[str]) -> Optional[str]:
        """
        Mask email address while preserving first/last characters of local part and domain.
        Example: 'john.doe@example.com' -> 'j***e@example.com'
        """
        if not email or "@" not in email:
            return None
        parts = email.strip().split("@")
        local, domain = parts[0], parts[1]
        if len(local) <= 2:
            masked_local = local[0] + "*"
        else:
            masked_local = local[0] + "***" + local[-1]
        return f"{masked_local}@{domain}"

    @staticmethod
    def mask_contact(contact: Optional[str]) -> Optional[str]:
        """
        Mask phone number preserving country prefix and last 4 digits.
        Example: '+919876543210' -> '+91******3210'
        """
        if not contact:
            return None
        clean = contact.strip()
        if len(clean) <= 6:
            return "******"
        prefix = clean[:3] if clean.startswith("+") else clean[:2]
        suffix = clean[-4:]
        return f"{prefix}******{suffix}"

    @classmethod
    def scrub_dict(cls, data: Dict[str, Any]) -> Dict[str, Any]:
        """Recursively scrub any sensitive keys from dictionaries."""
        scrubbed = {}
        for k, v in data.items():
            if k.lower() in SENSITIVE_KEYS:
                scrubbed[k] = "[REDACTED]"
            elif isinstance(v, dict):
                scrubbed[k] = cls.scrub_dict(v)
            elif isinstance(v, list):
                scrubbed[k] = [cls.scrub_dict(item) if isinstance(item, dict) else item for item in v]
            else:
                scrubbed[k] = v
        return scrubbed
