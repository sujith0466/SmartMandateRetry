"""RecoveryCase repository with optimistic concurrency control."""

from datetime import datetime, timezone
from decimal import Decimal
from typing import List, Optional
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.core.errors import OptimisticLockError
from app.domain.models import RecoveryCase
from app.infrastructure.repositories.base import BaseRepository


class RecoveryCaseRepository(BaseRepository[RecoveryCase]):
    """Specialized repository for RecoveryCase aggregates with OCC enforcement."""

    def __init__(self, session: Session) -> None:
        super().__init__(RecoveryCase, session)

    def get_by_id(self, case_id: str, for_update: bool = False) -> Optional[RecoveryCase]:
        """Fetch RecoveryCase by ID, optionally with pessimistic row locking."""
        stmt = select(RecoveryCase).where(RecoveryCase.id == case_id)
        if for_update:
            stmt = stmt.with_for_update()
        return self.session.scalars(stmt).first()

    def find_by_invoice_id(self, merchant_id: str, invoice_id: str) -> Optional[RecoveryCase]:
        """Find recovery case by unique merchant and invoice ID pair."""
        stmt = select(RecoveryCase).where(
            RecoveryCase.merchant_id == merchant_id,
            RecoveryCase.invoice_id == invoice_id
        )
        return self.session.scalars(stmt).first()

    def find_by_merchant_and_invoice(self, merchant_id: str, invoice_id: str) -> Optional[RecoveryCase]:
        """Alias for find_by_invoice_id."""
        return self.find_by_invoice_id(merchant_id, invoice_id)

    def find_by_merchant_and_state(
        self,
        merchant_id: str,
        state: Optional[str] = None,
        stage: Optional[str] = None,
        limit: int = 100,
        offset: int = 0
    ) -> List[RecoveryCase]:
        """Query recovery cases with merchant isolation and state/stage filters."""
        stmt = select(RecoveryCase).where(RecoveryCase.merchant_id == merchant_id)
        if state:
            stmt = stmt.where(RecoveryCase.state == state)
        if stage:
            stmt = stmt.where(RecoveryCase.stage == stage)
        stmt = stmt.order_by(RecoveryCase.created_at.desc()).limit(limit).offset(offset)
        return list(self.session.scalars(stmt).all())

    def find_by_subscription_id(self, subscription_id: str) -> List[RecoveryCase]:
        """Fetch all recovery cases associated with a subscription."""
        stmt = select(RecoveryCase).where(
            RecoveryCase.subscription_id == subscription_id
        ).order_by(RecoveryCase.created_at.desc())
        return list(self.session.scalars(stmt).all())

    def atomic_state_transition(
        self,
        case_id: str,
        expected_version: int,
        new_state: str,
        new_stage: Optional[str] = None,
        resolved_at: Optional[datetime] = None,
        recovered_amount_inr: Optional[Decimal] = None,
        failure_category: Optional[str] = None,
        failure_code: Optional[str] = None,
        attempt_count: Optional[int] = None,
        contacts_count: Optional[int] = None,
    ) -> RecoveryCase:
        """
        Execute an atomic state transition with Optimistic Concurrency Control (OCC).
        Raises OptimisticLockError if version does not match.
        """
        values: dict = {
            "state": new_state,
            "version": RecoveryCase.version + 1,
            "updated_at": datetime.now(timezone.utc),
        }
        if new_stage is not None:
            values["stage"] = new_stage
        if resolved_at is not None:
            values["resolved_at"] = resolved_at
        if recovered_amount_inr is not None:
            values["recovered_amount_inr"] = recovered_amount_inr
        if failure_category is not None:
            values["failure_category"] = failure_category
        if failure_code is not None:
            values["failure_code"] = failure_code
        if attempt_count is not None:
            values["attempt_count"] = attempt_count
        if contacts_count is not None:
            values["contacts_count"] = contacts_count

        stmt = (
            update(RecoveryCase)
            .where(
                RecoveryCase.id == case_id,
                RecoveryCase.version == expected_version
            )
            .values(**values)
            .execution_options(synchronize_session="fetch")
        )

        result = self.session.execute(stmt)
        if result.rowcount == 0:
            raise OptimisticLockError(
                f"Optimistic lock conflict on RecoveryCase '{case_id}': "
                f"expected version {expected_version}."
            )

        updated_case = self.get_by_id(case_id)
        if updated_case is None:
            raise ValueError(f"RecoveryCase '{case_id}' not found after update.")
        return updated_case
