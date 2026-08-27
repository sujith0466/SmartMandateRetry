"""Multi-channel customer nudge adapters (WhatsApp & SMS) with truthful sandbox boundary."""

from abc import ABC, abstractmethod
from dataclasses import dataclass
from datetime import datetime, timezone
from enum import Enum
from typing import Any, Dict, Optional
import uuid

from app.core.logging import get_logger
from app.domain.models import RecoveryCase, RecoveryPolicy
from app.infrastructure.repositories.unit_of_work import UnitOfWork

logger = get_logger("smartmandate.channel_adapters")


class DeliveryStatus(str, Enum):
    SIMULATED = "SIMULATED"
    QUEUED = "QUEUED"
    SENT = "SENT"
    DELIVERED = "DELIVERED"
    FAILED = "FAILED"
    SUPPRESSED = "SUPPRESSED"


@dataclass(frozen=True)
class ChannelDispatchResult:
    message_id: str
    channel: str
    recipient: str
    status: DeliveryStatus
    delivery_mode: str  # "SANDBOX_SIMULATION" | "LIVE_GATEWAY"
    template_name: str
    payload: Dict[str, Any]
    dispatched_at: datetime
    error_message: Optional[str] = None


class BaseChannelAdapter(ABC):
    """Abstract base for customer-facing communication channels."""

    @property
    @abstractmethod
    def channel_name(self) -> str:
        pass

    @abstractmethod
    def format_template(self, case: RecoveryCase, payment_link_url: str) -> Dict[str, Any]:
        pass

    def dispatch_nudge(
        self,
        case: RecoveryCase,
        payment_link_url: str,
        policy: Optional[RecoveryPolicy] = None,
        uow: Optional[UnitOfWork] = None,
    ) -> ChannelDispatchResult:
        """Execute channel nudge with truthful sandbox simulation and audit recording."""
        message_id = f"msg_{self.channel_name.lower()}_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)

        # Retrieve customer contact
        customer_contact = "+919999999999"
        if case.subscription and case.subscription.customer:
            customer_contact = case.subscription.customer.contact or customer_contact

        payload = self.format_template(case, payment_link_url)

        # Check contact cap
        if policy and case.contacts_count >= policy.max_customer_contacts_per_cycle:
            logger.warning(
                "Nudge suppressed by contact frequency cap",
                case_id=case.id,
                channel=self.channel_name,
                contacts_count=case.contacts_count
            )
            return ChannelDispatchResult(
                message_id=message_id,
                channel=self.channel_name,
                recipient=customer_contact,
                status=DeliveryStatus.SUPPRESSED,
                delivery_mode="SANDBOX_SIMULATION",
                template_name=payload.get("template", "payment_recovery_prompt"),
                payload=payload,
                dispatched_at=now,
                error_message="MAX_CUSTOMER_CONTACTS_EXCEEDED",
            )

        # Dispatch simulation
        logger.info(
            "Channel nudge formatted and dispatched via sandbox adapter",
            message_id=message_id,
            channel=self.channel_name,
            recipient=customer_contact,
            case_id=case.id,
        )

        result = ChannelDispatchResult(
            message_id=message_id,
            channel=self.channel_name,
            recipient=customer_contact,
            status=DeliveryStatus.SIMULATED,
            delivery_mode="SANDBOX_SIMULATION",
            template_name=payload.get("template", "payment_recovery_prompt"),
            payload=payload,
            dispatched_at=now,
        )

        if uow:
            uow.audit_events.record_event(
                merchant_id=case.merchant_id,
                recovery_case_id=case.id,
                event_type="CHANNEL_NUDGE_DISPATCHED",
                actor="SYSTEM_CHANNEL_ADAPTER",
                payload={
                    "message_id": message_id,
                    "channel": self.channel_name,
                    "recipient_masked": customer_contact[:3] + "****" + customer_contact[-4:],
                    "status": "SIMULATED",
                    "delivery_mode": "SANDBOX_SIMULATION",
                    "payment_link_url": payment_link_url,
                },
                correlation_id=f"corr_nudge_{case.id[:8]}",
            )

        return result


class WhatsAppChannelAdapter(BaseChannelAdapter):
    """WhatsApp Business API adapter (Sandbox / Simulation)."""

    @property
    def channel_name(self) -> str:
        return "WHATSAPP"

    def format_template(self, case: RecoveryCase, payment_link_url: str) -> Dict[str, Any]:
        return {
            "template": "subscription_recovery_v2",
            "language": "en_IN",
            "body_parameters": [
                f"₹{case.amount_inr:,.2f}",
                case.invoice_id,
                payment_link_url,
            ],
            "action_button": {
                "type": "URL",
                "text": "Complete Payment via UPI/Card",
                "url": payment_link_url,
            },
        }


class SMSChannelAdapter(BaseChannelAdapter):
    """DLT-Compliant SMS Gateway adapter (Sandbox / Simulation)."""

    @property
    def channel_name(self) -> str:
        return "SMS"

    def format_template(self, case: RecoveryCase, payment_link_url: str) -> Dict[str, Any]:
        return {
            "template": "DLT_RECOVERY_PROMPT_01",
            "dlt_template_id": "1107161829381928374",
            "sender_id": "SMRTRZ",
            "message_text": f"Payment of INR {case.amount_inr:,.2f} for Invoice #{case.invoice_id} could not be debited. Settle instantly via secure UPI link: {payment_link_url}",
        }
