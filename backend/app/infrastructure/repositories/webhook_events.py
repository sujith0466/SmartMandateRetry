"""WebhookEvent repository for idempotent ingestion tracking."""

from typing import Any, Dict, Optional, Tuple
from sqlalchemy import select, update
from sqlalchemy.orm import Session

from app.domain.models import WebhookEvent
from app.infrastructure.repositories.base import BaseRepository


class WebhookEventRepository(BaseRepository[WebhookEvent]):
    """Repository handling raw webhook idempotency and state."""

    def __init__(self, session: Session) -> None:
        super().__init__(WebhookEvent, session)

    def find_by_event_id(self, event_id: str) -> Optional[WebhookEvent]:
        """Lookup webhook record by gateway event ID."""
        stmt = select(WebhookEvent).where(WebhookEvent.event_id == event_id)
        return self.session.scalars(stmt).first()

    def insert_if_not_exists(
        self,
        event_id: str,
        event_type: str,
        payload: Dict[str, Any],
        signature_verified: bool = False
    ) -> Tuple[WebhookEvent, bool]:
        """
        Idempotently insert webhook event.
        Returns (WebhookEvent, created: bool). If already exists, returns existing instance and False.
        """
        existing = self.find_by_event_id(event_id)
        if existing:
            return existing, False

        event = WebhookEvent(
            event_id=event_id,
            event_type=event_type,
            payload=payload,
            signature_verified=signature_verified,
            processed=False,
        )
        self.add(event)
        self.session.flush()
        return event, True

    def mark_processed(self, event_id: str) -> None:
        """Mark event as processed."""
        stmt = (
            update(WebhookEvent)
            .where(WebhookEvent.event_id == event_id)
            .values(processed=True)
        )
        self.session.execute(stmt)
