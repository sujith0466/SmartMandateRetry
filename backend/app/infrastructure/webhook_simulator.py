"""Synthetic Razorpay webhook generator and simulator."""

import json
import time
from typing import Any, Dict, Optional, Tuple
import requests

from app.core.config import get_settings
from app.infrastructure.webhook_verifier import RazorpaySignatureVerifier


class RazorpayWebhookSimulator:
    """Utility to generate and dispatch validly signed synthetic Razorpay webhook payloads."""

    def __init__(self, secret: Optional[str] = None) -> None:
        settings = get_settings()
        self.secret = secret or settings.RAZORPAY_WEBHOOK_SECRET
        self.verifier = RazorpaySignatureVerifier(self.secret)

    def create_payment_failed_payload(
        self,
        payment_id: str = "pay_failed_synth_001",
        amount_paise: int = 149900,
        invoice_id: str = "inv_synth_001",
        error_code: str = "BAD_REQUEST_ERROR",
        error_reason: str = "insufficient_funds",
        error_description: str = "The card has insufficient funds to complete the mandate charge",
        account_id: str = "acc_rzp_demo_merchant_001",
    ) -> Dict[str, Any]:
        """Create a synthetic payment.failed webhook envelope."""
        return {
            "entity": "event",
            "account_id": account_id,
            "event": "payment.failed",
            "contains": ["payment"],
            "payload": {
                "payment": {
                    "entity": {
                        "id": payment_id,
                        "entity": "payment",
                        "amount": amount_paise,
                        "currency": "INR",
                        "status": "failed",
                        "order_id": f"order_{payment_id}",
                        "invoice_id": invoice_id,
                        "error_code": error_code,
                        "error_description": error_description,
                        "error_source": "customer",
                        "error_step": "payment_authorization",
                        "error_reason": error_reason,
                        "created_at": int(time.time()),
                    }
                }
            },
            "created_at": int(time.time()),
        }

    def create_subscription_pending_payload(
        self,
        subscription_id: str = "sub_pending_synth_001",
        plan_id: str = "plan_pro_monthly",
        customer_id: str = "cust_synth_001",
        account_id: str = "acc_rzp_demo_merchant_001",
    ) -> Dict[str, Any]:
        """Create a synthetic subscription.pending webhook envelope."""
        return {
            "entity": "event",
            "account_id": account_id,
            "event": "subscription.pending",
            "contains": ["subscription"],
            "payload": {
                "subscription": {
                    "entity": {
                        "id": subscription_id,
                        "entity": "subscription",
                        "plan_id": plan_id,
                        "customer_id": customer_id,
                        "status": "pending",
                        "current_cycle": 3,
                        "created_at": int(time.time()),
                    }
                }
            },
            "created_at": int(time.time()),
        }

    def create_subscription_halted_payload(
        self,
        subscription_id: str = "sub_halted_synth_001",
        plan_id: str = "plan_pro_monthly",
        customer_id: str = "cust_synth_001",
        account_id: str = "acc_rzp_demo_merchant_001",
    ) -> Dict[str, Any]:
        """Create a synthetic subscription.halted webhook envelope."""
        return {
            "entity": "event",
            "account_id": account_id,
            "event": "subscription.halted",
            "contains": ["subscription"],
            "payload": {
                "subscription": {
                    "entity": {
                        "id": subscription_id,
                        "entity": "subscription",
                        "plan_id": plan_id,
                        "customer_id": customer_id,
                        "status": "halted",
                        "current_cycle": 3,
                        "created_at": int(time.time()),
                    }
                }
            },
            "created_at": int(time.time()),
        }

    def create_payment_captured_payload(
        self,
        payment_id: str = "pay_captured_synth_001",
        amount_paise: int = 149900,
        invoice_id: str = "inv_synth_001",
        account_id: str = "acc_rzp_demo_merchant_001",
    ) -> Dict[str, Any]:
        """Create a synthetic payment.captured webhook envelope."""
        return {
            "entity": "event",
            "account_id": account_id,
            "event": "payment.captured",
            "contains": ["payment"],
            "payload": {
                "payment": {
                    "entity": {
                        "id": payment_id,
                        "entity": "payment",
                        "amount": amount_paise,
                        "currency": "INR",
                        "status": "captured",
                        "invoice_id": invoice_id,
                        "captured": True,
                        "created_at": int(time.time()),
                    }
                }
            },
            "created_at": int(time.time()),
        }

    def sign_payload(self, payload_dict: Dict[str, Any]) -> Tuple[bytes, str]:
        """Serialize payload to raw bytes and calculate HMAC-SHA256 signature."""
        raw_bytes = json.dumps(payload_dict, separators=(",", ":")).encode("utf-8")
        signature = self.verifier.compute_signature(raw_bytes)
        return raw_bytes, signature

    def dispatch(
        self,
        payload_dict: Dict[str, Any],
        target_url: str = "http://localhost:5000/api/v1/webhooks/razorpay"
    ) -> requests.Response:
        """Send synthetic signed webhook to target URL."""
        raw_bytes, signature = self.sign_payload(payload_dict)
        headers = {
            "Content-Type": "application/json",
            "X-Razorpay-Signature": signature,
        }
        return requests.post(target_url, data=raw_bytes, headers=headers, timeout=5.0)


if __name__ == "__main__":
    simulator = RazorpayWebhookSimulator()
    payload = simulator.create_payment_failed_payload()
    raw_bytes, sig = simulator.sign_payload(payload)
    print(f"Generated synthetic signed payload ({len(raw_bytes)} bytes):")
    print(f"Signature: {sig}")
