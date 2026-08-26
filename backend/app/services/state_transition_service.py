"""Centralized state transition service coordinating lifecycle mutations, OCC, and audit logs."""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional

from app.core.errors import OptimisticLockError, ResourceNotFoundError
from app.core.logging import get_logger
from app.domain.state_machine import (
    CaseState, StateTransitionResult, StateTransitionValidator, TransitionStatus
)
from app.infrastructure.database import get_session
from app.infrastructure.repositories.unit_of_work import UnitOfWork

logger = get_logger("services.state_transition")


class StateTransitionService:
    """
    Application service executing validated, OCC-hardened lifecycle transitions on RecoveryCases.
    Guarantees atomic version increments, terminal state immutability, and duplicate no-op safety.
    """

    def __init__(self, uow: Optional[UnitOfWork] = None) -> None:
        self.uow = uow or UnitOfWork(get_session)
        self.validator = StateTransitionValidator()

    def transition_case(
        self,
        case_id: str,
        target_state: str,
        expected_version: Optional[int] = None,
        reason: Optional[str] = None,
        correlation_id: Optional[str] = None,
        actor: str = "STATE_MACHINE_ENGINE",
        recovered_amount_inr: Optional[Decimal] = None,
        resolved_at: Optional[datetime] = None,
        failure_category: Optional[str] = None,
        failure_code: Optional[str] = None,
        new_stage: Optional[str] = None,
        attempt_count: Optional[int] = None,
        contacts_count: Optional[int] = None,
    ) -> StateTransitionResult:
        """
        Execute an atomic state transition with OCC validation, idempotency, and audit logging.
        """
        with self.uow:
            case = self.uow.cases.get_by_id(case_id)
            if not case:
                raise ResourceNotFoundError("RecoveryCase", case_id)

            current_version = case.version
            current_state = case.state

            # 1. Stale Worker / OCC Check
            if expected_version is not None and expected_version != current_version:
                logger.warning(
                    "OCC conflict detected on state transition",
                    case_id=case_id,
                    expected_version=expected_version,
                    current_version=current_version
                )
                raise OptimisticLockError(
                    f"Optimistic lock conflict on RecoveryCase '{case_id}': "
                    f"expected version {expected_version}, current {current_version}"
                )

            # 2. State Transition & Terminal State Validation
            status = self.validator.validate_transition(current_state, target_state)

            # 3. Idempotent No-Op Check: Already in target state
            if status == TransitionStatus.ALREADY_APPLIED:
                return StateTransitionResult(
                    case_id=case.id,
                    previous_state=current_state,
                    new_state=current_state,
                    previous_version=current_version,
                    new_version=current_version,
                    status=TransitionStatus.ALREADY_APPLIED,
                    notes=f"Case already in requested state '{current_state}'; transition acknowledged as no-op",
                )

            # 4. Monotonic Settlement Invariants
            effective_resolved_at = resolved_at
            effective_recovered_amount = recovered_amount_inr
            if target_state == CaseState.RECOVERED.value:
                effective_resolved_at = resolved_at or datetime.now(timezone.utc)
                effective_recovered_amount = recovered_amount_inr or case.amount_inr

            # 5. Atomic Database Mutation with OCC
            updated_case = self.uow.cases.atomic_state_transition(
                case_id=case.id,
                expected_version=current_version,
                new_state=target_state,
                new_stage=new_stage,
                resolved_at=effective_resolved_at,
                recovered_amount_inr=effective_recovered_amount,
                failure_category=failure_category,
                failure_code=failure_code,
                attempt_count=attempt_count,
                contacts_count=contacts_count,
            )

            result = StateTransitionResult(
                case_id=updated_case.id,
                previous_state=current_state,
                new_state=target_state,
                previous_version=current_version,
                new_version=updated_case.version,
                status=TransitionStatus.TRANSITIONED,
                notes=reason,
            )

            # 6. Append-Only Audit Event
            self.uow.audit_events.record_event(
                merchant_id=updated_case.merchant_id,
                event_type="RECOVERY_STATE_TRANSITIONED",
                actor=actor,
                payload=result.to_dict(),
                recovery_case_id=updated_case.id,
                correlation_id=correlation_id,
            )

            self.uow.commit()

        logger.info(
            "State transition successfully committed",
            case_id=result.case_id,
            from_state=result.previous_state,
            to_state=result.new_state,
            version=result.new_version
        )
        return result
