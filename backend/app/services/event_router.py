"""Ingress event router dispatching normalized webhook events to downstream interfaces."""

from dataclasses import dataclass
from typing import Optional

from app.core.logging import get_logger
from app.domain.normalized_event import NormalizedWebhookEvent

logger = get_logger("smartmandate.event_router")


@dataclass(frozen=True)
class IngressRoutingResult:
    status: str  # ROUTED, IGNORED, UNSUPPORTED
    target_queue: str
    event_id: str
    event_type: str


class IngressEventRouter:
    """
    Routes normalized webhook events to the appropriate downstream boundary.
    Note: In accordance with Phase 3 architectural guardrails, this router
    does NOT execute failure classification, AI decisions, or recovery actions.
    """

    def route(self, event: NormalizedWebhookEvent) -> IngressRoutingResult:
        """Route normalized webhook event to appropriate downstream boundary."""
        event_type = event.event_type

        # 1. Stage 1 Observation Events
        if event_type == "SUBSCRIPTION_PENDING":
            logger.info(
                "Routing event to Stage 1 Pending Observation boundary",
                event_id=event.event_id,
                subscription_id=event.subscription_id,
            )
            return IngressRoutingResult(
                status="ROUTED",
                target_queue="stage_1_observation",
                event_id=event.event_id,
                event_type=event_type,
            )

        # 2. Stage 2 Recovery Orchestration Events
        elif event_type == "SUBSCRIPTION_HALTED":
            logger.info(
                "Routing event to Stage 2 Halted Recovery boundary",
                event_id=event.event_id,
                subscription_id=event.subscription_id,
            )
            return IngressRoutingResult(
                status="ROUTED",
                target_queue="stage_2_recovery",
                event_id=event.event_id,
                event_type=event_type,
            )

        # 3. Payment Failure Intelligence Events
        elif event_type == "PAYMENT_FAILED":
            logger.info(
                "Routing event to Failure Intelligence boundary",
                event_id=event.event_id,
                payment_id=event.entity_id,
                invoice_id=event.invoice_id,
            )
            return IngressRoutingResult(
                status="ROUTED",
                target_queue="failure_intelligence",
                event_id=event.event_id,
                event_type=event_type,
            )

        # 4. Settlement & Revenue Attribution Events
        elif event_type in ("PAYMENT_CAPTURED", "PAYMENT_LINK_PAID", "SUBSCRIPTION_CHARGED"):
            logger.info(
                "Routing settlement event to Outcome Verification boundary",
                event_id=event.event_id,
                payment_id=event.entity_id,
                amount_inr=str(event.amount_inr) if event.amount_inr else None,
            )
            return IngressRoutingResult(
                status="ROUTED",
                target_queue="outcome_verification",
                event_id=event.event_id,
                event_type=event_type,
            )

        # 5. Normal Lifecycle / Ignored Mandate Events
        elif event_type in (
            "SUBSCRIPTION_AUTHENTICATED",
            "SUBSCRIPTION_ACTIVATED",
            "SUBSCRIPTION_PAUSED",
            "SUBSCRIPTION_RESUMED",
            "INVOICE_PAID",
            "ORDER_PAID",
        ):
            logger.debug(
                "Event acknowledged and categorized as IGNORED lifecycle event",
                event_id=event.event_id,
                event_type=event_type,
            )
            return IngressRoutingResult(
                status="IGNORED",
                target_queue="none",
                event_id=event.event_id,
                event_type=event_type,
            )

        # 6. Non-Mandate / Unsupported Events
        else:
            logger.debug(
                "Event categorized as UNSUPPORTED non-mandate event",
                event_id=event.event_id,
                event_type=event_type,
            )
            return IngressRoutingResult(
                status="UNSUPPORTED",
                target_queue="none",
                event_id=event.event_id,
                event_type=event_type,
            )
