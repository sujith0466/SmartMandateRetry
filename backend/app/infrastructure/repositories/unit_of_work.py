"""Unit of Work pattern managing database transactions and repository lifecycles."""

from typing import Callable, Optional
from sqlalchemy.orm import Session

from app.infrastructure.database import get_session
from app.infrastructure.repositories.audit_events import AuditEventRepository
from app.infrastructure.repositories.domain_entities import (
    CustomerRepository, EvaluationRepository, MerchantRepository,
    RecoveryActionRepository, RecoveryDecisionRepository,
    RecoveryPolicyRepository, SubscriptionRepository
)
from app.infrastructure.repositories.recovery_cases import RecoveryCaseRepository
from app.infrastructure.repositories.webhook_events import WebhookEventRepository


class UnitOfWork:
    """
    Context manager providing atomic transaction management and access to all repositories.
    Guarantees session cleanup, rollback on exception, and explicit commit semantics.
    """

    def __init__(self, session_factory: Optional[Callable[[], Session]] = None) -> None:
        self._session_factory = session_factory or get_session
        self._session: Optional[Session] = None

    def __enter__(self) -> "UnitOfWork":
        self._session = self._session_factory()
        self.merchants = MerchantRepository(self._session)
        self.policies = RecoveryPolicyRepository(self._session)
        self.customers = CustomerRepository(self._session)
        self.subscriptions = SubscriptionRepository(self._session)
        self.cases = RecoveryCaseRepository(self._session)
        self.decisions = RecoveryDecisionRepository(self._session)
        self.actions = RecoveryActionRepository(self._session)
        self.webhook_events = WebhookEventRepository(self._session)
        self.audit_events = AuditEventRepository(self._session)
        self.evaluations = EvaluationRepository(self._session)
        return self

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        if self._session:
            try:
                if exc_type is not None:
                    self.rollback()
            finally:
                self._session.close()

    @property
    def session(self) -> Session:
        if self._session is None:
            raise RuntimeError("UnitOfWork has not been entered. Use 'with UnitOfWork():'.")
        return self._session

    def commit(self) -> None:
        """Explicitly commit active transaction."""
        if self._session:
            self._session.commit()

    def rollback(self) -> None:
        """Rollback active transaction."""
        if self._session:
            self._session.rollback()

    def flush(self) -> None:
        """Flush changes to database without committing transaction."""
        if self._session:
            self._session.flush()
