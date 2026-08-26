"""Phase 20: Database Readiness, Transaction Boundaries, and Integrity Tests."""

from datetime import datetime, timezone
from decimal import Decimal
import uuid
import pytest
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.domain.models import AuditEvent, Customer, Merchant, RecoveryAction, RecoveryCase, RecoveryPolicy, Subscription, WebhookEvent
from app.infrastructure.repositories.unit_of_work import UnitOfWork


class TestDatabaseReadiness:
    def test_transaction_rollback_on_unhandled_exception(self, uow: UnitOfWork, db_session: Session):
        """Test that failure in multi-step transaction cleanly rolls back all modifications."""
        uid = uuid.uuid4().hex[:8]
        merch_id = f"m_roll_{uid}"

        try:
            with uow:
                m = Merchant(id=merch_id, name=f"Rollback Merchant {uid}", razorpay_account_id=f"acc_{uid}")
                uow.merchants.add(m)
                # Force an error before commit
                raise RuntimeError("Simulated transaction fault")
        except RuntimeError:
            pass

        # Verify merchant was NOT saved to database
        persisted = db_session.query(Merchant).filter_by(id=merch_id).first()
        assert persisted is None

    def test_webhook_event_idempotency_unique_constraint(self, uow: UnitOfWork):
        """Test that duplicate webhook event_id is rejected by database unique constraint."""
        uid = uuid.uuid4().hex[:8]
        event_id = f"evt_dup_{uid}"

        with uow:
            evt1 = WebhookEvent(
                id=f"wevt_1_{uid}",
                event_id=event_id,
                event_type="payment.failed",
                payload={"test": 1},
            )
            uow.webhook_events.add(evt1)
            uow.commit()

        # Adding same event_id should raise IntegrityError
        with pytest.raises(IntegrityError):
            with uow:
                evt2 = WebhookEvent(
                    id=f"wevt_2_{uid}",
                    event_id=event_id,
                    event_type="payment.failed",
                    payload={"test": 2},
                )
                uow.webhook_events.add(evt2)
                uow.commit()

    def test_recovery_action_idempotency_key_unique_constraint(self, uow: UnitOfWork):
        """Test that duplicate recovery action idempotency_key is rejected."""
        uid = uuid.uuid4().hex[:8]
        merch_id = f"m_act_{uid}"
        case_id = f"case_act_{uid}"
        idem_key = f"phase8:{case_id}:unique_key"

        with uow:
            m = Merchant(id=merch_id, name=f"Action Merchant {uid}", razorpay_account_id=f"acc_{uid}")
            c = Customer(id=f"c_{uid}", merchant_id=merch_id, razorpay_customer_id=f"cust_{uid}")
            s = Subscription(id=f"s_{uid}", merchant_id=merch_id, customer_id=c.id, razorpay_subscription_id=f"sub_{uid}", status="active", plan_id="p1")
            case = RecoveryCase(id=case_id, merchant_id=merch_id, subscription_id=s.id, invoice_id=f"inv_{uid}", amount_inr=Decimal("1000.00"), currency="INR", stage="HALTED_RECOVERY", state="IN_PROGRESS")
            act1 = RecoveryAction(id=f"act_1_{uid}", recovery_case_id=case.id, action_type="PAYMENT_LINK_RECOVERY", idempotency_key=idem_key, status="EXECUTED")
            uow.merchants.add(m)
            uow.customers.add(c)
            uow.subscriptions.add(s)
            uow.cases.add(case)
            uow.actions.add(act1)
            uow.commit()

        with pytest.raises(IntegrityError):
            with uow:
                act2 = RecoveryAction(id=f"act_2_{uid}", recovery_case_id=case_id, action_type="PAYMENT_LINK_RECOVERY", idempotency_key=idem_key, status="EXECUTED")
                uow.actions.add(act2)
                uow.commit()
