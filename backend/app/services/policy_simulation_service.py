"""Policy Simulation Service for Phase 21 What-If Analysis.

Evaluates draft merchant recovery policies against certified synthetic datasets
without mutating database state, production policies, or executing real transactions.
"""

from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
import os
import time
from typing import Any, Dict, List, Optional

from app.core.logging import get_logger
from app.evaluation.dataset_manifest import DatasetManifestManager
from app.evaluation.scenario_schema import DatasetManifest, SyntheticScenario

logger = get_logger("smartmandate.policy_simulation")


@dataclass(frozen=True)
class PolicySimulationResult:
    """Immutable result of a policy what-if simulation run."""
    dataset_name: str
    split: str
    total_scenarios: int
    eligible_scenarios: int
    recovered_count: int
    simulated_recovery_rate: float
    baseline_recovery_rate: float
    recovery_uplift_pp: float
    total_revenue_inr: float
    recovered_revenue_inr: float
    revenue_recovery_rate: float
    veto_count: int
    hard_decline_stops: int
    retry_cap_vetoes: int
    high_value_escalations: int
    confidence_vetoes: int
    contact_cap_vetoes: int
    window_expiry_vetoes: int
    policy_violations: int
    simulation_duration_ms: float
    policy_config: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        return {
            "dataset_name": self.dataset_name,
            "split": self.split,
            "total_scenarios": self.total_scenarios,
            "eligible_scenarios": self.eligible_scenarios,
            "recovered_count": self.recovered_count,
            "simulated_recovery_rate": round(self.simulated_recovery_rate, 4),
            "baseline_recovery_rate": round(self.baseline_recovery_rate, 4),
            "recovery_uplift_pp": round(self.recovery_uplift_pp, 4),
            "total_revenue_inr": round(self.total_revenue_inr, 2),
            "recovered_revenue_inr": round(self.recovered_revenue_inr, 2),
            "revenue_recovery_rate": round(self.revenue_recovery_rate, 4),
            "veto_count": self.veto_count,
            "veto_breakdown": {
                "hard_decline_stops": self.hard_decline_stops,
                "retry_cap_vetoes": self.retry_cap_vetoes,
                "high_value_escalations": self.high_value_escalations,
                "confidence_vetoes": self.confidence_vetoes,
                "contact_cap_vetoes": self.contact_cap_vetoes,
                "window_expiry_vetoes": self.window_expiry_vetoes,
            },
            "policy_violations": self.policy_violations,
            "simulation_duration_ms": round(self.simulation_duration_ms, 2),
            "policy_config": self.policy_config,
        }


