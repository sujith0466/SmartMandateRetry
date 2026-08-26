"""Merchant evaluation and comparative benchmark REST API blueprint."""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional
from flask import Blueprint, g, jsonify, request

from app.core.auth import get_uow, require_merchant_auth
from app.core.errors import ResourceNotFoundError, ValidationError
from app.core.logging import get_logger
from app.evaluation.benchmark_runner import BenchmarkRunner
from app.evaluation.dataset_manifest import DatasetManifestManager
from app.evaluation.evaluation_modes import EvaluationMode
from app.evaluation.persistence import EvaluationPersistenceService

logger = get_logger("smartmandate.api.evaluation")

evaluation_bp = Blueprint("evaluation", __name__)

_DEFAULT_DATASET_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))),
    "datasets",
    "eval_dataset_42_5000.json",
)


def _load_default_manifest():
    manager = DatasetManifestManager()
    if os.path.exists(_DEFAULT_DATASET_PATH):
        return manager.load(_DEFAULT_DATASET_PATH)
    # Generate on the fly if manifest file not present on disk
    from app.evaluation.seed_manager import SeedManager
    from app.evaluation.scenario_generator import ScenarioGenerator
    from app.evaluation.dataset_splitter import DatasetSplitter
    sm = SeedManager(42)
    gen = ScenarioGenerator(sm)
    scenarios = gen.generate(5000, n_customers=500, n_merchants=50)
    splitter = DatasetSplitter(sm)
    scenarios = splitter.split(scenarios)
    return manager.build(42, scenarios)


@evaluation_bp.route("/summary", methods=["GET"])
@require_merchant_auth
def get_evaluation_summary():
    """Fetch macro overview metadata of the synthetic benchmark dataset and latest run."""
    uow = get_uow()
    persistence = EvaluationPersistenceService(uow=uow)
    latest_runs = persistence.list_latest_runs(limit=1)
    latest_run = latest_runs[0] if latest_runs else None

    latest_run_dict = None
    if latest_run:
        latest_run_dict = {
            "id": latest_run.id,
            "dataset_name": latest_run.dataset_name,
            "baseline_mode": latest_run.baseline_mode,
            "metrics_summary": latest_run.metrics_summary,
            "created_at": latest_run.created_at.isoformat() if latest_run.created_at else None,
            "results_count": len(latest_run.results) if latest_run.results else 0,
        }

    manifest = _load_default_manifest()

    total_runs_count = len(persistence.list_latest_runs(limit=100))

    return jsonify({
        "total_runs": total_runs_count,
        "latest_run": latest_run_dict,
        "dataset": {
            "name": f"eval_dataset_{manifest.generation_seed}_{manifest.total_scenarios}",
            "total_scenarios": manifest.total_scenarios,
            "splits": manifest.split_counts,
            "families_count": len(manifest.family_distribution),
            "difficulty_tiers": manifest.tier_distribution,
            "seed": manifest.generation_seed,
        },
    }), 200


@evaluation_bp.route("/runs", methods=["GET"])
@require_merchant_auth
def list_evaluation_runs():
    """List persisted evaluation benchmark runs with pagination."""
    page = request.args.get("page", 1, type=int)
    limit = min(request.args.get("limit", 20, type=int), 100)

    if page < 1 or limit < 1:
        raise ValidationError("Page and limit must be positive integers")

    uow = get_uow()
    persistence = EvaluationPersistenceService(uow=uow)
    all_runs = persistence.list_latest_runs(limit=100)

    total = len(all_runs)
    start_idx = (page - 1) * limit
    paged_runs = all_runs[start_idx : start_idx + limit]

    data = [
        {
            "id": r.id,
            "dataset_name": r.dataset_name,
            "baseline_mode": r.baseline_mode,
            "metrics_summary": r.metrics_summary,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "results_count": len(r.results) if r.results else 0,
        }
        for r in paged_runs
    ]

    return jsonify({
        "data": data,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit if total > 0 else 1,
        },
    }), 200


@evaluation_bp.route("/runs/<run_id>", methods=["GET"])
@require_merchant_auth
def get_evaluation_run_detail(run_id: str):
    """Retrieve detailed evaluation run with its full metrics summary."""
    uow = get_uow()
    persistence = EvaluationPersistenceService(uow=uow)
    run = persistence.get_run_by_id(run_id)

    if not run:
        raise ResourceNotFoundError("EvaluationRun", run_id)

    return jsonify({
        "id": run.id,
        "dataset_name": run.dataset_name,
        "baseline_mode": run.baseline_mode,
        "metrics_summary": run.metrics_summary,
        "created_at": run.created_at.isoformat() if run.created_at else None,
        "results_count": len(run.results) if run.results else 0,
    }), 200


