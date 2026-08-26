"""Tests for Phase 17 Benchmark CLI script."""

import os
import subprocess
import sys
import tempfile
import pytest

from app.evaluation.dataset_manifest import DatasetManifestManager
from app.evaluation.dataset_splitter import DatasetSplitter
from app.evaluation.scenario_generator import ScenarioGenerator
from app.evaluation.seed_manager import SeedManager
from pathlib import Path
_REPO_ROOT = str(Path(__file__).resolve().parents[3])


@pytest.fixture(scope="module")
def sample_dataset_path():
    sm = SeedManager(42)
    gen = ScenarioGenerator(sm)
    scenarios = gen.generate(100, n_customers=20, n_merchants=5)
    splitter = DatasetSplitter(sm)
    scenarios = splitter.split(scenarios)
    manager = DatasetManifestManager()
    manifest = manager.build(42, scenarios)

    with tempfile.NamedTemporaryFile(suffix=".json", delete=False) as f:
        path = f.name

    manager.save(manifest, output_dir=os.path.dirname(path))
    with open(path, "w", encoding="utf-8") as f:
        f.write(manifest.model_dump_json())

    yield path

    if os.path.exists(path):
        os.remove(path)


class TestBenchmarkCLI:
    def test_cli_validate_success(self, sample_dataset_path):
        cmd = [sys.executable, "scripts/run_eval_benchmark.py", "--validate", sample_dataset_path]
        res = subprocess.run(cmd, cwd=_REPO_ROOT, capture_output=True, text=True)
        assert res.returncode == 0
        assert "Validation: PASSED" in res.stdout

    def test_cli_validate_nonexistent_fails(self):
        cmd = [sys.executable, "scripts/run_eval_benchmark.py", "--validate", "nonexistent_file.json"]
        res = subprocess.run(cmd, cwd=_REPO_ROOT, capture_output=True, text=True)
        assert res.returncode == 1

    def test_cli_run_single_mode(self, sample_dataset_path):
        cmd = [
            sys.executable,
            "scripts/run_eval_benchmark.py",
            "--dataset", sample_dataset_path,
            "--split", "TEST",
            "--mode", "SMART_MANDATE",
        ]
        res = subprocess.run(cmd, cwd=_REPO_ROOT, capture_output=True, text=True)
        assert res.returncode == 0
        assert "BENCHMARK RESULTS: SMART_MANDATE" in res.stdout
        assert "Label Accuracy:" in res.stdout

    def test_cli_run_comparative_all_modes(self, sample_dataset_path):
        cmd = [
            sys.executable,
            "scripts/run_eval_benchmark.py",
            "--dataset", sample_dataset_path,
            "--split", "TEST",
            "--compare",
        ]
        res = subprocess.run(cmd, cwd=_REPO_ROOT, capture_output=True, text=True)
        assert res.returncode == 0
        assert "COMPARATIVE BENCHMARK SUMMARY" in res.stdout
        assert "SMART_MANDATE" in res.stdout
        assert "RAZORPAY_NATIVE" in res.stdout

    def test_cli_invalid_mode_fails(self, sample_dataset_path):
        cmd = [
            sys.executable,
            "scripts/run_eval_benchmark.py",
            "--dataset", sample_dataset_path,
            "--mode", "UNSUPPORTED_MODE",
        ]
        res = subprocess.run(cmd, cwd=_REPO_ROOT, capture_output=True, text=True)
        assert res.returncode == 1
        assert "ERROR: Invalid evaluation mode" in res.stderr

    def test_cli_save_reports_to_output_dir(self, sample_dataset_path):
        with tempfile.TemporaryDirectory() as tmpdir:
            cmd = [
                sys.executable,
                "scripts/run_eval_benchmark.py",
                "--dataset", sample_dataset_path,
                "--split", "TEST",
                "--mode", "SMART_MANDATE",
                "--output", tmpdir,
            ]
            res = subprocess.run(cmd, cwd=_REPO_ROOT, capture_output=True, text=True)
            assert res.returncode == 0
            assert os.path.exists(os.path.join(tmpdir, f"benchmark_report_SMART_MANDATE_TEST_42.json"))
            assert os.path.exists(os.path.join(tmpdir, f"benchmark_report_SMART_MANDATE_TEST_42.md"))
