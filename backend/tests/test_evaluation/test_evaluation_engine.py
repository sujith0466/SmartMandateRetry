"""Tests for Phase 17 Evaluation Engine."""

import pytest
import time

from app.evaluation.dataset_manifest import DatasetManifestManager
from app.evaluation.dataset_splitter import DatasetSplitter
from app.evaluation.evaluation_engine import EvaluationEngine
from app.evaluation.evaluation_modes import EvaluationMode
from app.evaluation.scenario_generator import ScenarioGenerator
from app.evaluation.seed_manager import SeedManager


def make_test_manifest(seed=42, n=100):
    sm = SeedManager(seed)
    gen = ScenarioGenerator(sm)
    scenarios = gen.generate(n, n_customers=20, n_merchants=5)
    splitter = DatasetSplitter(sm)
    scenarios = splitter.split(scenarios)
    manager = DatasetManifestManager()
    return manager.build(seed, scenarios)


class TestEvaluationEngine:
    def test_evaluate_manifest_test_split_by_default(self):
        manifest = make_test_manifest(n=100)
        engine = EvaluationEngine()
        metrics, results = engine.evaluate_manifest(manifest, mode=EvaluationMode.SMART_MANDATE)
        # Should evaluate only the TEST split scenarios
        test_count = sum(1 for s in manifest.scenarios if s.dataset_split == "TEST")
        assert metrics.total_evaluated == test_count
        assert len(results) == test_count
        for r in results:
            assert r.scenario.dataset_split == "TEST"

    def test_evaluate_manifest_train_and_val_splits(self):
        manifest = make_test_manifest(n=100)
        engine = EvaluationEngine()

        train_m, train_res = engine.evaluate_manifest(manifest, mode=EvaluationMode.SMART_MANDATE, split="TRAIN")
        train_count = sum(1 for s in manifest.scenarios if s.dataset_split == "TRAIN")
        assert train_m.total_evaluated == train_count
        assert len(train_res) == train_count

        val_m, val_res = engine.evaluate_manifest(manifest, mode=EvaluationMode.SMART_MANDATE, split="VALIDATION")
        val_count = sum(1 for s in manifest.scenarios if s.dataset_split == "VALIDATION")
        assert val_m.total_evaluated == val_count
        assert len(val_res) == val_count

    def test_evaluate_manifest_all_split(self):
        manifest = make_test_manifest(n=100)
        engine = EvaluationEngine()
        all_m, all_res = engine.evaluate_manifest(manifest, mode=EvaluationMode.SMART_MANDATE, split="ALL")
        assert all_m.total_evaluated == 100
        assert len(all_res) == 100

    def test_invalid_split_raises(self):
        manifest = make_test_manifest(n=50)
        engine = EvaluationEngine()
        with pytest.raises(ValueError, match="Invalid dataset split"):
            engine.evaluate_manifest(manifest, mode=EvaluationMode.SMART_MANDATE, split="INVALID_SPLIT")

    def test_smart_mandate_100pct_accuracy_on_ground_truth(self):
        manifest = make_test_manifest(seed=42, n=200)
        engine = EvaluationEngine()
        metrics, results = engine.evaluate_manifest(manifest, mode=EvaluationMode.SMART_MANDATE, split="ALL")
        # SmartMandate should achieve 100% label accuracy against certified ground truth
        assert metrics.label_accuracy == 1.0
        assert metrics.policy_outcome_accuracy == 1.0
        assert metrics.final_action_accuracy == 1.0
        assert metrics.case_outcome_accuracy == 1.0
        assert metrics.safety_metrics.total_policy_violations == 0

    def test_razorpay_native_has_lower_recovery_and_safety_violations(self):
        manifest = make_test_manifest(seed=42, n=500)
        engine = EvaluationEngine()
        metrics, results = engine.evaluate_manifest(manifest, mode=EvaluationMode.RAZORPAY_NATIVE, split="ALL")
        # Razorpay native should have lower accuracy and safety violations on hard declines
        assert metrics.label_accuracy < 1.0
        assert metrics.safety_metrics.total_policy_violations > 0

    def test_determinism_same_manifest_same_metrics(self):
        manifest = make_test_manifest(seed=42, n=100)
        engine = EvaluationEngine()
        m1, _ = engine.evaluate_manifest(manifest, mode=EvaluationMode.SMART_MANDATE, split="TEST")
        m2, _ = engine.evaluate_manifest(manifest, mode=EvaluationMode.SMART_MANDATE, split="TEST")
        assert m1.label_accuracy == m2.label_accuracy
        assert m1.confusion_matrix == m2.confusion_matrix
        assert m1.simulated_recovered_revenue_inr == m2.simulated_recovered_revenue_inr

    def test_performance_5000_scenarios_under_5_seconds(self):
        manifest = make_test_manifest(seed=42, n=5000)
        engine = EvaluationEngine()
        t0 = time.monotonic()
        metrics, results = engine.evaluate_manifest(manifest, mode=EvaluationMode.SMART_MANDATE, split="ALL")
        elapsed = time.monotonic() - t0
        assert metrics.total_evaluated == 5000
        assert elapsed < 5.0, f"Evaluation took {elapsed:.2f}s, expected < 5s"

    def test_execution_timing_recorded(self):
        manifest = make_test_manifest(seed=42, n=10)
        engine = EvaluationEngine()
        _, results = engine.evaluate_manifest(manifest, mode=EvaluationMode.SMART_MANDATE, split="ALL")
        for r in results:
            assert r.prediction.execution_time_ms >= 0.0

    def test_edge_scenarios_evaluated_accurately(self):
        manifest = make_test_manifest(seed=42, n=200)
        edge_scenarios = [s for s in manifest.scenarios if s.difficulty_tier == "EDGE"]
        assert len(edge_scenarios) > 0
        edge_manifest = manifest.model_copy(update={"scenarios": edge_scenarios, "total_scenarios": len(edge_scenarios)})
        engine = EvaluationEngine()
        metrics, _ = engine.evaluate_manifest(edge_manifest, mode=EvaluationMode.SMART_MANDATE, split="ALL")
        assert metrics.label_accuracy == 1.0

    def test_rule_based_mode_evaluation_behavior(self):
        manifest = make_test_manifest(seed=42, n=100)
        engine = EvaluationEngine()
        metrics, results = engine.evaluate_manifest(manifest, mode=EvaluationMode.RULE_BASED, split="ALL")
        assert metrics.total_evaluated == 100
        # Rule based should have valid accuracy and zero policy violations on hard declines
        assert metrics.safety_metrics.hard_decline_safety_rate == 1.0

    def test_ai_unguarded_mode_evaluation_behavior(self):
        manifest = make_test_manifest(seed=42, n=100)
        engine = EvaluationEngine()
        metrics, results = engine.evaluate_manifest(manifest, mode=EvaluationMode.AI_UNGUARDED, split="ALL")
        assert metrics.total_evaluated == 100
        # AI Unguarded dispatches raw recommendations without policy safety gates
        assert metrics.safety_metrics is not None