@evaluation_bp.route("/runs/<run_id>/results", methods=["GET"])
@require_merchant_auth
def list_scenario_results(run_id: str):
    """List and filter individual scenario results for a specific evaluation run."""
    page = request.args.get("page", 1, type=int)
    limit = min(request.args.get("limit", 20, type=int), 100)
    family = request.args.get("family", None)
    tier = request.args.get("tier", None)
    split = request.args.get("split", None)
    label = request.args.get("label", None)
    is_correct = request.args.get("is_correct", None)
    is_violation = request.args.get("is_violation", None)
    search = request.args.get("search", None)

    if page < 1 or limit < 1:
        raise ValidationError("Page and limit must be positive integers")

    uow = get_uow()
    persistence = EvaluationPersistenceService(uow=uow)
    run = persistence.get_run_by_id(run_id)

    if not run:
        raise ResourceNotFoundError("EvaluationRun", run_id)

    results = run.results or []

    # In-memory filtering over scenario results details
    filtered = []
    for r in results:
        details = r.details or {}

        if family and details.get("scenario_family") != family:
            continue
        if tier and details.get("difficulty_tier") != tier:
            continue
        if split and details.get("dataset_split") != split:
            continue
        if label and r.actual_outcome != label:
            continue
        if is_correct is not None:
            expect_correct = is_correct.lower() in ("true", "1")
            if bool(details.get("is_label_correct")) != expect_correct:
                continue
        if is_violation is not None:
            expect_violation = is_violation.lower() in ("true", "1")
            if bool(details.get("is_policy_violation")) != expect_violation:
                continue
        if search:
            s_low = search.lower()
            if s_low not in r.scenario_id.lower() and s_low not in str(details.get("scenario_family", "")).lower():
                continue

        filtered.append({
            "id": r.id,
            "evaluation_run_id": r.evaluation_run_id,
            "scenario_id": r.scenario_id,
            "actual_outcome": r.actual_outcome,
            "simulated_outcome": r.simulated_outcome,
            "details": details,
            "created_at": r.created_at.isoformat() if r.created_at else None,
        })

    total = len(filtered)
    start_idx = (page - 1) * limit
    paged = filtered[start_idx : start_idx + limit]

    return jsonify({
        "data": paged,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit if total > 0 else 1,
        },
    }), 200


@evaluation_bp.route("/benchmark", methods=["POST"])
@require_merchant_auth
def execute_benchmark():
    """Execute benchmark evaluation on-demand across single or all 4 comparative modes."""
    payload = request.get_json() or {}
    split = payload.get("split", "TEST").upper()
    mode_input = payload.get("mode", "SMART_MANDATE").upper()
    compare = payload.get("compare", False) or mode_input == "ALL"
    persist = payload.get("persist", True)

    if split not in ("TRAIN", "VALIDATION", "TEST", "ALL"):
        raise ValidationError(f"Invalid split '{split}'. Allowed: TRAIN, VALIDATION, TEST, ALL")

    manifest = _load_default_manifest()

    uow = get_uow()
    persistence = EvaluationPersistenceService(uow=uow)
    runner = BenchmarkRunner(persistence=persistence)

    if compare:
        comparative_results = runner.run_comparative_benchmark(
            manifest=manifest,
            split=split,
            persist=persist,
        )
        mode_metrics_dict = {
            m: metrics.to_dict()
            for m, metrics in comparative_results["mode_metrics"].items()
        }
        return jsonify({
            "mode_metrics": mode_metrics_dict,
            "baseline_recovery_rate": comparative_results["baseline_recovery_rate"],
            "total_evaluated": comparative_results["total_evaluated"],
            "split": split,
            "persisted_run_ids": comparative_results["persisted_run_ids"],
            "json_report_path": comparative_results.get("json_report_path"),
            "markdown_report_path": comparative_results.get("markdown_report_path"),
        }), 200

    else:
        try:
            eval_mode = EvaluationMode(mode_input)
        except ValueError:
            raise ValidationError(
                f"Invalid mode '{mode_input}'. Allowed: {[m.value for m in EvaluationMode]} or ALL"
            )

        single_result = runner.run_benchmark(
            manifest=manifest,
            mode=eval_mode,
            split=split,
            persist=persist,
        )
        return jsonify({
            "mode": eval_mode.value,
            "split": split,
            "metrics": single_result["metrics"].to_dict(),
            "total_evaluated": single_result["total_evaluated"],
            "run_id": single_result["run_id"],
            "json_report_path": single_result.get("json_report_path"),
            "markdown_report_path": single_result.get("markdown_report_path"),
        }), 200
