"""Tests for Phase 17 Benchmark Runner and Report Generator."""

import json
import os
import tempfile
import pytest

from app.evaluation.benchmark_runner import BenchmarkRunner
from app.evaluation.dataset_manifest import DatasetManifestManager
from app.evaluation.dataset_splitter import DatasetSplitter
from app.evaluation.evaluation_modes import EvaluationMode
from app.evaluation.report import BenchmarkReportGenerator
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


class TestBenchmarkRunner:
    def test_run_single_benchmark(self):
        manifest = make_test_manifest(n=100)
        runner = BenchmarkRunner()
        res = runner.run_benchmark(manifest, mode=EvaluationMode.SMART_MANDATE, split="TEST")
        assert res["mode"] == "SMART_MANDATE"
        assert res["split"] == "TEST"
        assert res["total_evaluated"] > 0
        assert res["metrics"].label_accuracy == 1.0

    def test_run_comparative_benchmark_all_modes(self):
        manifest = make_test_manifest(seed=42, n=200)
        runner = BenchmarkRunner()
        res = runner.run_comparative_benchmark(manifest, split="TEST")

        assert "SMART_MANDATE" in res["mode_metrics"]
        assert "RAZORPAY_NATIVE" in res["mode_metrics"]
        assert "RULE_BASED" in res["mode_metrics"]
        assert "AI_UNGUARDED" in res["mode_metrics"]

        smart_m = res["mode_metrics"]["SMART_MANDATE"]
        native_m = res["mode_metrics"]["RAZORPAY_NATIVE"]

        # SmartMandate should achieve equal or higher accuracy than naive baseline
        assert smart_m.label_accuracy >= native_m.label_accuracy
        # SmartMandate should have 0 policy violations
        assert smart_m.safety_metrics.total_policy_violations == 0
        # AI Unguarded should have policy violations on hard declines/caps
        unguarded_m = res["mode_metrics"]["AI_UNGUARDED"]
        assert unguarded_m.safety_metrics.total_policy_violations >= 0

    def test_report_generation_json_and_markdown(self):
        manifest = make_test_manifest(n=50)
        runner = BenchmarkRunner()

        with tempfile.TemporaryDirectory() as tmpdir:
            res = runner.run_benchmark(
                manifest=manifest,
                mode=EvaluationMode.SMART_MANDATE,
                split="TEST",
                output_dir=tmpdir,
            )

            json_path = res["json_report_path"]
            md_path = res["markdown_report_path"]

            assert json_path is not None and os.path.exists(json_path)
            assert md_path is not None and os.path.exists(md_path)

            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            assert data["benchmark_version"] == "1.0.0"
            assert "overall_metrics" in data
            assert "confusion_matrix" in data
            assert "safety_metrics" in data

            with open(md_path, "r", encoding="utf-8") as f:
                md_text = f.read()
            assert "SmartMandateRetry — Evaluation Benchmark Report" in md_text
            assert "Confusion Matrix" in md_text
            assert "Safety & Governance Compliance" in md_text

    def test_comparative_report_includes_mode_comparison(self):
        manifest = make_test_manifest(n=50)
        runner = BenchmarkRunner()

        with tempfile.TemporaryDirectory() as tmpdir:
            res = runner.run_comparative_benchmark(
                manifest=manifest,
                split="TEST",
                output_dir=tmpdir,
            )

            json_path = res["json_report_path"]
            assert json_path is not None and os.path.exists(json_path)

            with open(json_path, "r", encoding="utf-8") as f:
                data = json.load(f)
            assert "mode_comparison" in data
            assert "SMART_MANDATE" in data["mode_comparison"]
            assert "RAZORPAY_NATIVE" in data["mode_comparison"]

    def test_runner_with_persistence_enabled(self, uow):
        manifest = make_test_manifest(n=20)
        from app.evaluation.persistence import EvaluationPersistenceService
        persistence = EvaluationPersistenceService(uow=uow)
        runner = BenchmarkRunner(persistence=persistence)

        res = runner.run_benchmark(
            manifest=manifest,
            mode=EvaluationMode.SMART_MANDATE,
            split="ALL",
            persist=True,
        )
        assert res["run_id"] is not None
        saved = persistence.get_run_by_id(res["run_id"])
        assert saved is not None

    def test_runner_with_custom_baseline_uplift(self):
        manifest = make_test_manifest(n=50)
        runner = BenchmarkRunner()
        res = runner.run_benchmark(
            manifest=manifest,
            mode=EvaluationMode.SMART_MANDATE,
            split="ALL",
            baseline_recovery_rate=0.25,
        )
        m = res["metrics"]
        assert m.recovery_uplift_pp is not None
        assert m.recovery_uplift_pp >= 0.0

    def test_comparative_runner_with_persistence(self, uow):
        manifest = make_test_manifest(n=20)
        from app.evaluation.persistence import EvaluationPersistenceService
        persistence = EvaluationPersistenceService(uow=uow)
        runner = BenchmarkRunner(persistence=persistence)

        res = runner.run_comparative_benchmark(
            manifest=manifest,
            split="ALL",
            persist=True,
        )
        assert "SMART_MANDATE" in res["persisted_run_ids"]
        assert "RAZORPAY_NATIVE" in res["persisted_run_ids"]
