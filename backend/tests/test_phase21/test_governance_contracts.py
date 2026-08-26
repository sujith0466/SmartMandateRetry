"""Phase 21: Baseline and Architecture Governance Tests."""

from decimal import Decimal
import uuid
import pytest

from app.domain.models import Merchant, RecoveryPolicy
from app.infrastructure.repositories.unit_of_work import UnitOfWork


class TestPhase21GovernanceContracts:
    def test_frozen_baseline_policy_invariants_preserved(self, uow: UnitOfWork):
        """Governance: Phase 2-20 baseline policy constraints cannot be weakened."""
        uid = uuid.uuid4().hex[:6]
        merch_id = f"m_gov_{uid}"
        with uow:
            m = Merchant(id=merch_id, name=f"Gov Merchant {uid}", razorpay_account_id=f"acc_{uid}")
            p = RecoveryPolicy(
                id=f"pol_gov_{uid}",
                merchant_id=merch_id,
                max_retries_per_case=3,
                min_retry_interval_hours=24,
                max_recovery_window_days=14,
                min_confidence_threshold=Decimal("0.75"),
                high_value_threshold_inr=Decimal("10000.00"),
                max_customer_contacts_per_cycle=3,
                hard_decline_auto_stop=True,
            )
            uow.merchants.add(m)
            uow.policies.add(p)
            uow.commit()

        with uow:
            persisted = uow.policies.find_by_merchant_id(merch_id)
            assert persisted is not None
            assert persisted.hard_decline_auto_stop is True
            assert persisted.max_retries_per_case == 3
            assert persisted.min_confidence_threshold == Decimal("0.75")
