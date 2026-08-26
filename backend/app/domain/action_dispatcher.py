"""Action dispatcher orchestrating execution of authorized recovery actions."""

from datetime import datetime, timezone
from typing import Dict, List, Optional
import uuid

from app.core.logging import get_logger
from app.domain.action_execution_schemas import (
    ActionExecutionRequest, ActionExecutionResult, ActionExecutionStatus
)
from app.domain.models import RecoveryCase
from app.infrastructure.recovery_adapters import (
    BaseRecoveryAdapter, ManualEscalationAdapter, PaymentLinkAdapter,
    PaymentMethodAdapter, ScheduleRecoveryAdapter, StopRecoveryAdapter
)
from app.infrastructure.repositories.unit_of_work import UnitOfWork

logger = get_logger("recovery.action_dispatcher")


class ActionDispatcher:
    """
    Central dispatcher routing Phase 7 PolicyDecisions to specialized recovery adapters.
    Guarantees that blocked actions (execution_allowed=False) NEVER execute external calls.
    """

    def __init__(self, adapters: Optional[List[BaseRecoveryAdapter]] = None) -> None:
        self._adapters: Dict[str, BaseRecoveryAdapter] = {}
        registered = adapters or [
            ScheduleRecoveryAdapter(),
            PaymentLinkAdapter(),
            PaymentMethodAdapter(),
            ManualEscalationAdapter(),
            StopRecoveryAdapter(),
        ]
        for adapter in registered:
            self._adapters[adapter.action_type] = adapter

    def dispatch(
        self,
        request: ActionExecutionRequest,
        case: RecoveryCase,
        uow: UnitOfWork
    ) -> ActionExecutionResult:
        """
        Dispatch request to appropriate adapter if execution is authorized by Phase 7.
        """
        # Fail-closed safety check: If Phase 7 disallowed execution, NEVER call an adapter
        if not request.execution_allowed:
            execution_id = f"exec_blk_{uuid.uuid4().hex[:12]}"
            logger.info(
                "Execution disallowed by Phase 7; producing BLOCKED result without external calls",
                execution_id=execution_id,
                case_id=case.id,
                action=request.final_action,
                policy_decision_id=request.policy_decision_id
            )
            return ActionExecutionResult(
                execution_id=execution_id,
                case_id=case.id,
                policy_decision_id=request.policy_decision_id,
                action=request.final_action,
                status=ActionExecutionStatus.BLOCKED,
                execution_allowed=False,
                provider="policy_gate",
                error_code="POLICY_EXECUTION_BLOCKED",
                error_message="Recovery action execution blocked by Policy Engine safety rule",
                created_at=datetime.now(timezone.utc),
            )

        adapter = self._adapters.get(request.final_action)
        if not adapter:
            execution_id = f"exec_err_{uuid.uuid4().hex[:12]}"
            logger.warning(
                "No adapter registered for requested recovery action",
                action=request.final_action,
                case_id=case.id
            )
            return ActionExecutionResult(
                execution_id=execution_id,
                case_id=case.id,
                policy_decision_id=request.policy_decision_id,
                action=request.final_action,
                status=ActionExecutionStatus.FAILED,
                execution_allowed=True,
                provider="dispatcher",
                error_code="UNSUPPORTED_ACTION",
                error_message=f"No execution adapter registered for action '{request.final_action}'",
                created_at=datetime.now(timezone.utc),
            )

        return adapter.execute(request, case, uow)
