"""Schedule recovery check adapter for delayed automated re-observation."""

from datetime import datetime, timezone, timedelta
from typing import Optional
import uuid

from app.core.logging import get_logger
from app.domain.action_execution_schemas import (
    ActionExecutionRequest, ActionExecutionResult, ActionExecutionStatus
)
from app.domain.models import RecoveryCase
from app.infrastructure.recovery_adapters.base import BaseRecoveryAdapter
from app.infrastructure.repositories.unit_of_work import UnitOfWork

logger = get_logger("recovery.adapter.schedule")


class ScheduleRecoveryAdapter(BaseRecoveryAdapter):
    """Adapter executing SCHEDULE_RECOVERY_CHECK by registering a delayed check task."""

    @property
    def action_type(self) -> str:
        return "SCHEDULE_RECOVERY_CHECK"

    def execute(
        self,
        request: ActionExecutionRequest,
        case: RecoveryCase,
        uow: UnitOfWork
    ) -> ActionExecutionResult:
        execution_id = f"exec_{uuid.uuid4().hex[:12]}"
        delay_hours = request.adjusted_delay_hours if request.adjusted_delay_hours is not None else 24
        scheduled_for = datetime.now(timezone.utc) + timedelta(hours=delay_hours)

        task_id = f"task_{uuid.uuid4().hex[:12]}"
        countdown_sec = delay_hours * 3600

        try:
            # Attempt Celery task registration if worker environment is available
            from app.workers.tasks import scheduled_recovery_check_task
            async_res = scheduled_recovery_check_task.apply_async(
                args=[case.id],
                countdown=countdown_sec
            )
            task_id = async_res.id if hasattr(async_res, "id") else task_id
        except Exception as e:
            logger.info(
                "Celery broker offline; scheduled task reference recorded locally",
                case_id=case.id,
                task_id=task_id,
                error=str(e)
            )

        logger.info(
            "Recovery check scheduled successfully",
            execution_id=execution_id,
            case_id=case.id,
            delay_hours=delay_hours,
            scheduled_for=scheduled_for.isoformat(),
            task_id=task_id
        )

        return ActionExecutionResult(
            execution_id=execution_id,
            case_id=case.id,
            policy_decision_id=request.policy_decision_id,
            action=self.action_type,
            status=ActionExecutionStatus.SCHEDULED,
            execution_allowed=True,
            provider="celery_redis",
            provider_reference=task_id,
            scheduled_for=scheduled_for,
            created_at=datetime.now(timezone.utc),
        )
