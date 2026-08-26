"""Stop action adapter for terminal case halts."""

from datetime import datetime, timezone
import uuid

from app.core.logging import get_logger
from app.domain.action_execution_schemas import (
    ActionExecutionRequest, ActionExecutionResult, ActionExecutionStatus
)
from app.domain.models import RecoveryCase
from app.infrastructure.recovery_adapters.base import BaseRecoveryAdapter
from app.infrastructure.repositories.unit_of_work import UnitOfWork

logger = get_logger("recovery.adapter.stop")


class StopRecoveryAdapter(BaseRecoveryAdapter):
    """Adapter executing STOP by terminating automated recovery workflows."""

    @property
    def action_type(self) -> str:
        return "STOP"

    def execute(
        self,
        request: ActionExecutionRequest,
        case: RecoveryCase,
        uow: UnitOfWork
    ) -> ActionExecutionResult:
        execution_id = f"exec_{uuid.uuid4().hex[:12]}"

        logger.info(
            "Recovery terminated with STOP action",
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
            provider="internal_stop",
            created_at=datetime.now(timezone.utc),
        )
