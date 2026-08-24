"""Seed data factory verification tests."""

from app.infrastructure.repositories.unit_of_work import UnitOfWork
from app.infrastructure.seed import seed_database


def test_seed_database_execution(uow: UnitOfWork):
    # Execute seed script
    seed_database(uow)

    with uow:
        merchant = uow.merchants.find_by_razorpay_account("acc_rzp_demo_merchant_001")
        assert merchant is not None
        assert merchant.name == "SaaS Metrics Cloud Pvt Ltd"

        policy = uow.policies.find_by_merchant_id(merchant.id)
        assert policy is not None
        assert policy.max_retries_per_case == 3

        cases = uow.cases.find_by_merchant_and_state(merchant.id)
        assert len(cases) >= 2
