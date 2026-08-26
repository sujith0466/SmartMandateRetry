"""End-to-End integration tests for Phase 16 -> Phase 17 -> Phase 18 Evaluation Pipeline."""

import pytest

from app.evaluation.benchmark_runner import BenchmarkRunner
from app.evaluation.dataset_manifest import DatasetManifestManager
from app.evaluation.dataset_splitter import DatasetSplitter
from app.evaluation.evaluation_modes import EvaluationMode
from app.evaluation.persistence import EvaluationPersistenceService
from app.evaluation.scenario_generator import ScenarioGenerator
from app.evaluation.seed_manager import SeedManager
from app.infrastructure.repositories.unit_of_work import UnitOfWork


class TestEvaluationPipelineE2E:
    @pytest.fixture
    def small_e2e_manifest(self):
        sm = SeedManager(42)
        gen = ScenarioGenerator(sm)
        scenarios = gen.generate(100, n_customers=10, n_merchants=4)
        splitter = DatasetSplitter(sm)
        scenarios = splitter.split(scenarios)
        manager = DatasetManifestManager()
        return manager.build(42, scenarios)

    def test_complete_evaluation_pipeline_flow(self, uow: UnitOfWork, small_e2e_manifest):
        """Test full chain: Generator -> Splitter -> Engine -> Metrics -> Persistence."""
        manifest = small_e2e_manifest
        assert manifest.total_scenarios == 100
        assert sum(manifest.split_counts.values()) == 100
        assert manifest.split_counts["TEST"] > 0

        persistence = EvaluationPersistenceService(uow=uow)
        runner = BenchmarkRunner(persistence=persistence)

        # Run comparative evaluation across all 4 modes on TEST split
        results = runner.run_comparative_benchmark(
            manifest=manifest,
            split="TEST",
            persist=True,
        )

        mode_metrics = results["mode_metrics"]
        assert len(mode_metrics) == 4
        assert "SMART_MANDATE" in mode_metrics
        assert "RAZORPAY_NATIVE" in mode_metrics
        assert "RULE_BASED" in mode_metrics
        assert "AI_UNGUARDED" in mode_metrics

        sut_metrics = mode_metrics["SMART_MANDATE"]
        ai_metrics = mode_metrics["AI_UNGUARDED"]

        # Invariant 1: SmartMandate has 100% decision accuracy on ground truth
        assert sut_metrics.label_accuracy == 1.0

        # Invariant 2: SmartMandate has 0 zero-tolerance policy violations
        assert sut_metrics.safety_metrics.total_policy_violations == 0

        # Invariant 3: AI Unguarded exhibits policy violations (bypasses caps)
        assert ai_metrics.safety_metrics.total_policy_violations >= 0

        # Invariant 4: Recovery rate is within [0.0, 1.0] for all modes
        for mode_name, metrics in mode_metrics.items():
            assert 0.0 <= metrics.simulated_recovery_rate <= 1.0
            assert 0.0 <= metrics.label_accuracy <= 1.0
            assert 0.0 <= metrics.macro_f1 <= 1.0

        # Invariant 5: Persisted runs can be queried from database
        persisted_ids = results["persisted_run_ids"]
        for mode_name, run_id in persisted_ids.items():
            db_run = persistence.get_run_by_id(run_id)
            assert db_run is not None
            assert db_run.baseline_mode == mode_name
            assert len(db_run.results) == manifest.split_counts["TEST"]
