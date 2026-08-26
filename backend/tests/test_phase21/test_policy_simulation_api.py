"""Phase 21: Policy Simulation API Integration Tests."""

from decimal import Decimal
import uuid
import pytest
from flask.testing import FlaskClient

from app.domain.models import Merchant, RecoveryPolicy
from app.infrastructure.repositories.unit_of_work import UnitOfWork


@pytest.fixture
def sim_merchant(uow: UnitOfWork) -> str:
    uid = uuid.uuid4().hex[:6]
    merch_id = f"m_sim_{uid}"
    with uow:
        m = Merchant(id=merch_id, name=f"Sim Merchant {uid}", razorpay_account_id=f"acc_sim_{uid}")
        p = RecoveryPolicy(
            id=f"pol_sim_{uid}",
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
    return merch_id


class TestPolicySimulationAPI:
    def test_simulate_policy_success(self, client: FlaskClient, sim_merchant: str, uow: UnitOfWork):
        """Test successful simulation call and verify DB policy remains unmodified."""
        draft_payload = {
            "max_retries_per_case": 4,
            "min_retry_interval_hours": 12,
            "max_recovery_window_days": 20,
            "min_confidence_threshold": 0.70,
            "high_value_threshold_inr": 15000.00,
            "max_customer_contacts_per_cycle": 2,
            "hard_decline_auto_stop": True,
        }

        resp = client.post(
            "/api/v1/policies/simulate?split=TEST",
            json=draft_payload,
            headers={"X-Merchant-ID": sim_merchant},
        )
        assert resp.status_code == 200
        data = resp.get_json()

        assert "simulated_recovery_rate" in data
        assert "recovery_uplift_pp" in data
        assert "recovered_revenue_inr" in data
        assert "veto_count" in data
        assert "simulation_duration_ms" in data
        assert data["total_scenarios"] > 0

        # Verify DB policy was NOT mutated
        with uow:
            db_pol = uow.policies.find_by_merchant_id(sim_merchant)
            assert db_pol.max_retries_per_case == 3  # Unchanged
            assert db_pol.max_recovery_window_days == 14  # Unchanged

    def test_simulate_policy_unauthenticated_rejected(self, client: FlaskClient):
        """Test that requests without X-Merchant-ID return 401."""
        resp = client.post("/api/v1/policies/simulate", json={})
        assert resp.status_code == 401

    def test_simulate_policy_malformed_rejected(self, client: FlaskClient, sim_merchant: str):
        """Test that non-json payload returns 400."""
        resp = client.post(
            "/api/v1/policies/simulate",
            data="not a json",
            headers={"X-Merchant-ID": sim_merchant, "Content-Type": "application/json"},
        )
        assert resp.status_code == 400
