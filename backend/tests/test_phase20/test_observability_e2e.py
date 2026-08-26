"""Phase 20: Observability and Operational Trace Reconstruction Tests."""

from datetime import datetime, timezone
from decimal import Decimal
import uuid
import pytest
from sqlalchemy.orm import Session

from app.domain.models import AuditEvent, Customer, Merchant, RecoveryCase, Subscription
from app.infrastructure.repositories.unit_of_work import UnitOfWork
from app.services.observability_service import ObservabilityService


class TestObservabilityE2E:
    def test_audit_event_logging_and_correlation_id_query(self, uow: UnitOfWork, db_session: Session):
        """Test that operational events can be filtered and reconstructed via correlation ID."""
        uid = uuid.uuid4().hex[:8]
        merch_id = f"m_obs_{uid}"
        case_id = f"case_obs_{uid}"
        corr_id = f"corr_trace_{uid}"

        with uow:
            m = Merchant(id=merch_id, name=f"Obs Merchant {uid}", razorpay_account_id=f"acc_{uid}")
            c = Customer(id=f"c_{uid}", merchant_id=merch_id, razorpay_customer_id=f"cust_{uid}")
            s = Subscription(id=f"s_{uid}", merchant_id=merch_id, customer_id=c.id, razorpay_subscription_id=f"sub_{uid}", status="active", plan_id="p1")
            case = RecoveryCase(id=case_id, merchant_id=merch_id, subscription_id=s.id, invoice_id=f"inv_{uid}", amount_inr=Decimal("1500.00"), currency="INR", stage="HALTED_RECOVERY", state="IN_PROGRESS")
            uow.merchants.add(m)
            uow.customers.add(c)
            uow.subscriptions.add(s)
            uow.cases.add(case)

            # Log 3 lifecycle stages with shared correlation_id
            evt1 = AuditEvent(
                id=f"aud_1_{uid}",
                merchant_id=merch_id,
                recovery_case_id=case_id,
                event_type="PAYMENT_FAILURE_INGESTED",
                actor="WEBHOOK_INGESTION",
                payload={"error_reason": "insufficient_funds"},
                correlation_id=corr_id,
            )
            evt2 = AuditEvent(
                id=f"aud_2_{uid}",
                merchant_id=merch_id,
                recovery_case_id=case_id,
                event_type="POLICY_EVALUATION_APPROVED",
                actor="POLICY_ENGINE",
                payload={"action": "PAYMENT_LINK_RECOVERY", "status": "ALLOWED"},
                correlation_id=corr_id,
            )
            evt3 = AuditEvent(
                id=f"aud_3_{uid}",
                merchant_id=merch_id,
                recovery_case_id=case_id,
                event_type="PAYMENT_OUTCOME_RECONCILED",
                actor="RECONCILIATION_SERVICE",
                payload={"outcome": "PAYMENT_SUCCEEDED"},
                correlation_id=corr_id,
            )
            uow.audit_events.add(evt1)
            uow.audit_events.add(evt2)
            uow.audit_events.add(evt3)
            uow.commit()

        # Query all audit events by correlation ID
        events = db_session.query(AuditEvent).filter_by(correlation_id=corr_id).order_by(AuditEvent.created_at).all()
        assert len(events) == 3
        assert events[0].event_type == "PAYMENT_FAILURE_INGESTED"
        assert events[1].event_type == "POLICY_EVALUATION_APPROVED"
        assert events[2].event_type == "PAYMENT_OUTCOME_RECONCILED"
