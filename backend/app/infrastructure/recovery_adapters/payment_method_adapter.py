"""Payment method recovery adapter with fail-safe unsupported guard."""

from datetime import datetime, timezone
import uuid

from app.core.logging import get_logger
from app.domain.action_execution_schemas import (
    ActionExecutionRequest, ActionExecutionResult, ActionExecutionStatus
)
from app.domain.models import RecoveryCase
from app.infrastructure.recovery_adapters.base import BaseRecoveryAdapter
from app.infrastructure.repositories.unit_of_work import UnitOfWork

logger = get_logger("recovery.adapter.payment_method")


class PaymentMethodAdapter(BaseRecoveryAdapter):
    """
    Adapter handling PAYMENT_METHOD_RECOVERY.
    Fails safely with NOT_SUPPORTED rather than fabricating non-existent gateway endpoints.
    """

    @property
    def action_type(self) -> str:
        return "PAYMENT_METHOD_RECOVERY"

    def execute(
        self,
        request: ActionExecutionRequest,
        case: RecoveryCase,
        uow: UnitOfWork
    ) -> ActionExecutionResult:
        execution_id = f"exec_{uuid.uuid4().hex[:12]}"

        logger.info(
            "Payment method update is not exposed by gateway; returning NOT_SUPPORTED",
            execution_id=execution_id,
            case_id=case.id
        )

        return ActionExecutionResult(
            execution_id=execution_id,
            case_id=case.id,
            policy_decision_id=request.policy_decision_id,
            action=self.action_type,
            status=ActionExecutionStatus.NOT_SUPPORTED,
            execution_allowed=True,
            provider="gateway_neutral",
            error_code="OPERATION_NOT_SUPPORTED",
            error_message="Gateway instrument update endpoint not available; routing to manual review",
            created_at=datetime.now(timezone.utc),
        )
