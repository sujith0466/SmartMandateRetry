"""Razorpay API client wrapper."""

from typing import Any, Dict, Optional
import requests
from app.core.config import get_settings
from app.core.logging import get_logger

logger = get_logger("infrastructure.razorpay")


class RazorpayClient:
    """Gateway client for Razorpay Subscriptions and Payment Links."""

    def __init__(self, key_id: str, key_secret: str, base_url: str = "https://api.razorpay.com/v1"):
        self.key_id = key_id
        self.key_secret = key_secret
        self.base_url = base_url.rstrip("/")

    @property
    def auth(self):
        return (self.key_id, self.key_secret)

    def fetch_subscription(self, subscription_id: str) -> Dict[str, Any]:
        """Fetch subscription details (GET /v1/subscriptions/:id)."""
        url = f"{self.base_url}/subscriptions/{subscription_id}"
        response = requests.get(url, auth=self.auth, timeout=5.0)
        response.raise_for_status()
        return response.json()

    def fetch_payment(self, payment_id: str) -> Dict[str, Any]:
        """Fetch payment details (GET /v1/payments/:id)."""
        url = f"{self.base_url}/payments/{payment_id}"
        response = requests.get(url, auth=self.auth, timeout=5.0)
        response.raise_for_status()
        return response.json()

    def fetch_payment_link(self, payment_link_id: str) -> Dict[str, Any]:
        """Fetch payment link details (GET /v1/payment_links/:id)."""
        url = f"{self.base_url}/payment_links/{payment_link_id}"
        response = requests.get(url, auth=self.auth, timeout=5.0)
        response.raise_for_status()
        return response.json()

    def create_payment_link(
        self,
        amount_paise: int,
        description: str,
        customer: Dict[str, str],
        reference_id: str,
        notes: Optional[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Generate recovery payment link (POST /v1/payment_links)."""
        url = f"{self.base_url}/payment_links"
        payload = {
            "amount": amount_paise,
            "currency": "INR",
            "accept_partial": False,
            "reference_id": reference_id,
            "description": description,
            "customer": customer,
            "notify": {"sms": True, "email": True},
            "reminder_enable": True,
            "notes": notes or {}
        }
        response = requests.post(url, auth=self.auth, json=payload, timeout=5.0)
        response.raise_for_status()
        return response.json()


def get_razorpay_client() -> RazorpayClient:
    settings = get_settings()
    return RazorpayClient(
        key_id=settings.RAZORPAY_KEY_ID,
        key_secret=settings.RAZORPAY_KEY_SECRET
    )
