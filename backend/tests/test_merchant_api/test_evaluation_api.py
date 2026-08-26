"""Integration tests for Phase 18 Evaluation Lab REST API endpoints."""

import json
import pytest
from flask.testing import FlaskClient

from app.domain.models import Merchant
from app.evaluation.dataset_manifest import DatasetManifestManager
from app.evaluation.dataset_splitter import DatasetSplitter
from app.evaluation.evaluation_engine import EvaluationEngine
from app.evaluation.evaluation_modes import EvaluationMode
from app.evaluation.persistence import EvaluationPersistenceService
from app.evaluation.scenario_generator import ScenarioGenerator
from app.evaluation.seed_manager import SeedManager
from app.infrastructure.repositories.unit_of_work import UnitOfWork


@pytest.fixture
def eval_merchant(uow: UnitOfWork) -> str:
    merch_id = "m_eval_test_01"
    with uow:
        existing = uow.merchants.get_by_id(merch_id)
        if not existing:
            m = Merchant(id=merch_id, name="Evaluation Merchant", razorpay_account_id="acc_eval_01")
            uow.merchants.add(m)
            uow.commit()
    return merch_id


@pytest.fixture
def sample_persisted_run(uow: UnitOfWork) -> str:
    sm = SeedManager(42)
    gen = ScenarioGenerator(sm)
    scenarios = gen.generate(20, n_customers=5, n_merchants=2)
    splitter = DatasetSplitter(sm)
    scenarios = splitter.split(scenarios)
    manager = DatasetManifestManager()
    manifest = manager.build(42, scenarios)

    engine = EvaluationEngine()
    metrics, results = engine.evaluate_manifest(manifest, mode=EvaluationMode.SMART_MANDATE, split="ALL")

    persistence = EvaluationPersistenceService(uow=uow)
    run = persistence.persist_run(
        manifest=manifest,
        mode=EvaluationMode.SMART_MANDATE,
        split="ALL",
        metrics=metrics,
        scenario_results=results,
    )
    return run.id


class TestEvaluationAPI:
    def test_evaluation_summary(self, client: FlaskClient, eval_merchant: str):
        res = client.get("/api/v1/evaluation/summary", headers={"X-Merchant-ID": eval_merchant})
        assert res.status_code == 200
        data = res.get_json()
        assert "dataset" in data
        assert data["dataset"]["total_scenarios"] >= 20
        assert "splits" in data["dataset"]
        assert "total_runs" in data

    def test_evaluation_runs_list(self, client: FlaskClient, eval_merchant: str, sample_persisted_run: str):
        res = client.get("/api/v1/evaluation/runs?page=1&limit=10", headers={"X-Merchant-ID": eval_merchant})
        assert res.status_code == 200
        data = res.get_json()
        assert "data" in data
        assert "pagination" in data
        assert len(data["data"]) >= 1
        assert any(r["id"] == sample_persisted_run for r in data["data"])

    def test_evaluation_run_detail(self, client: FlaskClient, eval_merchant: str, sample_persisted_run: str):
        res = client.get(f"/api/v1/evaluation/runs/{sample_persisted_run}", headers={"X-Merchant-ID": eval_merchant})
        assert res.status_code == 200
        data = res.get_json()
        assert data["id"] == sample_persisted_run
        assert data["baseline_mode"] == "SMART_MANDATE"
        assert "metrics_summary" in data
        assert data["metrics_summary"]["label_accuracy"] == 1.0

    def test_evaluation_run_detail_not_found(self, client: FlaskClient, eval_merchant: str):
        res = client.get("/api/v1/evaluation/runs/nonexistent_run_id", headers={"X-Merchant-ID": eval_merchant})
        assert res.status_code == 404
        data = res.get_json()
        assert data["error"]["code"] == "NOT_FOUND"

    def test_scenario_results_list_and_filtering(self, client: FlaskClient, eval_merchant: str, sample_persisted_run: str):
        res = client.get(f"/api/v1/evaluation/runs/{sample_persisted_run}/results?page=1&limit=5", headers={"X-Merchant-ID": eval_merchant})
        assert res.status_code == 200
        data = res.get_json()
        assert len(data["data"]) <= 5
        assert "pagination" in data

        first = data["data"][0]
        assert "scenario_id" in first
        assert "actual_outcome" in first
        assert "simulated_outcome" in first
        assert "details" in first

        # Filter by correctness
        res_corr = client.get(f"/api/v1/evaluation/runs/{sample_persisted_run}/results?is_correct=true", headers={"X-Merchant-ID": eval_merchant})
        assert res_corr.status_code == 200
        for r in res_corr.get_json()["data"]:
            assert r["details"]["is_label_correct"] is True

    def test_execute_benchmark_single_mode(self, client: FlaskClient, eval_merchant: str):
        payload = {
            "split": "TEST",
            "mode": "SMART_MANDATE",
            "persist": False,
        }
        res = client.post(
            "/api/v1/evaluation/benchmark",
            data=json.dumps(payload),
            content_type="application/json",
            headers={"X-Merchant-ID": eval_merchant},
        )
        assert res.status_code == 200
        data = res.get_json()
        assert data["mode"] == "SMART_MANDATE"
        assert data["split"] == "TEST"
        assert data["metrics"]["label_accuracy"] == 1.0
        assert data["metrics"]["safety_metrics"]["total_policy_violations"] == 0

    def test_execute_benchmark_comparative(self, client: FlaskClient, eval_merchant: str):
        payload = {
            "split": "TEST",
            "compare": True,
            "persist": False,
        }
        res = client.post(
            "/api/v1/evaluation/benchmark",
            data=json.dumps(payload),
            content_type="application/json",
            headers={"X-Merchant-ID": eval_merchant},
        )
        assert res.status_code == 200
        data = res.get_json()
        assert "mode_metrics" in data
        assert "SMART_MANDATE" in data["mode_metrics"]
        assert "RAZORPAY_NATIVE" in data["mode_metrics"]
        assert "RULE_BASED" in data["mode_metrics"]
        assert "AI_UNGUARDED" in data["mode_metrics"]

    def test_execute_benchmark_invalid_split_raises(self, client: FlaskClient, eval_merchant: str):
        payload = {"split": "INVALID_SPLIT"}
        res = client.post(
            "/api/v1/evaluation/benchmark",
            data=json.dumps(payload),
            content_type="application/json",
            headers={"X-Merchant-ID": eval_merchant},
        )
        assert res.status_code == 400
        assert res.get_json()["error"]["code"] == "VALIDATION_ERROR"

    def test_execute_benchmark_invalid_mode_raises(self, client: FlaskClient, eval_merchant: str):
        payload = {"mode": "INVALID_MODE"}
        res = client.post(
            "/api/v1/evaluation/benchmark",
            data=json.dumps(payload),
            content_type="application/json",
            headers={"X-Merchant-ID": eval_merchant},
        )
        assert res.status_code == 400
        assert res.get_json()["error"]["code"] == "VALIDATION_ERROR"

    def test_evaluation_api_requires_auth(self, client: FlaskClient):
        res = client.get("/api/v1/evaluation/summary")
        assert res.status_code == 401
        assert res.get_json()["error"]["code"] == "UNAUTHORIZED"
