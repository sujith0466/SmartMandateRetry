"""AI Decision Service managing evaluation, DB persistence, and audit logging."""

from typing import Optional

from app.core.errors import ResourceNotFoundError
from app.core.logging import get_logger
from app.domain.ai_decision_engine import AIDecisionEngine
from app.domain.ai_decision_schemas import AIDecisionResult
from app.domain.customer_context import CustomerRecoveryContext
from app.domain.models import AuditEvent, RecoveryDecision
from app.infrastructure.database import get_session
from app.infrastructure.repositories.unit_of_work import UnitOfWork

logger = get_logger("smartmandate.ai_decision_service")


class AIDecisionService:
    """Service coordinating AI decision generation, database persistence, and audit logging."""

    def __init__(
        self,
        engine: Optional[AIDecisionEngine] = None,
        uow: Optional[UnitOfWork] = None,
    ) -> None:
        self.engine = engine or AIDecisionEngine()
        self.uow = uow or UnitOfWork(get_session)

    def formulate_decision(
        self,
        context: CustomerRecoveryContext,
        correlation_id: Optional[str] = None
    ) -> AIDecisionResult:
        """
        Evaluate context with AI Decision Engine, persist RecoveryDecision, and log AuditEvent.
        """
        # 1. Generate AI decision with deterministic fail-safe fallback
        decision_result: AIDecisionResult = self.engine.evaluate(context)

        # 2. Persist in database
        with self.uow:
            case = self.uow.cases.get_by_id(context.case.case_id)
            if not case:
                raise ResourceNotFoundError("RecoveryCase", context.case.case_id)

            # Persist RecoveryDecision record
            decision_record = RecoveryDecision(
                id=decision_result.decision_id,
                recovery_case_id=case.id,
                recommended_action=decision_result.recommended_action.value,
                delay_hours=decision_result.delay_hours,
                confidence=decision_result.confidence,
                reasoning=decision_result.reasoning,
                risk_flags=decision_result.risk_flags,
            )
            self.uow.session.add(decision_record)

            # Record immutable AuditEvent
            self.uow.audit_events.record_event(
                merchant_id=case.merchant_id,
                event_type="AI_DECISION_PRODUCED",
                actor="AI_DECISION_ENGINE",
                payload=decision_result.to_dict(),
                recovery_case_id=case.id,
                correlation_id=correlation_id,
            )

            self.uow.commit()

        logger.info(
            "RecoveryDecision persisted and audited successfully",
            decision_id=decision_result.decision_id,
            case_id=context.case.case_id,
            recommended_action=decision_result.recommended_action.value,
            correlation_id=correlation_id,
        )

        return decision_result
