"""Optimistic Concurrency Control (OCC) and race condition tests."""

from decimal import Decimal
import pytest
from app.core.errors import OptimisticLockError
from app.domain.models import Customer, Merchant, RecoveryCase, Subscription
from app.infrastructure.repositories.unit_of_work import UnitOfWork


def test_recovery_case_optimistic_locking_success(uow: UnitOfWork):
    with uow:
        m = Merchant(id="m_occ_1", name="OCC Merchant", razorpay_account_id="acc_occ_01")
        c = Customer(id="c_occ_1", merchant_id=m.id, razorpay_customer_id="rzp_c_occ_1")
        s = Subscription(
            id="s_occ_1",
            merchant_id=m.id,
            customer_id=c.id,
            razorpay_subscription_id="sub_occ_01",
            status="halted",
            plan_id="p1",
        )
        case = RecoveryCase(
            id="case_occ_1",
            merchant_id=m.id,
            subscription_id=s.id,
            invoice_id="inv_occ_01",
            amount_inr=Decimal("5000.00"),
            stage="HALTED_RECOVERY",
            state="DETECTED",
            version=1,
        )
        uow.merchants.add(m)
        uow.customers.add(c)
        uow.subscriptions.add(s)
        uow.cases.add(case)
        uow.flush()

        # Perform valid state transition from version 1 -> 2
        updated = uow.cases.atomic_state_transition(
            case_id=case.id,
            expected_version=1,
            new_state="ANALYZING"
        )
        assert updated.state == "ANALYZING"
        assert updated.version == 2


def test_recovery_case_optimistic_locking_conflict(uow: UnitOfWork):
    with uow:
        m = Merchant(id="m_occ_2", name="OCC Merchant 2", razorpay_account_id="acc_occ_02")
        c = Customer(id="c_occ_2", merchant_id=m.id, razorpay_customer_id="rzp_c_occ_2")
        s = Subscription(
            id="s_occ_2",
            merchant_id=m.id,
            customer_id=c.id,
            razorpay_subscription_id="sub_occ_02",
            status="halted",
            plan_id="p2",
        )
        case = RecoveryCase(
            id="case_occ_2",
            merchant_id=m.id,
            subscription_id=s.id,
            invoice_id="inv_occ_02",
            amount_inr=Decimal("7500.00"),
            stage="HALTED_RECOVERY",
            state="DETECTED",
            version=1,
        )
        uow.merchants.add(m)
        uow.customers.add(c)
        uow.subscriptions.add(s)
        uow.cases.add(case)
        uow.flush()

        # First worker advances version 1 -> 2
        uow.cases.atomic_state_transition(
            case_id=case.id,
            expected_version=1,
            new_state="ANALYZING"
        )

        # Second worker attempting transition with stale version 1 must raise OptimisticLockError
        with pytest.raises(OptimisticLockError):
            uow.cases.atomic_state_transition(
                case_id=case.id,
                expected_version=1,
                new_state="ACTION_PENDING"
            )
