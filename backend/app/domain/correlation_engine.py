"""Correlation engine binding inbound provider evidence to active recovery aggregates."""

from typing import Optional, Tuple

from app.core.logging import get_logger
from app.domain.models import RecoveryAction, RecoveryCase
from app.domain.reconciliation_schemas import ReconciliationEvidence
from app.infrastructure.repositories.unit_of_work import UnitOfWork

logger = get_logger("reconciliation.correlation_engine")


class CorrelationEngine:
    """
    Deterministic correlation engine implementing the prioritized identification hierarchy:
    1. Payment Link ID (matches RecoveryAction.external_reference_id)
    2. Invoice ID (matches RecoveryCase.invoice_id)
    3. Subscription ID (matches Subscription.razorpay_subscription_id or RecoveryCase.subscription_id)
    4. Payment ID (matches RecoveryCase.payment_id)
    """

    def correlate(
        self,
        evidence: ReconciliationEvidence,
        uow: UnitOfWork
    ) -> Tuple[Optional[RecoveryCase], Optional[RecoveryAction], str, Optional[str]]:
        """
        Correlate evidence to RecoveryCase and optional RecoveryAction.
        Returns: (RecoveryCase, RecoveryAction, match_type, match_key)
        """
        # 1. Payment Link ID Hierarchy
        plink_id = evidence.payment_link_id or (
            evidence.entity_id if evidence.entity_type == "payment_link" else None
        )
        if plink_id:
            action = uow.actions.find_by_external_reference_id(plink_id)
            if action:
                case = uow.cases.get_by_id(action.recovery_case_id)
                if case:
                    logger.info(
                        "Correlated evidence via Payment Link ID",
                        plink_id=plink_id,
                        case_id=case.id,
                        action_id=action.id
                    )
                    return case, action, "PAYMENT_LINK_ID", plink_id

        # 2. Invoice ID Hierarchy
        if evidence.invoice_id:
            # Search by invoice_id in active cases
            stmt_cases = uow.session.query(RecoveryCase).filter(
                RecoveryCase.invoice_id == evidence.invoice_id
            ).order_by(RecoveryCase.created_at.desc()).all()

            if stmt_cases:
                # Prefer active case if multiple exist
                active_case = next(
                    (c for c in stmt_cases if c.state not in ("RECOVERED", "STOPPED", "EXPIRED")),
                    stmt_cases[0]
                )
                actions = uow.actions.list_by_case_id(active_case.id)
                latest_action = actions[-1] if actions else None
                logger.info(
                    "Correlated evidence via Invoice ID",
                    invoice_id=evidence.invoice_id,
                    case_id=active_case.id
                )
                return active_case, latest_action, "INVOICE_ID", evidence.invoice_id

        # 3. Subscription ID Hierarchy (support both Razorpay subscription ID and internal ID)
        if evidence.subscription_id:
            sub = uow.subscriptions.find_by_razorpay_id(evidence.subscription_id)
            sub_db_id = sub.id if sub else evidence.subscription_id
            sub_cases = uow.cases.find_by_subscription_id(sub_db_id)

            if sub_cases:
                # Prefer unresolved / active case
                active_case = next(
                    (c for c in sub_cases if c.state not in ("RECOVERED", "STOPPED", "EXPIRED")),
                    sub_cases[0]
                )
                actions = uow.actions.list_by_case_id(active_case.id)
                latest_action = actions[-1] if actions else None
                logger.info(
                    "Correlated evidence via Subscription ID",
                    subscription_id=evidence.subscription_id,
                    case_id=active_case.id
                )
                return active_case, latest_action, "SUBSCRIPTION_ID", evidence.subscription_id

        # 4. Payment ID Hierarchy
        payment_id = evidence.payment_id or (
            evidence.entity_id if evidence.entity_type == "payment" else None
        )
        if payment_id:
            case_by_pay = uow.session.query(RecoveryCase).filter(
                RecoveryCase.payment_id == payment_id
            ).first()
            if case_by_pay:
                actions = uow.actions.list_by_case_id(case_by_pay.id)
                latest_action = actions[-1] if actions else None
                logger.info(
                    "Correlated evidence via Payment ID",
                    payment_id=payment_id,
                    case_id=case_by_pay.id
                )
                return case_by_pay, latest_action, "PAYMENT_ID", payment_id

        logger.info(
            "Evidence could not be correlated to any existing RecoveryCase",
            evidence_id=evidence.evidence_id,
            event_type=evidence.event_type
        )
        return None, None, "NONE", None
