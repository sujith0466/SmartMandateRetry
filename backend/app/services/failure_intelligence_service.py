"""Failure intelligence domain service orchestrating classification and persistence."""

from typing import Optional

from app.core.logging import get_logger
from app.domain.failure_assessment import FailureAssessment
from app.domain.failure_classifier import FailureClassificationEngine
from app.domain.models import AuditEvent, RecoveryCase
from app.domain.normalized_event import NormalizedWebhookEvent
from app.infrastructure.database import get_session
from app.infrastructure.repositories.unit_of_work import UnitOfWork

logger = get_logger("smartmandate.failure_intelligence_service")


class FailureIntelligenceService:
    """Orchestrates diagnostic failure classification and audit persistence."""

    def __init__(
        self,
        classifier: Optional[FailureClassificationEngine] = None,
        uow: Optional[UnitOfWork] = None,
    ) -> None:
        self.classifier = classifier or FailureClassificationEngine()
        self.uow = uow or UnitOfWork(get_session)

    def process_failure(
        self,
        event: NormalizedWebhookEvent,
        correlation_id: Optional[str] = None
    ) -> FailureAssessment:
        """
        Classify payment failure, update associated RecoveryCase attributes if present,
        and persist an immutable audit record.
        """
        assessment = self.classifier.classify(event)

        with self.uow:
            # 1. Resolve merchant_id
            merchant = self.uow.merchants.find_by_razorpay_account(event.merchant_account_id)
            merchant_id = merchant.id if merchant else "unknown_merchant"

            # 2. Look up existing RecoveryCase if invoice_id is present
            case: Optional[RecoveryCase] = None
            if event.invoice_id and merchant:
                case = self.uow.cases.find_by_merchant_and_invoice(merchant.id, event.invoice_id)

            # Update case classification fields if case exists
            if case:
                case.failure_category = assessment.failure_category.value
                case.failure_code = assessment.failure_code
                logger.info(
                    "Updated RecoveryCase with failure classification metadata",
                    case_id=case.id,
                    failure_category=case.failure_category,
                    failure_code=case.failure_code,
                    correlation_id=correlation_id,
                )

            # 3. Record immutable AuditEvent
            self.uow.audit_events.record_event(
                merchant_id=merchant_id,
                event_type="PAYMENT_FAILURE_CLASSIFIED",
                actor="FAILURE_INTELLIGENCE_ENGINE",
                payload=assessment.to_dict(),
                recovery_case_id=case.id if case else None,
                correlation_id=correlation_id,
            )

            self.uow.commit()

        return assessment
