"""Core reconciliation engine evaluating payment evidence, amounts, and settlement outcomes."""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
import uuid

from app.core.logging import get_logger
from app.domain.models import RecoveryAction, RecoveryCase
from app.domain.reconciliation_schemas import (
    PaymentOutcome, ReconciliationEvidence, ReconciliationResult, ReconciliationStatus
)

logger = get_logger("reconciliation.reconciliation_engine")


class ReconciliationEngine:
    """
    Evaluates inbound payment evidence against correlated recovery cases with strict financial
    and state monotonicity guarantees.
    """

    def map_event_to_outcome(self, event_type: str) -> PaymentOutcome:
        """Map standardized gateway event type to authoritative PaymentOutcome enum."""
        norm = event_type.upper().strip().replace(".", "_")
        if norm in (
            "PAYMENT_CAPTURED", "PAYMENT_LINK_PAID", "SUBSCRIPTION_CHARGED",
            "INVOICE_PAID", "ORDER_PAID", "CAPTURED", "PAID"
        ):
            return PaymentOutcome.PAYMENT_SUCCEEDED
        elif norm in ("PAYMENT_FAILED", "FAILED"):
            return PaymentOutcome.PAYMENT_FAILED
        elif norm in ("PAYMENT_PENDING", "PENDING", "AUTHORIZED"):
            return PaymentOutcome.PAYMENT_PENDING
        elif norm in ("PAYMENT_NOT_FOUND", "NOT_FOUND"):
            return PaymentOutcome.PAYMENT_NOT_FOUND
        elif norm in ("PAYMENT_CANCELLED", "CANCELLED", "HALTED", "SUBSCRIPTION_HALTED"):
            return PaymentOutcome.PAYMENT_CANCELLED
        return PaymentOutcome.UNKNOWN

    def evaluate(
        self,
        evidence: ReconciliationEvidence,
        case: Optional[RecoveryCase],
        action: Optional[RecoveryAction],
        match_type: str,
        match_key: Optional[str]
    ) -> ReconciliationResult:
        """
        Evaluate evidence and produce immutable, authoritative ReconciliationResult.
        """
        reconciliation_id = f"rec_{uuid.uuid4().hex[:12]}"
        outcome = self.map_event_to_outcome(evidence.event_type)

        # 1. Uncorrelatable Evidence
        if not case:
            logger.info(
                "Uncorrelatable evidence evaluated as UNKNOWN",
                evidence_id=evidence.evidence_id,
                outcome=outcome.value
            )
            return ReconciliationResult(
                reconciliation_id=reconciliation_id,
                case_id=None,
                recovery_action_id=None,
                payment_outcome=outcome,
                reconciliation_status=ReconciliationStatus.UNKNOWN,
                settled_amount_inr=None,
                currency=evidence.currency,
                evidence_id=evidence.evidence_id,
                correlation_key=match_key,
                correlation_match_type=match_type,
                notes="Evidence could not be correlated to an active RecoveryCase",
            )

        # 2. Payment Succeeded Evaluation
        if outcome == PaymentOutcome.PAYMENT_SUCCEEDED:
            # Monotonicity & Idempotency: If already recovered, return DUPLICATE_IGNORED
            if case.state == "RECOVERED":
                logger.info(
                    "Case already RECOVERED; duplicate settlement event acknowledged cleanly",
                    case_id=case.id,
                    evidence_id=evidence.evidence_id
                )
                return ReconciliationResult(
                    reconciliation_id=reconciliation_id,
                    case_id=case.id,
                    recovery_action_id=action.id if action else None,
                    payment_outcome=outcome,
                    reconciliation_status=ReconciliationStatus.DUPLICATE_IGNORED,
                    settled_amount_inr=case.recovered_amount_inr,
                    currency=case.currency,
                    evidence_id=evidence.evidence_id,
                    correlation_key=match_key,
                    correlation_match_type=match_type,
                    notes="Case is already in terminal RECOVERED state; duplicate ignored",
                )

            # Currency Validation
            if evidence.currency.upper() != case.currency.upper():
                logger.warning(
                    "Currency mismatch in settlement reconciliation",
                    case_id=case.id,
                    case_currency=case.currency,
                    evidence_currency=evidence.currency
                )
                return ReconciliationResult(
                    reconciliation_id=reconciliation_id,
                    case_id=case.id,
                    recovery_action_id=action.id if action else None,
                    payment_outcome=outcome,
                    reconciliation_status=ReconciliationStatus.MISMATCH,
                    settled_amount_inr=evidence.amount_inr,
                    currency=evidence.currency,
                    evidence_id=evidence.evidence_id,
                    correlation_key=match_key,
                    correlation_match_type=match_type,
                    notes=f"Currency mismatch: expected {case.currency}, got {evidence.currency}",
                )

            # Amount Validation (Exact Decimal Comparison)
            if evidence.amount_inr is not None and case.amount_inr is not None:
                if evidence.amount_inr != case.amount_inr:
                    logger.warning(
                        "Amount mismatch in settlement reconciliation",
                        case_id=case.id,
                        expected_amount=str(case.amount_inr),
                        received_amount=str(evidence.amount_inr)
                    )
                    return ReconciliationResult(
                        reconciliation_id=reconciliation_id,
                        case_id=case.id,
                        recovery_action_id=action.id if action else None,
                        payment_outcome=outcome,
                        reconciliation_status=ReconciliationStatus.MISMATCH,
                        settled_amount_inr=evidence.amount_inr,
                        currency=case.currency,
                        evidence_id=evidence.evidence_id,
                        correlation_key=match_key,
                        correlation_match_type=match_type,
                        notes=f"Amount mismatch: expected {case.amount_inr} INR, got {evidence.amount_inr} INR",
                    )

            # Fully Reconciled Settlement
            settled_amount = evidence.amount_inr if evidence.amount_inr is not None else case.amount_inr
            logger.info(
                "Settlement successfully verified and reconciled",
                case_id=case.id,
                settled_amount=str(settled_amount),
                match_type=match_type
            )
            return ReconciliationResult(
                reconciliation_id=reconciliation_id,
                case_id=case.id,
                recovery_action_id=action.id if action else None,
                payment_outcome=outcome,
                reconciliation_status=ReconciliationStatus.RECONCILED,
                settled_amount_inr=settled_amount,
                currency=case.currency,
                evidence_id=evidence.evidence_id,
                correlation_key=match_key,
                correlation_match_type=match_type,
                notes="Payment captured and attributed to recovery case successfully",
            )

        # 3. Payment Failed Evaluation
        elif outcome == PaymentOutcome.PAYMENT_FAILED:
            # Monotonicity Guard: A late failure MUST NOT revert an already RECOVERED case
            if case.state == "RECOVERED":
                logger.info(
                    "Late failure event rejected on already RECOVERED case",
                    case_id=case.id,
                    evidence_id=evidence.evidence_id
                )
                return ReconciliationResult(
                    reconciliation_id=reconciliation_id,
                    case_id=case.id,
                    recovery_action_id=action.id if action else None,
                    payment_outcome=outcome,
                    reconciliation_status=ReconciliationStatus.DUPLICATE_IGNORED,
                    settled_amount_inr=case.recovered_amount_inr,
                    currency=case.currency,
                    evidence_id=evidence.evidence_id,
                    correlation_key=match_key,
                    correlation_match_type=match_type,
                    notes="Late failure event ignored on already recovered case",
                )

            logger.info(
                "Payment failure confirmed and reconciled for case",
                case_id=case.id,
                error_code=evidence.error_code
            )
            return ReconciliationResult(
                reconciliation_id=reconciliation_id,
                case_id=case.id,
                recovery_action_id=action.id if action else None,
                payment_outcome=outcome,
                reconciliation_status=ReconciliationStatus.FAILED,
                settled_amount_inr=Decimal("0.00"),
                currency=case.currency,
                evidence_id=evidence.evidence_id,
                correlation_key=match_key,
                correlation_match_type=match_type,
                notes=evidence.error_description or "Payment failure confirmed by provider",
            )

        # 4. Payment Pending Evaluation
        elif outcome == PaymentOutcome.PAYMENT_PENDING:
            return ReconciliationResult(
                reconciliation_id=reconciliation_id,
                case_id=case.id,
                recovery_action_id=action.id if action else None,
                payment_outcome=outcome,
                reconciliation_status=ReconciliationStatus.PENDING_VERIFICATION,
                settled_amount_inr=None,
                currency=case.currency,
                evidence_id=evidence.evidence_id,
                correlation_key=match_key,
                correlation_match_type=match_type,
                notes="Payment authorized or pending settlement",
            )

        # 5. Cancelled / Not Found / Unknown Outcomes
        else:
            return ReconciliationResult(
                reconciliation_id=reconciliation_id,
                case_id=case.id,
                recovery_action_id=action.id if action else None,
                payment_outcome=outcome,
                reconciliation_status=ReconciliationStatus.UNKNOWN,
                settled_amount_inr=None,
                currency=case.currency,
                evidence_id=evidence.evidence_id,
                correlation_key=match_key,
                correlation_match_type=match_type,
                notes=f"Inconclusive provider outcome: {outcome.value}",
            )
