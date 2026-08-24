"""Razorpay webhook signature verifier with constant-time comparison."""

import hashlib
import hmac
from typing import Optional

from app.core.logging import get_logger

logger = get_logger("smartmandate.webhook_verifier")


class RazorpaySignatureVerifier:
    """
    Cryptographic verification service for inbound Razorpay webhooks.
    Computes HMAC-SHA256 over raw request bytes and uses constant-time comparison.
    """

    def __init__(self, secret: Optional[str] = None) -> None:
        self._secret = (secret or "").encode("utf-8")

    def compute_signature(self, raw_body: bytes) -> str:
        """Compute HMAC-SHA256 hex digest for a raw request payload."""
        if not self._secret:
            raise ValueError("Webhook secret is empty or not configured.")
        return hmac.new(self._secret, raw_body, hashlib.sha256).hexdigest()

    def verify(self, raw_body: bytes, signature: Optional[str]) -> bool:
        """
        Verify incoming webhook signature.
        Returns True if valid, False if missing, mismatched, or secret not configured.
        """
        if not signature or not self._secret:
            logger.warning(
                "Webhook signature check failed: missing signature header or secret",
                has_signature=bool(signature),
                has_secret=bool(self._secret),
            )
            return False

        try:
            expected = self.compute_signature(raw_body)
            # Constant-time comparison prevents timing attacks
            is_valid = hmac.compare_digest(expected, signature.strip())
            if not is_valid:
                logger.warning("Webhook signature mismatch detected")
            return is_valid
        except Exception as e:
            logger.error("Exception during webhook signature verification", error=str(e))
            return False