class PolicySimulationService:
    """Executes fast, deterministic what-if simulations for draft policy configurations."""

    DEFAULT_DATASET_PATH = "datasets/eval_dataset_42_5000.json"
    NATIVE_BASELINE_RECOVERY_RATE = 0.29214463840399004  # 29.21%

    def __init__(self, manifest_manager: Optional[DatasetManifestManager] = None) -> None:
        self.manifest_manager = manifest_manager or DatasetManifestManager()
        self._cached_manifest: Optional[DatasetManifest] = None

    def _get_manifest(self, dataset_path: Optional[str] = None) -> DatasetManifest:
        path = dataset_path or self.DEFAULT_DATASET_PATH
        if self._cached_manifest is None or dataset_path:
            if os.path.exists(path):
                manifest = self.manifest_manager.load_manifest(path)
            else:
                from app.evaluation.scenario_generator import ScenarioGenerator
                from app.evaluation.dataset_splitter import DatasetSplitter
                from app.evaluation.seed_manager import SeedManager
                sm = SeedManager(42)
                gen = ScenarioGenerator(sm)
                scenarios = gen.generate(5000, n_customers=250, n_merchants=50)
                splitter = DatasetSplitter(sm)
                scenarios = splitter.split(scenarios)
                manifest = self.manifest_manager.build(42, scenarios)
            if not dataset_path:
                self._cached_manifest = manifest
            return manifest
        return self._cached_manifest

    def simulate(
        self,
        policy_config: Dict[str, Any],
        split: str = "TEST",
        dataset_path: Optional[str] = None,
    ) -> PolicySimulationResult:
        """Simulate draft policy against selected dataset split without DB persistence."""
        manifest = self._get_manifest(dataset_path)

        start_time = time.perf_counter()

        max_retries = int(policy_config.get("max_retries_per_case", 3))
        min_interval = int(policy_config.get("min_retry_interval_hours", 24))
        max_window_days = int(policy_config.get("max_recovery_window_days", 14))
        min_confidence = float(policy_config.get("min_confidence_threshold", 0.75))
        high_val = float(policy_config.get("high_value_threshold_inr", 10000.00))
        max_contacts = int(policy_config.get("max_customer_contacts_per_cycle", 3))
        hard_decline_auto_stop = bool(policy_config.get("hard_decline_auto_stop", True))

        split_upper = split.upper()
        if split_upper == "ALL":
            scenarios = manifest.scenarios
        else:
            scenarios = [s for s in manifest.scenarios if s.dataset_split == split_upper]

        total_scenarios = len(scenarios)
        if total_scenarios == 0:
            raise ValueError(f"No scenarios found for split '{split}'")

        eligible_count = 0
        recovered_count = 0
        total_revenue = Decimal("0.00")
        recovered_revenue = Decimal("0.00")
        veto_count = 0
        hard_decline_stops = 0
        retry_cap_vetoes = 0
        high_val_escalations = 0
        confidence_vetoes = 0
        contact_cap_vetoes = 0
        window_expiry_vetoes = 0
        policy_violations = 0

        for s in scenarios:
            amount = s.recovery_case.amount_inr
            total_revenue += amount
            is_recoverable = s.expected_case_outcome == "RECOVERED"

            if is_recoverable:
                eligible_count += 1

            case = s.recovery_case
            ai = s.ai_decision
            is_hard = s.is_hard_decline

            # P0: Hard decline veto
            if is_hard and hard_decline_auto_stop:
                veto_count += 1
                hard_decline_stops += 1
                continue

            # P1: Retry cap
            if case.attempt_count >= max_retries:
                veto_count += 1
                retry_cap_vetoes += 1
                continue

            # P2a: Recovery window
            case_age_days = case.case_age_hours / 24.0
            if case_age_days > max_window_days:
                veto_count += 1
                window_expiry_vetoes += 1
                continue

            # P2b: High value threshold
            if float(amount) >= high_val:
                veto_count += 1
                high_val_escalations += 1
                if is_recoverable:
                    recovered_count += 1
                    recovered_revenue += amount
                continue

            # P3a: Low AI confidence
            if float(ai.ai_confidence) < min_confidence:
                veto_count += 1
                confidence_vetoes += 1
                continue

            # P3b: Contact cap
            if case.contacts_count >= max_contacts:
                veto_count += 1
                contact_cap_vetoes += 1
                continue

            # Authorized automated recovery action
            if is_recoverable:
                recovered_count += 1
                recovered_revenue += amount

        duration_ms = (time.perf_counter() - start_time) * 1000.0

        rec_rate = (recovered_count / eligible_count) if eligible_count > 0 else 0.0
        rev_rate = float(recovered_revenue / total_revenue) if total_revenue > Decimal("0.00") else 0.0
        uplift_pp = (rec_rate - self.NATIVE_BASELINE_RECOVERY_RATE) * 100.0

        return PolicySimulationResult(
            dataset_name=f"eval_dataset_{manifest.generation_seed}_{manifest.total_scenarios}",
            split=split_upper,
            total_scenarios=total_scenarios,
            eligible_scenarios=eligible_count,
            recovered_count=recovered_count,
            simulated_recovery_rate=rec_rate,
            baseline_recovery_rate=self.NATIVE_BASELINE_RECOVERY_RATE,
            recovery_uplift_pp=uplift_pp,
            total_revenue_inr=float(total_revenue),
            recovered_revenue_inr=float(recovered_revenue),
            revenue_recovery_rate=rev_rate,
            veto_count=veto_count,
            hard_decline_stops=hard_decline_stops,
            retry_cap_vetoes=retry_cap_vetoes,
            high_value_escalations=high_val_escalations,
            confidence_vetoes=confidence_vetoes,
            contact_cap_vetoes=contact_cap_vetoes,
            window_expiry_vetoes=window_expiry_vetoes,
            policy_violations=policy_violations,
            simulation_duration_ms=duration_ms,
            policy_config={
                "max_retries_per_case": max_retries,
                "min_retry_interval_hours": min_interval,
                "max_recovery_window_days": max_window_days,
                "min_confidence_threshold": min_confidence,
                "high_value_threshold_inr": high_val,
                "max_customer_contacts_per_cycle": max_contacts,
                "hard_decline_auto_stop": hard_decline_auto_stop,
            },
        )
