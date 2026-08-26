"""Service layer for Policy Engine safety gate evaluation and audit logging."""

from typing import Optional
from decimal import Decimal

from app.core.errors import ResourceNotFoundError
from app.core.logging import get_logger
from app.domain.ai_decision_schemas import AIDecisionResult
from app.domain.customer_context import CustomerRecoveryContext
from app.domain.models import AuditEvent, RecoveryPolicy
from app.domain.policy_decision import PolicyDecision
from app.domain.policy_engine import PolicyEvaluationEngine
from app.infrastructure.database import get_session
from app.infrastructure.repositories.unit_of_work import UnitOfWork

logger = get_logger("smartmandate.policy_engine_service")


class PolicyEngineService:
    """Service evaluating AI recovery recommendations against merchant policies and safety gates."""

    def __init__(
        self,
        engine: Optional[PolicyEvaluationEngine] = None,
        uow: Optional[UnitOfWork] = None,
    ) -> None:
        self.engine = engine or PolicyEvaluationEngine()
        self.uow = uow or UnitOfWork(get_session)

    def evaluate_policy(
        self,
        context: CustomerRecoveryContext,
        decision: AIDecisionResult,
        correlation_id: Optional[str] = None
    ) -> PolicyDecision:
        """
        Evaluate AI recovery proposal against merchant safety policies and log AuditEvent.
        """
        with self.uow:
            case = self.uow.cases.get_by_id(context.case.case_id)
            if not case:
                raise ResourceNotFoundError("RecoveryCase", context.case.case_id)

            # Retrieve merchant recovery policy or fallback to default safety policy
            policy = self.uow.policies.find_by_merchant_id(case.merchant_id)
            if not policy:
                policy = RecoveryPolicy(
                    merchant_id=case.merchant_id,
                    max_retries_per_case=3,
                    min_retry_interval_hours=24,
                    max_recovery_window_days=14,
                    min_confidence_threshold=Decimal("0.75"),
                    high_value_threshold_inr=Decimal("10000.00"),
                    max_customer_contacts_per_cycle=3,
                    hard_decline_auto_stop=True,
                )

            # Evaluate deterministic policy safety rules
            policy_decision: PolicyDecision = self.engine.evaluate(
                context=context,
                decision=decision,
                policy=policy,
            )

            # Record immutable AuditEvent
            self.uow.audit_events.record_event(
                merchant_id=case.merchant_id,
                event_type="POLICY_DECISION_EVALUATED",
                actor="POLICY_ENGINE",
                payload=policy_decision.to_dict(),
                recovery_case_id=case.id,
                correlation_id=correlation_id,
            )

            self.uow.commit()

        logger.info(
            "Policy safety evaluation completed",
            policy_decision_id=policy_decision.policy_decision_id,
            case_id=context.case.case_id,
            status=policy_decision.status.value,
            final_action=policy_decision.final_action,
            execution_allowed=policy_decision.execution_allowed,
            correlation_id=correlation_id,
        )

        return policy_decision
