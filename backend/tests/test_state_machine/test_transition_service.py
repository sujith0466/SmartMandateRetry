"""PostgreSQL integration tests for StateTransitionService and audit trails."""

from decimal import Decimal
import uuid
import pytest
from sqlalchemy.orm import Session

from app.domain.models import AuditEvent, Customer, Merchant, RecoveryCase, Subscription
from app.domain.state_machine import TransitionStatus
from app.infrastructure.repositories.unit_of_work import UnitOfWork
from app.services.state_transition_service import StateTransitionService


def _create_integration_case(uow: UnitOfWork, prefix: str) -> str:
    uid = uuid.uuid4().hex[:6]
    case_id = f"case_{prefix}_{uid}"
    with uow:
        m = Merchant(id=f"m_{prefix}_{uid}", name=f"Integ Merchant {prefix}", razorpay_account_id=f"acc_{prefix}_{uid}")
        c = Customer(id=f"c_{prefix}_{uid}", merchant_id=m.id, razorpay_customer_id=f"cust_{prefix}_{uid}")
        s = Subscription(id=f"s_{prefix}_{uid}", merchant_id=m.id, customer_id=c.id, razorpay_subscription_id=f"sub_{prefix}_{uid}", status="halted", plan_id="p_integ")
        case = RecoveryCase(
            id=case_id,
            merchant_id=m.id,
            subscription_id=s.id,
            invoice_id=f"inv_{prefix}_{uid}",
            amount_inr=Decimal("5000.00"),
            currency="INR",
            stage="HALTED_RECOVERY",
            state="DETECTED",
            version=1,
        )
        uow.merchants.add(m)
        uow.customers.add(c)
        uow.subscriptions.add(s)
        uow.cases.add(case)
        uow.commit()
    return case_id


def test_transition_service_successful_lifecycle_and_audit(uow: UnitOfWork, db_session: Session):
    case_id = _create_integration_case(uow, "lifecycle")
    service = StateTransitionService(uow=uow)

    # 1. Transition DETECTED -> ANALYZING
    res1 = service.transition_case(
        case_id=case_id,
        target_state="ANALYZING",
        correlation_id=f"corr_fsm_01_{case_id}",
        reason="Context aggregation started",
    )
    assert res1.status == TransitionStatus.TRANSITIONED
    assert res1.previous_state == "DETECTED"
    assert res1.new_state == "ANALYZING"
    assert res1.new_version == 2

    # Verify audit event in DB
    audit1 = db_session.query(AuditEvent).filter_by(correlation_id=f"corr_fsm_01_{case_id}").first()
    assert audit1 is not None
    assert audit1.event_type == "RECOVERY_STATE_TRANSITIONED"
    assert audit1.payload["previous_state"] == "DETECTED"
    assert audit1.payload["new_state"] == "ANALYZING"
    assert audit1.payload["new_version"] == 2

    # 2. Transition ANALYZING -> DECISION_PENDING
    res2 = service.transition_case(
        case_id=case_id,
        target_state="DECISION_PENDING",
        correlation_id=f"corr_fsm_02_{case_id}"
    )
    assert res2.new_state == "DECISION_PENDING"
    assert res2.new_version == 3

    # 3. Transition DECISION_PENDING -> POLICY_REVIEW
    res3 = service.transition_case(
        case_id=case_id,
        target_state="POLICY_REVIEW",
        correlation_id=f"corr_fsm_03_{case_id}"
    )
    assert res3.new_state == "POLICY_REVIEW"
    assert res3.new_version == 4

    # 4. Transition POLICY_REVIEW -> SCHEDULED
    res4 = service.transition_case(
        case_id=case_id,
        target_state="SCHEDULED",
        correlation_id=f"corr_fsm_04_{case_id}"
    )
    assert res4.new_state == "SCHEDULED"
    assert res4.new_version == 5

    # 5. Transition SCHEDULED -> RECOVERED
    res5 = service.transition_case(
        case_id=case_id,
        target_state="RECOVERED",
        correlation_id=f"corr_fsm_05_{case_id}",
        recovered_amount_inr=Decimal("5000.00"),
    )
    assert res5.new_state == "RECOVERED"
    assert res5.new_version == 6

    # Verify final case in DB
    with uow:
        case = uow.cases.get_by_id(case_id)
        assert case.state == "RECOVERED"
        assert case.version == 6
        assert case.recovered_amount_inr == Decimal("5000.00")
        assert case.resolved_at is not None


def test_transition_service_idempotent_duplicate_call(uow: UnitOfWork, db_session: Session):
    case_id = _create_integration_case(uow, "dup")
    service = StateTransitionService(uow=uow)

    # Transition DETECTED -> SCHEDULED
    res1 = service.transition_case(
        case_id=case_id,
        target_state="SCHEDULED",
        correlation_id=f"corr_dup_01_{case_id}"
    )
    assert res1.status == TransitionStatus.TRANSITIONED
    assert res1.new_version == 2

    # Repeat call with identical target state
    res2 = service.transition_case(
        case_id=case_id,
        target_state="SCHEDULED",
        correlation_id=f"corr_dup_02_{case_id}"
    )
    assert res2.status == TransitionStatus.ALREADY_APPLIED
    assert res2.new_version == 2  # Version NOT incremented

    # Verify no second audit event was written for corr_dup_02
    audit2 = db_session.query(AuditEvent).filter_by(correlation_id=f"corr_dup_02_{case_id}").first()
    assert audit2 is None
