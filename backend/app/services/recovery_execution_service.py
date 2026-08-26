"""Recovery Action Execution Service coordinating dispatch, idempotency, and audit trails."""

from typing import Optional

from app.core.errors import ResourceNotFoundError
from app.core.logging import get_logger
from app.domain.action_dispatcher import ActionDispatcher
from app.domain.action_execution_schemas import (
    ActionExecutionRequest, ActionExecutionResult, ActionExecutionStatus
)
from app.domain.models import RecoveryAction
from app.infrastructure.database import get_session
from app.infrastructure.repositories.unit_of_work import UnitOfWork

logger = get_logger("recovery.execution_service")


class RecoveryExecutionService:
    """
    Application service executing approved Phase 7 PolicyDecisions.
    Enforces strict idempotency, audit trail persistence, and OCC case transitions.
    """

    def __init__(
        self,
        dispatcher: Optional[ActionDispatcher] = None,
        uow: Optional[UnitOfWork] = None,
    ) -> None:
        self.dispatcher = dispatcher or ActionDispatcher()
        self.uow = uow or UnitOfWork(get_session)

    def execute_action(self, request: ActionExecutionRequest) -> ActionExecutionResult:
        """
        Execute recovery action within UnitOfWork transaction boundary with idempotency verification.
        """
        idempotency_key = request.compute_idempotency_key()

        with self.uow:
            case = self.uow.cases.get_by_id(request.case_id)
            if not case:
                raise ResourceNotFoundError("RecoveryCase", request.case_id)

            # 1. Idempotency Check: Return existing result if already executed
            existing_action = self.uow.actions.find_by_idempotency_key(idempotency_key)
            if existing_action:
                logger.info(
                    "Idempotency cache hit: Returning existing execution record",
                    case_id=request.case_id,
                    idempotency_key=idempotency_key,
                    status=existing_action.status
                )
                return ActionExecutionResult(
                    execution_id=existing_action.id,
                    case_id=request.case_id,
                    policy_decision_id=request.policy_decision_id,
                    action=existing_action.action_type,
                    status=ActionExecutionStatus(existing_action.status),
                    execution_allowed=request.execution_allowed,
                    provider="idempotent_cache",
                    provider_reference=existing_action.external_reference_id,
                    created_at=existing_action.executed_at,
                )

            # 2. Dispatch action (guarantees zero external execution if execution_allowed=False)
            result = self.dispatcher.dispatch(request, case, self.uow)

            # 3. Persist RecoveryAction record
            action_record = RecoveryAction(
                id=result.execution_id,
                recovery_case_id=case.id,
                action_type=request.final_action,
                idempotency_key=idempotency_key,
                status=result.status.value,
                external_reference_id=result.provider_reference,
                executed_at=result.created_at,
            )
            self.uow.actions.add(action_record)

            # 4. State Machine Transition & Counters Update
            if result.status in (ActionExecutionStatus.EXECUTED, ActionExecutionStatus.SCHEDULED):
                if request.final_action == "SCHEDULE_RECOVERY_CHECK":
                    case.state = "SCHEDULED"
                    case.attempt_count += 1
                elif request.final_action == "PAYMENT_LINK_RECOVERY":
                    case.state = "IN_PROGRESS"
                    case.contacts_count += 1
                elif request.final_action == "MANUAL_ESCALATION":
                    case.state = "ESCALATED"
                elif request.final_action == "STOP":
                    case.state = "STOPPED"
            elif result.status == ActionExecutionStatus.BLOCKED:
                if request.final_action == "STOP":
                    case.state = "STOPPED"
                elif request.final_action == "MANUAL_ESCALATION":
                    case.state = "ESCALATED"

            # 5. Record immutable AuditEvent
            event_type = f"RECOVERY_ACTION_{result.status.value}"
            self.uow.audit_events.record_event(
                merchant_id=case.merchant_id,
                event_type=event_type,
                actor="ACTION_DISPATCHER",
                payload=result.to_dict(),
                recovery_case_id=case.id,
                correlation_id=request.correlation_id,
            )

            self.uow.commit()

        logger.info(
            "Recovery action execution completed and committed",
            execution_id=result.execution_id,
            case_id=request.case_id,
            action=request.final_action,
            status=result.status.value
        )

        return result
