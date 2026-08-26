"""Phase 21: Policy Simulation Engine Backend Tests."""

import time
import pytest

from app.services.policy_simulation_service import PolicySimulationService


class TestPolicySimulationService:
    def test_policy_simulation_on_test_split(self):
        """Test simulation returns valid metrics and runs in under 100ms."""
        service = PolicySimulationService()
        draft_policy = {
            "max_retries_per_case": 3,
            "min_retry_interval_hours": 24,
            "max_recovery_window_days": 14,
            "min_confidence_threshold": 0.75,
            "high_value_threshold_inr": 10000.00,
            "max_customer_contacts_per_cycle": 3,
            "hard_decline_auto_stop": True,
        }

        result = service.simulate(draft_policy, split="TEST")

        # Invariant 1: Execution latency target < 100ms
        assert result.simulation_duration_ms < 100.0

        # Invariant 2: Correct test scenario counts
        assert result.total_scenarios > 0
        assert result.eligible_scenarios > 0
        assert result.recovered_count > 0

        # Invariant 3: Simulated recovery rate bounded in [0.0, 1.0]
        assert 0.0 <= result.simulated_recovery_rate <= 1.0
        assert 0.0 <= result.revenue_recovery_rate <= 1.0
        assert result.policy_violations == 0

        # Invariant 4: Positive uplift over native baseline
        assert result.recovery_uplift_pp > 0.0

        # Invariant 5: Veto breakdown counts populated
        assert result.veto_count > 0
        assert result.hard_decline_stops > 0

    def test_policy_simulation_deterministic_repeatability(self):
        """Test that repeated simulations with identical config produce identical results."""
        service = PolicySimulationService()
        draft_policy = {
            "max_retries_per_case": 2,
            "min_retry_interval_hours": 12,
            "max_recovery_window_days": 10,
            "min_confidence_threshold": 0.80,
            "high_value_threshold_inr": 5000.00,
            "max_customer_contacts_per_cycle": 2,
            "hard_decline_auto_stop": True,
        }

        run1 = service.simulate(draft_policy, split="TEST")
        run2 = service.simulate(draft_policy, split="TEST")

        assert run1.recovered_count == run2.recovered_count
        assert run1.simulated_recovery_rate == run2.simulated_recovery_rate
        assert run1.veto_count == run2.veto_count
        assert run1.total_revenue_inr == run2.total_revenue_inr
