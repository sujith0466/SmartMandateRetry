"""Central recursive PII and secret sanitizer for structured logs, metrics, and audit trails."""

import re
from typing import Any, Dict, List, Set, Union

SENSITIVE_KEY_PATTERNS: Set[str] = {
    "secret", "api_key", "password", "token", "authorization",
    "razorpay_key_secret", "razorpay_webhook_secret", "openrouter_api_key",
    "app_secret_key", "pan", "cvv", "card_number", "account_number",
    "card_cvv", "private_key"
}

EMAIL_REGEX = re.compile(r"([a-zA-Z0-9_.+-]+)@([a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)")
PHONE_REGEX = re.compile(r"(\+?\d{1,3})?[-.\s]?(\d{3})[-.\s]?(\d{3})[-.\s]?(\d{4})")


def mask_email(email: Union[str, None]) -> str:
    """Mask email preserving first and last character of user and domain."""
    if not email or not isinstance(email, str):
        return ""
    match = EMAIL_REGEX.search(email)
    if not match:
        return email
    user, domain = match.groups()
    masked_user = f"{user[0]}***{user[-1]}" if len(user) > 1 else f"{user}***"
    return f"{masked_user}@{domain}"


def mask_phone(phone: Union[str, None]) -> str:
    """Mask phone number preserving country code and last 4 digits."""
    if not phone or not isinstance(phone, str):
        return ""
    digits = re.sub(r"\D", "", phone)
    if len(digits) >= 10:
        return f"+91******{digits[-4:]}"
    return "****"


def sanitize_data(data: Any, max_depth: int = 10) -> Any:
    """
    Recursively sanitize dictionaries, lists, strings, and objects for safe observability.
    Redacts sensitive keys and masks PII patterns.
    """
    if max_depth <= 0:
        return "[MAX_DEPTH_REACHED]"

    if isinstance(data, dict):
        sanitized: Dict[str, Any] = {}
        for k, v in data.items():
            key_lower = str(k).lower()
            if any(pattern in key_lower for pattern in SENSITIVE_KEY_PATTERNS):
                sanitized[str(k)] = "[REDACTED]"
            else:
                sanitized[str(k)] = sanitize_data(v, max_depth - 1)
        return sanitized

    elif isinstance(data, (list, tuple, set)):
        return [sanitize_data(item, max_depth - 1) for item in data]

    elif isinstance(data, str):
        # Check if string contains email
        if "@" in data and EMAIL_REGEX.search(data):
            data = EMAIL_REGEX.sub(lambda m: f"{m.group(1)[0]}***@{m.group(2)}", data)
        return data

    elif isinstance(data, (int, float, bool)) or data is None:
        return data

    elif isinstance(data, Exception):
        return f"{type(data).__name__}: {sanitize_data(str(data), max_depth - 1)}"

    else:
        return str(data)
