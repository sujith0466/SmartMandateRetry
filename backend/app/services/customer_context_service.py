"""Customer context aggregation service with transaction isolation and audit logging."""

from typing import Optional

from app.core.errors import ResourceNotFoundError
from app.core.logging import get_logger
from app.domain.context_builder import CustomerContextBuilder
from app.domain.customer_context import CustomerRecoveryContext
from app.domain.failure_assessment import FailureAssessment
from app.infrastructure.database import get_session
from app.infrastructure.razorpay_client import RazorpayClient
from app.infrastructure.repositories.unit_of_work import UnitOfWork

logger = get_logger("smartmandate.customer_context_service")


class CustomerContextService:
    """Service coordinating DB entity retrieval, metric aggregation, and audit logging."""

    def __init__(
        self,
        builder: Optional[CustomerContextBuilder] = None,
        uow: Optional[UnitOfWork] = None,
    ) -> None:
        self.builder = builder or CustomerContextBuilder()
        self.uow = uow or UnitOfWork(get_session)

    def aggregate_context(
        self,
        case_id: str,
        failure_assessment: FailureAssessment,
        correlation_id: Optional[str] = None
    ) -> CustomerRecoveryContext:
        """
        Aggregate customer recovery context for an active recovery case and record audit event.
        """
        with self.uow:
            # 1. Fetch RecoveryCase
            case = self.uow.cases.get_by_id(case_id)
            if not case:
                raise ResourceNotFoundError("RecoveryCase", case_id)

            # 2. Fetch Subscription
            subscription = self.uow.subscriptions.get_by_id(case.subscription_id)
            if not subscription:
                raise ResourceNotFoundError("Subscription", case.subscription_id)

            # 3. Fetch Customer
            customer = self.uow.customers.get_by_id(subscription.customer_id)
            if not customer:
                raise ResourceNotFoundError("Customer", subscription.customer_id)

            # 4. Fetch All Cases for Subscription
            all_cases = self.uow.cases.find_by_subscription_id(subscription.id)

            # 5. Build Aggregated Context Tree
            context: CustomerRecoveryContext = self.builder.build_context(
                case=case,
                customer=customer,
                subscription=subscription,
                all_subscription_cases=all_cases,
                failure_assessment=failure_assessment,
            )

            # 6. Record Audit Event
            self.uow.audit_events.record_event(
                merchant_id=case.merchant_id,
                event_type="CUSTOMER_CONTEXT_AGGREGATED",
                actor="CUSTOMER_CONTEXT_SERVICE",
                payload=context.to_dict(),
                recovery_case_id=case.id,
                correlation_id=correlation_id,
            )

            self.uow.commit()

        return context
