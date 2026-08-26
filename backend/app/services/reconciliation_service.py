"""Reconciliation service managing settlement outcome verification, state transitions, and audit trails."""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, Optional
import uuid
import requests

from app.core.logging import get_logger
from app.domain.correlation_engine import CorrelationEngine
from app.domain.models import RecoveryCase
from app.domain.normalized_event import NormalizedWebhookEvent
from app.domain.reconciliation_engine import ReconciliationEngine
from app.domain.reconciliation_schemas import (
    PaymentOutcome, ReconciliationEvidence, ReconciliationResult, ReconciliationStatus
)
from app.infrastructure.database import get_session
from app.infrastructure.razorpay_client import RazorpayClient, get_razorpay_client
from app.infrastructure.repositories.unit_of_work import UnitOfWork

logger = get_logger("reconciliation.service")


class ReconciliationService:
    """
    Application service verifying inbound payment evidence, updating case/action states,
    and recording authoritative settlement audit trails.
    """

    def __init__(
        self,
        correlation_engine: Optional[CorrelationEngine] = None,
        reconciliation_engine: Optional[ReconciliationEngine] = None,
        uow: Optional[UnitOfWork] = None,
        razorpay_client: Optional[RazorpayClient] = None,
    ) -> None:
        self.correlation_engine = correlation_engine or CorrelationEngine()
        self.reconciliation_engine = reconciliation_engine or ReconciliationEngine()
        self.uow = uow or UnitOfWork(get_session)
        self.razorpay_client = razorpay_client or get_razorpay_client()

    def reconcile_evidence(
        self,
        evidence: ReconciliationEvidence,
        correlation_id: Optional[str] = None,
    ) -> ReconciliationResult:
        """
        Reconcile evidence within UnitOfWork transaction boundary with OCC and audit trail.
        """
        with self.uow:
            case, action, match_type, match_key = self.correlation_engine.correlate(evidence, self.uow)
            result = self.reconciliation_engine.evaluate(evidence, case, action, match_type, match_key)

            # 1. Successful Settlement Mutation
            if result.reconciliation_status == ReconciliationStatus.RECONCILED and case is not None:
                case.state = "RECOVERED"
                case.recovered_amount_inr = result.settled_amount_inr or case.amount_inr
                case.resolved_at = result.reconciled_at
                if action:
                    action.status = "RECONCILED"

                self.uow.audit_events.record_event(
                    merchant_id=case.merchant_id,
                    event_type="PAYMENT_OUTCOME_RECONCILED",
                    actor="RECONCILIATION_ENGINE",
                    payload=result.to_dict(),
                    recovery_case_id=case.id,
                    correlation_id=correlation_id,
                )

            # 2. Failed Payment Mutation
            elif result.reconciliation_status == ReconciliationStatus.FAILED and case is not None:
                if case.state not in ("RECOVERED", "STOPPED", "EXPIRED"):
                    case.state = "FAILED"
                if action and action.status != "RECONCILED":
                    action.status = "FAILED"

                self.uow.audit_events.record_event(
                    merchant_id=case.merchant_id,
                    event_type="PAYMENT_OUTCOME_FAILED",
                    actor="RECONCILIATION_ENGINE",
                    payload=result.to_dict(),
                    recovery_case_id=case.id,
                    correlation_id=correlation_id,
                )

            # 3. Mismatch Conflict Audit
            elif result.reconciliation_status == ReconciliationStatus.MISMATCH and case is not None:
                self.uow.audit_events.record_event(
                    merchant_id=case.merchant_id,
                    event_type="PAYMENT_OUTCOME_MISMATCH",
                    actor="RECONCILIATION_ENGINE",
                    payload=result.to_dict(),
                    recovery_case_id=case.id,
                    correlation_id=correlation_id,
                )

            # 4. Unknown Uncorrelatable Audit
            elif result.reconciliation_status == ReconciliationStatus.UNKNOWN:
                merchant_id = case.merchant_id if case else None
                if not merchant_id and evidence.raw_payload:
                    acc_id = evidence.raw_payload.get("account_id") or evidence.raw_payload.get("merchant_account_id")
                    if acc_id:
                        m = self.uow.merchants.find_by_razorpay_account(acc_id)
                        if m:
                            merchant_id = m.id

                if merchant_id:
                    self.uow.audit_events.record_event(
                        merchant_id=merchant_id,
                        event_type="PAYMENT_OUTCOME_UNKNOWN",
                        actor="RECONCILIATION_ENGINE",
                        payload=result.to_dict(),
                        recovery_case_id=case.id if case else None,
                        correlation_id=correlation_id,
                    )

            self.uow.commit()

        logger.info(
            "Reconciliation evaluation completed and committed",
            reconciliation_id=result.reconciliation_id,
            status=result.reconciliation_status.value,
            case_id=result.case_id,
            match_type=result.correlation_match_type
        )
        return result

    def reconcile_normalized_event(
        self,
        event: NormalizedWebhookEvent,
        correlation_id: Optional[str] = None,
    ) -> ReconciliationResult:
        """
        Convert NormalizedWebhookEvent into ReconciliationEvidence and reconcile.
        """
        evidence = ReconciliationEvidence(
            evidence_id=f"ev_{event.event_id}",
            event_type=event.event_type,
            provider=event.provider,
            entity_type=event.entity_type,
            entity_id=event.entity_id,
            payment_id=event.entity_id if event.entity_type == "payment" else None,
            invoice_id=event.invoice_id,
            subscription_id=event.subscription_id,
            payment_link_id=event.entity_id if event.entity_type == "payment_link" else None,
            amount_inr=event.amount_inr,
            currency=event.currency,
            error_code=event.error_metadata.get("code") if event.error_metadata else None,
            error_description=event.error_metadata.get("description") if event.error_metadata else None,
            occurred_at=event.occurred_at,
            raw_payload=event.raw_payload,
        )
        return self.reconcile_evidence(evidence, correlation_id=correlation_id)

    def reconcile_via_direct_gateway_check(
        self,
        payment_id: str,
        case_id: str,
        correlation_id: Optional[str] = None,
    ) -> ReconciliationResult:
        """
        Direct gateway status polling fallback (TSK-018-08) for missing/delayed webhooks.
        """
        evidence_id = f"ev_direct_{uuid.uuid4().hex[:8]}"
        try:
            pay_resp = self.razorpay_client.fetch_payment(payment_id)
            status = pay_resp.get("status", "unknown")
            amount_paise = pay_resp.get("amount", 0)
            amount_inr = Decimal(str(amount_paise / 100))
            currency = pay_resp.get("currency", "INR")

            event_type = "PAYMENT_CAPTURED" if status == "captured" else (
                "PAYMENT_FAILED" if status == "failed" else "PAYMENT_PENDING"
            )

            evidence = ReconciliationEvidence(
                evidence_id=evidence_id,
                event_type=event_type,
                provider="razorpay_direct_api",
                entity_type="payment",
                entity_id=payment_id,
                payment_id=payment_id,
                invoice_id=pay_resp.get("invoice_id"),
                amount_inr=amount_inr,
                currency=currency,
                occurred_at=datetime.now(timezone.utc),
                raw_payload=pay_resp,
            )
            return self.reconcile_evidence(evidence, correlation_id=correlation_id)

        except requests.exceptions.Timeout as e:
            logger.warning("Direct gateway verification timed out", payment_id=payment_id, error=str(e))
            return ReconciliationResult(
                reconciliation_id=f"rec_err_{uuid.uuid4().hex[:8]}",
                case_id=case_id,
                recovery_action_id=None,
                payment_outcome=PaymentOutcome.UNKNOWN,
                reconciliation_status=ReconciliationStatus.PENDING_VERIFICATION,
                settled_amount_inr=None,
                currency="INR",
                evidence_id=evidence_id,
                correlation_key=payment_id,
                correlation_match_type="PAYMENT_ID",
                notes="Gateway connection timed out during direct verification",
            )
        except Exception as e:
            logger.warning("Direct gateway verification failed", payment_id=payment_id, error=str(e))
            return ReconciliationResult(
                reconciliation_id=f"rec_err_{uuid.uuid4().hex[:8]}",
                case_id=case_id,
                recovery_action_id=None,
                payment_outcome=PaymentOutcome.UNKNOWN,
                reconciliation_status=ReconciliationStatus.UNKNOWN,
                settled_amount_inr=None,
                currency="INR",
                evidence_id=evidence_id,
                correlation_key=payment_id,
                correlation_match_type="PAYMENT_ID",
                notes=f"Gateway verification error: {str(e)}",
            )
