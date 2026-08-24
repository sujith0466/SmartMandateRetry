"""Cryptographic and security utilities."""

import hashlib
import hmac


def verify_hmac_sha256_signature(
    raw_body: bytes,
    received_signature: str,
    secret: str
) -> bool:
    """Verify HMAC-SHA256 signature using constant-time comparison."""
    if not received_signature or not secret or not raw_body:
        return False

    computed_signature = hmac.new(
        key=secret.encode("utf-8"),
        msg=raw_body,
        digestmod=hashlib.sha256
    ).hexdigest()

    return hmac.compare_digest(computed_signature, received_signature)
