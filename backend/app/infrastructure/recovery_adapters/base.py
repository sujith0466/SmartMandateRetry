"""Abstract base adapter for Phase 8 recovery action executions."""

from abc import ABC, abstractmethod
from typing import Optional

from app.domain.action_execution_schemas import ActionExecutionRequest, ActionExecutionResult
from app.domain.models import RecoveryCase
from app.infrastructure.repositories.unit_of_work import UnitOfWork


class BaseRecoveryAdapter(ABC):
    """Abstract interface defining the execution contract for individual recovery actions."""

    @property
    @abstractmethod
    def action_type(self) -> str:
        """The specific action type handled by this adapter."""
        pass

    @abstractmethod
    def execute(
        self,
        request: ActionExecutionRequest,
        case: RecoveryCase,
        uow: UnitOfWork
    ) -> ActionExecutionResult:
        """
        Execute the recovery action safely, idempotently, and return the execution result.
        """
        pass
