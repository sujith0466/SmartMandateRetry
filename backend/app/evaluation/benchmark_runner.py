"""Benchmark Runner for Phase 17 Comparative Evaluation.

Orchestrates multi-mode benchmark evaluations, comparative uplift calculations,
database persistence, and report generation.
"""

from __future__ import annotations

import os
from typing import Any, Dict, List, Optional, Tuple

from app.domain.models import EvaluationRun
from app.evaluation.dataset_manifest import DatasetManifestManager
from app.evaluation.evaluation_engine import EvaluationEngine
from app.evaluation.evaluation_modes import EvaluationMode
from app.evaluation.metrics import BenchmarkMetrics, ScenarioEvaluationResult
from app.evaluation.persistence import EvaluationPersistenceService
from app.evaluation.report import BenchmarkReportGenerator
from app.evaluation.scenario_schema import DatasetManifest


class BenchmarkRunner:
    """Orchestrator for benchmark evaluations and comparative analysis."""

    def __init__(
        self,
        engine: Optional[EvaluationEngine] = None,
        persistence: Optional[EvaluationPersistenceService] = None,
        manifest_manager: Optional[DatasetManifestManager] = None,
    ) -> None:
        self.manifest_manager = manifest_manager or DatasetManifestManager()
        self.engine = engine or EvaluationEngine(manifest_manager=self.manifest_manager)
        self.persistence = persistence or EvaluationPersistenceService()

    def run_benchmark(
        self,
        manifest: DatasetManifest,
        mode: EvaluationMode | str = EvaluationMode.SMART_MANDATE,
        split: str = "TEST",
        baseline_recovery_rate: Optional[float] = None,
        persist: bool = False,
        output_dir: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Execute benchmark evaluation for a single mode.

        Args:
            manifest: Phase 16 DatasetManifest.
            mode: Evaluation mode to execute.
            split: Dataset split to evaluate ("TRAIN", "VALIDATION", "TEST", "ALL").
            baseline_recovery_rate: Optional baseline recovery rate for uplift delta.
            persist: Whether to persist EvaluationRun to database.
            output_dir: Optional directory to write JSON and Markdown reports.

        Returns:
            Dictionary containing run metadata, metrics, and report paths.
        """
        metrics, scenario_results = self.engine.evaluate_manifest(
            manifest=manifest,
            mode=mode,
            split=split,
            baseline_recovery_rate=baseline_recovery_rate,
        )

        run_record: Optional[EvaluationRun] = None
        if persist:
            run_record = self.persistence.persist_run(
                manifest=manifest,
                mode=mode,
                split=split,
                metrics=metrics,
                scenario_results=scenario_results,
            )

        json_path, md_path = None, None
        if output_dir:
            json_path, md_path = BenchmarkReportGenerator.save_reports(
                manifest=manifest,
                mode=mode,
                split=split,
                metrics=metrics,
                output_dir=output_dir,
            )

        return {
            "mode": mode.value if isinstance(mode, EvaluationMode) else str(mode).upper(),
            "split": split,
            "total_evaluated": metrics.total_evaluated,
            "metrics": metrics,
            "scenario_results": scenario_results,
            "run_id": run_record.id if run_record else None,
            "json_report_path": json_path,
            "markdown_report_path": md_path,
        }

    def run_comparative_benchmark(
        self,
        manifest: DatasetManifest,
        split: str = "TEST",
        persist: bool = False,
        output_dir: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Execute comparative evaluation across all 4 modes (Smart, Razorpay Native, Rule-Based, AI-Unguarded).

        Uses RAZORPAY_NATIVE as the reference baseline for computing recovery uplift deltas.
        """
        # Step 1: Run reference Baseline A (Razorpay Native) to get baseline recovery rate
        native_m, native_res = self.engine.evaluate_manifest(
            manifest=manifest,
            mode=EvaluationMode.RAZORPAY_NATIVE,
            split=split,
        )
        baseline_rate = native_m.simulated_recovery_rate

        # Step 2: Run all 4 modes
        all_modes = [
            EvaluationMode.SMART_MANDATE,
            EvaluationMode.RAZORPAY_NATIVE,
            EvaluationMode.RULE_BASED,
            EvaluationMode.AI_UNGUARDED,
        ]

        mode_metrics: Dict[str, BenchmarkMetrics] = {}
        mode_results: Dict[str, List[ScenarioEvaluationResult]] = {}
        persisted_run_ids: Dict[str, str] = {}

        for mode in all_modes:
            m, res = self.engine.evaluate_manifest(
                manifest=manifest,
                mode=mode,
                split=split,
                baseline_recovery_rate=baseline_rate,
            )
            mode_name = mode.value
            mode_metrics[mode_name] = m
            mode_results[mode_name] = res

            if persist:
                rec = self.persistence.persist_run(
                    manifest=manifest,
                    mode=mode,
                    split=split,
                    metrics=m,
                    scenario_results=res,
                )
                persisted_run_ids[mode_name] = rec.id

        # Step 3: Save consolidated reports if requested
        json_path, md_path = None, None
        if output_dir:
            smart_metrics = mode_metrics[EvaluationMode.SMART_MANDATE.value]
            json_path, md_path = BenchmarkReportGenerator.save_reports(
                manifest=manifest,
                mode=EvaluationMode.SMART_MANDATE,
                split=split,
                metrics=smart_metrics,
                output_dir=output_dir,
                comparative_results=mode_metrics,
            )

        return {
            "split": split,
            "total_evaluated": native_m.total_evaluated,
            "baseline_recovery_rate": baseline_rate,
            "mode_metrics": mode_metrics,
            "mode_results": mode_results,
            "persisted_run_ids": persisted_run_ids,
            "json_report_path": json_path,
            "markdown_report_path": md_path,
        }
