"""Tests for Phase 17 Evaluation Persistence Service."""

import pytest
from app.domain.models import EvaluationRun, EvaluationScenarioResult
from app.evaluation.dataset_manifest import DatasetManifestManager
from app.evaluation.dataset_splitter import DatasetSplitter
from app.evaluation.evaluation_engine import EvaluationEngine
from app.evaluation.evaluation_modes import EvaluationMode
from app.evaluation.persistence import EvaluationPersistenceService
from app.evaluation.scenario_generator import ScenarioGenerator
from app.evaluation.seed_manager import SeedManager
from app.infrastructure.repositories.unit_of_work import UnitOfWork


@pytest.fixture
def test_manifest():
    sm = SeedManager(42)
    gen = ScenarioGenerator(sm)
    scenarios = gen.generate(20, n_customers=5, n_merchants=2)
    splitter = DatasetSplitter(sm)
    scenarios = splitter.split(scenarios)
    manager = DatasetManifestManager()
    return manager.build(42, scenarios)


class TestEvaluationPersistenceService:
    def test_persist_run_success(self, uow: UnitOfWork, test_manifest):
        engine = EvaluationEngine()
        metrics, results = engine.evaluate_manifest(test_manifest, mode=EvaluationMode.SMART_MANDATE, split="ALL")

        service = EvaluationPersistenceService(uow=uow)
        run_record = service.persist_run(
            manifest=test_manifest,
            mode=EvaluationMode.SMART_MANDATE,
            split="ALL",
            metrics=metrics,
            scenario_results=results,
        )

        assert run_record.id.startswith("run_")
        assert run_record.baseline_mode == "SMART_MANDATE"
        assert len(run_record.results) == 20

        # Retrieve and verify from repository
        loaded = service.get_run_by_id(run_record.id)
        assert loaded is not None
        assert loaded.id == run_record.id
        assert len(loaded.results) == 20
        assert loaded.results[0].id.startswith("res_")
        assert loaded.results[0].evaluation_run_id == run_record.id

    def test_list_latest_runs(self, uow: UnitOfWork, test_manifest):
        engine = EvaluationEngine()
        metrics, results = engine.evaluate_manifest(test_manifest, mode=EvaluationMode.RULE_BASED, split="ALL")

        service = EvaluationPersistenceService(uow=uow)
        run1 = service.persist_run(test_manifest, EvaluationMode.RULE_BASED, "ALL", metrics, results)
        run2 = service.persist_run(test_manifest, EvaluationMode.RAZORPAY_NATIVE, "ALL", metrics, results)

        runs = service.list_latest_runs(limit=10)
        run_ids = [r.id for r in runs]
        assert run1.id in run_ids
        assert run2.id in run_ids

    def test_scenario_result_details_stored(self, uow: UnitOfWork, test_manifest):
        engine = EvaluationEngine()
        metrics, results = engine.evaluate_manifest(test_manifest, mode=EvaluationMode.SMART_MANDATE, split="ALL")

        service = EvaluationPersistenceService(uow=uow)
        run = service.persist_run(test_manifest, EvaluationMode.SMART_MANDATE, "ALL", metrics, results)

        loaded = service.get_run_by_id(run.id)
        res0 = loaded.results[0]
        assert "scenario_family" in res0.details
        assert "predicted_action" in res0.details
        assert "is_label_correct" in res0.details

    def test_get_run_by_id_nonexistent_returns_none(self, uow: UnitOfWork):
        service = EvaluationPersistenceService(uow=uow)
        assert service.get_run_by_id("run_nonexistent_id") is None

    def test_persist_preserves_custom_dataset_name(self, uow: UnitOfWork, test_manifest):
        engine = EvaluationEngine()
        metrics, results = engine.evaluate_manifest(test_manifest, mode=EvaluationMode.SMART_MANDATE, split="ALL")

        manifest_custom = test_manifest.model_copy(update={
            "generation_config": {"dataset_name": "custom_benchmark_dataset_v1.json", "seed": 42}
        })
        service = EvaluationPersistenceService(uow=uow)
        run = service.persist_run(manifest_custom, EvaluationMode.SMART_MANDATE, "ALL", metrics, results)
        assert run.dataset_name == "custom_benchmark_dataset_v1.json"

    def test_list_latest_runs_respects_limit(self, uow: UnitOfWork, test_manifest):
        engine = EvaluationEngine()
        metrics, results = engine.evaluate_manifest(test_manifest, mode=EvaluationMode.SMART_MANDATE, split="ALL")
        service = EvaluationPersistenceService(uow=uow)
        for _ in range(3):
            service.persist_run(test_manifest, EvaluationMode.SMART_MANDATE, "ALL", metrics, results)

        limited = service.list_latest_runs(limit=2)
        assert len(limited) <= 2
