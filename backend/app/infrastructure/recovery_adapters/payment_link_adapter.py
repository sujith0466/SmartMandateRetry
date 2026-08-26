"""Razorpay Payment Link recovery action adapter."""

from datetime import datetime, timezone
from typing import Optional
import uuid
import requests

from app.core.logging import get_logger
from app.domain.action_execution_schemas import (
    ActionExecutionRequest, ActionExecutionResult, ActionExecutionStatus
)
from app.domain.models import RecoveryCase
from app.infrastructure.razorpay_client import RazorpayClient, get_razorpay_client
from app.infrastructure.recovery_adapters.base import BaseRecoveryAdapter
from app.infrastructure.repositories.unit_of_work import UnitOfWork

logger = get_logger("recovery.adapter.payment_link")


class PaymentLinkAdapter(BaseRecoveryAdapter):
    """Adapter executing PAYMENT_LINK_RECOVERY by generating a Razorpay Payment Link."""

    def __init__(self, client: Optional[RazorpayClient] = None) -> None:
        self.client = client or get_razorpay_client()

    @property
    def action_type(self) -> str:
        return "PAYMENT_LINK_RECOVERY"

    def execute(
        self,
        request: ActionExecutionRequest,
        case: RecoveryCase,
        uow: UnitOfWork
    ) -> ActionExecutionResult:
        execution_id = f"exec_{uuid.uuid4().hex[:12]}"
        amount_paise = int(case.amount_inr * 100)

        # Retrieve customer contact context safely
        customer_email = None
        customer_contact = None
        if case.subscription and case.subscription.customer:
            customer_email = case.subscription.customer.email
            customer_contact = case.subscription.customer.contact

        customer_payload = {
            "name": "Customer",
            "email": customer_email or "billing@customer.internal",
            "contact": customer_contact or "+919999999999",
        }

        notes = {
            "case_id": case.id,
            "invoice_id": case.invoice_id,
            "policy_decision_id": request.policy_decision_id,
            "execution_id": execution_id,
        }

        try:
            resp = self.client.create_payment_link(
                amount_paise=amount_paise,
                description=f"Subscription Recovery Payment for #{case.invoice_id}",
                customer=customer_payload,
                reference_id=f"rec_{case.invoice_id}_{uuid.uuid4().hex[:6]}",
                notes=notes
            )
            plink_id = resp.get("id", f"plink_{uuid.uuid4().hex[:12]}")

            logger.info(
                "Payment link created successfully",
                execution_id=execution_id,
                case_id=case.id,
                plink_id=plink_id,
                amount_inr=str(case.amount_inr)
            )

            return ActionExecutionResult(
                execution_id=execution_id,
                case_id=case.id,
                policy_decision_id=request.policy_decision_id,
                action=self.action_type,
                status=ActionExecutionStatus.EXECUTED,
                execution_allowed=True,
                provider="razorpay",
                provider_reference=plink_id,
                created_at=datetime.now(timezone.utc),
            )

        except requests.exceptions.Timeout as e:
            logger.warning(
                "Razorpay payment link creation timed out",
                execution_id=execution_id,
                case_id=case.id,
                error=str(e)
            )
            return ActionExecutionResult(
                execution_id=execution_id,
                case_id=case.id,
                policy_decision_id=request.policy_decision_id,
                action=self.action_type,
                status=ActionExecutionStatus.FAILED,
                execution_allowed=True,
                provider="razorpay",
                error_code="PROVIDER_TIMEOUT",
                error_message="Gateway connection timed out during payment link creation",
                created_at=datetime.now(timezone.utc),
            )
        except Exception as e:
            logger.warning(
                "Razorpay payment link creation failed",
                execution_id=execution_id,
                case_id=case.id,
                error=str(e)
            )
            return ActionExecutionResult(
                execution_id=execution_id,
                case_id=case.id,
                policy_decision_id=request.policy_decision_id,
                action=self.action_type,
                status=ActionExecutionStatus.FAILED,
                execution_allowed=True,
                provider="razorpay",
                error_code="PROVIDER_ERROR",
                error_message=str(e),
                created_at=datetime.now(timezone.utc),
            )
