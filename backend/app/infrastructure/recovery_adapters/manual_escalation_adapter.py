"""Manual escalation action adapter."""

from datetime import datetime, timezone
import uuid

from app.core.logging import get_logger
from app.domain.action_execution_schemas import (
    ActionExecutionRequest, ActionExecutionResult, ActionExecutionStatus
)
from app.domain.models import RecoveryCase
from app.infrastructure.recovery_adapters.base import BaseRecoveryAdapter
from app.infrastructure.repositories.unit_of_work import UnitOfWork

logger = get_logger("recovery.adapter.manual_escalation")


class ManualEscalationAdapter(BaseRecoveryAdapter):
    """Adapter executing MANUAL_ESCALATION by routing case to human operator queue."""

    @property
    def action_type(self) -> str:
        return "MANUAL_ESCALATION"

    def execute(
        self,
        request: ActionExecutionRequest,
        case: RecoveryCase,
        uow: UnitOfWork
    ) -> ActionExecutionResult:
        execution_id = f"exec_{uuid.uuid4().hex[:12]}"

        logger.info(
            "Case routed to manual escalation queue",
            execution_id=execution_id,
            case_id=case.id,
            policy_decision_id=request.policy_decision_id
        )

        return ActionExecutionResult(
            execution_id=execution_id,
            case_id=case.id,
            policy_decision_id=request.policy_decision_id,
            action=self.action_type,
            status=ActionExecutionStatus.EXECUTED,
            execution_allowed=True,
            provider="internal_escalation",
            provider_reference=f"esc_{case.id}",
            created_at=datetime.now(timezone.utc),
        )
