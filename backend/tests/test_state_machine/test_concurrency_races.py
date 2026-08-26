"""Concurrency, OCC, and race tests for StateTransitionService."""

from decimal import Decimal
import uuid
import pytest

from app.core.errors import OptimisticLockError
from app.domain.models import Customer, Merchant, RecoveryAction, RecoveryCase, Subscription
from app.domain.state_machine import CaseState, TransitionStatus
from app.infrastructure.repositories.unit_of_work import UnitOfWork
from app.services.state_transition_service import StateTransitionService


def _create_case(uow: UnitOfWork, prefix: str) -> str:
    uid = uuid.uuid4().hex[:6]
    case_id = f"case_{prefix}_{uid}"
    with uow:
        m = Merchant(id=f"m_{prefix}_{uid}", name=f"FSM Merchant {prefix}", razorpay_account_id=f"acc_{prefix}_{uid}")
        c = Customer(id=f"c_{prefix}_{uid}", merchant_id=m.id, razorpay_customer_id=f"cust_{prefix}_{uid}")
        s = Subscription(id=f"s_{prefix}_{uid}", merchant_id=m.id, customer_id=c.id, razorpay_subscription_id=f"sub_{prefix}_{uid}", status="halted", plan_id="p_fsm")
        case = RecoveryCase(
            id=case_id,
            merchant_id=m.id,
            subscription_id=s.id,
            invoice_id=f"inv_{prefix}_{uid}",
            amount_inr=Decimal("3500.00"),
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


def test_occ_guard_rejects_stale_worker_version(uow: UnitOfWork):
    case_id = _create_case(uow, "occ")
    service = StateTransitionService(uow=uow)

    # Worker 1 transitions DETECTED -> SCHEDULED (version 1 -> 2)
    res1 = service.transition_case(
        case_id=case_id,
        target_state="SCHEDULED",
        expected_version=1
    )
    assert res1.status == TransitionStatus.TRANSITIONED
    assert res1.new_version == 2

    # Stale Worker 2 still thinks version is 1 and attempts to transition to STOPPED
    with pytest.raises(OptimisticLockError) as exc_info:
        service.transition_case(
            case_id=case_id,
            target_state="STOPPED",
            expected_version=1
        )
    assert "Optimistic lock conflict" in str(exc_info.value)


def test_webhook_vs_celery_race_resolution(uow: UnitOfWork):
    case_id = _create_case(uow, "race")
    service = StateTransitionService(uow=uow)

    # 1. Advance case to SCHEDULED (version 1 -> 2)
    res_sched = service.transition_case(case_id=case_id, target_state="SCHEDULED", expected_version=1)
    assert res_sched.new_version == 2

    # 2. Webhook arrives and reconciles case to RECOVERED (version 2 -> 3)
    res_web = service.transition_case(
        case_id=case_id,
        target_state="RECOVERED",
        expected_version=2,
        recovered_amount_inr=Decimal("3500.00")
    )
    assert res_web.new_state == "RECOVERED"
    assert res_web.new_version == 3

    # 3. Scheduled Celery worker with stale version 2 wakes up and tries to advance to IN_PROGRESS
    with pytest.raises(OptimisticLockError):
        service.transition_case(
            case_id=case_id,
            target_state="IN_PROGRESS",
            expected_version=2
        )


def test_monotonic_settlement_cannot_be_overwritten_by_late_failure(uow: UnitOfWork):
    case_id = _create_case(uow, "mono")
    service = StateTransitionService(uow=uow)

    # 1. Transition to RECOVERED
    res = service.transition_case(case_id=case_id, target_state="SCHEDULED", expected_version=1)
    res_rec = service.transition_case(
        case_id=case_id,
        target_state="RECOVERED",
        expected_version=2,
        recovered_amount_inr=Decimal("3500.00")
    )
    assert res_rec.new_state == "RECOVERED"

    # 2. Duplicate settlement event returns ALREADY_APPLIED
    res_dup = service.transition_case(
        case_id=case_id,
        target_state="RECOVERED",
        expected_version=3
    )
    assert res_dup.status == TransitionStatus.ALREADY_APPLIED
    assert res_dup.new_version == 3
