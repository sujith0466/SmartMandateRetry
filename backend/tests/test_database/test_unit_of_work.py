"""UnitOfWork transaction lifecycle and rollback tests."""

import pytest
from app.domain.models import Merchant
from app.infrastructure.repositories.unit_of_work import UnitOfWork


def test_unit_of_work_rollback_on_exception(uow: UnitOfWork):
    # Demonstrate that an exception inside the with block safely rolls back uncommitted changes
    try:
        with uow:
            m = Merchant(id="m_uow_fail", name="Failed Merchant", razorpay_account_id="acc_uow_fail")
            uow.merchants.add(m)
            uow.flush()
            raise RuntimeError("Simulated mid-transaction failure")
    except RuntimeError:
        pass

    # New transaction must not see the entity
    with uow:
        found = uow.merchants.get_by_id("m_uow_fail")
        assert found is None
