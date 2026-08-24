"""Append-only audit events repository."""

from typing import Any, Dict, List, Optional
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.domain.models import AuditEvent
from app.infrastructure.repositories.base import BaseRepository


class AuditEventRepository(BaseRepository[AuditEvent]):
    """Repository managing immutable append-only audit records."""

    def __init__(self, session: Session) -> None:
        super().__init__(AuditEvent, session)

    def record_event(
        self,
        merchant_id: str,
        event_type: str,
        actor: str,
        payload: Dict[str, Any],
        recovery_case_id: Optional[str] = None,
        correlation_id: Optional[str] = None,
    ) -> AuditEvent:
        """Create and append an immutable audit record."""
        event = AuditEvent(
            merchant_id=merchant_id,
            recovery_case_id=recovery_case_id,
            event_type=event_type,
            actor=actor,
            payload=payload,
            correlation_id=correlation_id,
        )
        self.add(event)
        self.session.flush()
        return event

    def find_by_case_id(self, recovery_case_id: str) -> List[AuditEvent]:
        """Retrieve audit history for a specific recovery case in chronological order."""
        stmt = (
            select(AuditEvent)
            .where(AuditEvent.recovery_case_id == recovery_case_id)
            .order_by(AuditEvent.created_at.asc())
        )
        return list(self.session.scalars(stmt).all())

    def find_by_merchant(
        self,
        merchant_id: str,
        limit: int = 100,
        offset: int = 0
    ) -> List[AuditEvent]:
        """Retrieve system-wide audit history for a merchant."""
        stmt = (
            select(AuditEvent)
            .where(AuditEvent.merchant_id == merchant_id)
            .order_by(AuditEvent.created_at.desc())
            .limit(limit)
            .offset(offset)
        )
        return list(self.session.scalars(stmt).all())
