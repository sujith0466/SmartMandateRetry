"""Evaluation Engine for Phase 17 Comparative Benchmark.

Orchestrates scenario iteration, split filtering, prediction execution,
and ground-truth comparison without mutating any scenario or system state.
"""

from __future__ import annotations

import time
from typing import Any, Dict, List, Optional

from app.evaluation.dataset_manifest import DatasetManifestManager
from app.evaluation.evaluation_modes import BaseEvaluator, EvaluationMode, get_evaluator
from app.evaluation.metrics import (
    BenchmarkMetrics,
    MetricsCalculator,
    ScenarioEvaluationResult,
)
from app.evaluation.scenario_schema import DatasetManifest, SyntheticScenario


class EvaluationEngine:
    """Core evaluation engine executing evaluators against dataset manifests."""

    VALID_SPLITS = {"TRAIN", "VALIDATION", "TEST", "ALL"}

    def __init__(self, manifest_manager: Optional[DatasetManifestManager] = None) -> None:
        self.manifest_manager = manifest_manager or DatasetManifestManager()

    def evaluate_manifest(
        self,
        manifest: DatasetManifest,
        mode: EvaluationMode | str,
        split: str = "TEST",
        baseline_recovery_rate: Optional[float] = None,
    ) -> Tuple[BenchmarkMetrics, List[ScenarioEvaluationResult]]:
        """Evaluate a DatasetManifest using the specified mode and split.

        Args:
            manifest: Phase 16 DatasetManifest instance.
            mode: EvaluationMode enum or string.
            split: Dataset split partition ("TRAIN", "VALIDATION", "TEST", or "ALL"). Default: "TEST".
            baseline_recovery_rate: Optional baseline recovery rate to compute uplift delta.

        Returns:
            Tuple of (BenchmarkMetrics, List[ScenarioEvaluationResult]).
        """
        split_upper = split.upper()
        if split_upper not in self.VALID_SPLITS:
            raise ValueError(
                f"Invalid dataset split '{split}'. Must be one of {self.VALID_SPLITS}"
            )

        evaluator: BaseEvaluator = get_evaluator(mode)

        # 1. Filter scenarios strictly by split
        if split_upper == "ALL":
            selected_scenarios = list(manifest.scenarios)
        else:
            selected_scenarios = [
                s for s in manifest.scenarios if s.dataset_split == split_upper
            ]

        # 2. Execute evaluator on each scenario
        results: List[ScenarioEvaluationResult] = []
        for scenario in selected_scenarios:
            t0 = time.monotonic()
            prediction = evaluator.evaluate_scenario(scenario)
            t1 = time.monotonic()
            elapsed_ms = (t1 - t0) * 1000.0

            # Store elapsed execution time in prediction object if not already set
            if prediction.execution_time_ms == 0.0:
                # Use object __setattr__ since dataclass is frozen
                object.__setattr__(prediction, "execution_time_ms", elapsed_ms)

            # Compare against ground truth
            label_correct = prediction.predicted_label == scenario.ground_truth_label
            pol_correct = prediction.predicted_policy_outcome == scenario.expected_policy_outcome
            act_correct = prediction.predicted_final_action == scenario.expected_final_action
            case_correct = prediction.predicted_case_outcome == scenario.expected_case_outcome

            res = ScenarioEvaluationResult(
                scenario=scenario,
                prediction=prediction,
                is_label_correct=label_correct,
                is_policy_outcome_correct=pol_correct,
                is_final_action_correct=act_correct,
                is_case_outcome_correct=case_correct,
            )
            results.append(res)

        # 3. Compute aggregate metrics
        metrics = MetricsCalculator.compute(
            results=results,
            baseline_recovery_rate=baseline_recovery_rate,
        )

        return metrics, results

    def evaluate_file(
        self,
        filepath: str,
        mode: EvaluationMode | str,
        split: str = "TEST",
        baseline_recovery_rate: Optional[float] = None,
    ) -> Tuple[BenchmarkMetrics, List[ScenarioEvaluationResult], DatasetManifest]:
        """Load manifest from disk and execute evaluation."""
        manifest = self.manifest_manager.load(filepath)
        metrics, results = self.evaluate_manifest(
            manifest=manifest,
            mode=mode,
            split=split,
            baseline_recovery_rate=baseline_recovery_rate,
        )
        return metrics, results, manifest
