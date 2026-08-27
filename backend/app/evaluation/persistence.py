"""Evaluation Persistence Service for Phase 17 Benchmark Engine.

Persists EvaluationRun and EvaluationScenarioResult records transactionally
using the existing UnitOfWork pattern without database migrations.
"""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from app.domain.models import EvaluationRun, EvaluationScenarioResult, generate_uuid
from app.evaluation.evaluation_modes import EvaluationMode
from app.evaluation.metrics import BenchmarkMetrics, ScenarioEvaluationResult
from app.evaluation.scenario_schema import DatasetManifest
from app.infrastructure.database import get_session
from app.infrastructure.repositories.unit_of_work import UnitOfWork


class EvaluationPersistenceService:
    """Service persisting evaluation benchmark runs and scenario results."""

    def __init__(self, uow: Optional[UnitOfWork] = None) -> None:
        self.uow = uow or UnitOfWork(get_session)

    def persist_run(
        self,
        manifest: DatasetManifest,
        mode: EvaluationMode | str,
        split: str,
        metrics: BenchmarkMetrics,
        scenario_results: List[ScenarioEvaluationResult],
    ) -> EvaluationRun:
        """Persist a complete benchmark evaluation run and its scenario results.

        Args:
            manifest: Consumed DatasetManifest.
            mode: EvaluationMode or string.
            split: Dataset split evaluated (e.g. "TEST").
            metrics: Computed BenchmarkMetrics.
            scenario_results: List of ScenarioEvaluationResult objects.

        Returns:
            The persisted EvaluationRun instance.
        """
        mode_str = mode.value if isinstance(mode, EvaluationMode) else str(mode).upper()
        dataset_name = manifest.generation_config.get(
            "dataset_name",
            f"eval_dataset_{manifest.generation_seed}_{manifest.total_scenarios}_{split}",
        )

        with self.uow:
            run_id = generate_uuid("run")
            metrics_dict = metrics.to_dict()
            metrics_dict["dataset_seed"] = manifest.generation_seed
            metrics_dict["dataset_split"] = split

            run = EvaluationRun(
                id=run_id,
                dataset_name=dataset_name,
                baseline_mode=mode_str,
                metrics_summary=metrics_dict,
                created_at=datetime.now(timezone.utc),
            )

            # Build child EvaluationScenarioResult records
            for res in scenario_results:
                scenario_res_id = generate_uuid("res")
                scenario_record = EvaluationScenarioResult(
                    id=scenario_res_id,
                    evaluation_run_id=run_id,
                    scenario_id=res.scenario.scenario_id,
                    actual_outcome=res.scenario.ground_truth_label,
                    simulated_outcome=res.prediction.predicted_label,
                    details={
                        "scenario_family": res.scenario.scenario_family,
                        "difficulty_tier": res.scenario.difficulty_tier,
                        "dataset_split": res.scenario.dataset_split,
                        "predicted_action": res.prediction.predicted_final_action,
                        "predicted_policy_status": res.prediction.predicted_policy_outcome,
                        "predicted_case_outcome": res.prediction.predicted_case_outcome,
                        "is_label_correct": res.is_label_correct,
                        "is_policy_violation": res.prediction.is_policy_violation,
                        "violation_type": res.prediction.violation_type,
                        "execution_time_ms": res.prediction.execution_time_ms,
                        "reasons": res.prediction.reasons,
                    },
                    created_at=datetime.now(timezone.utc),
                )
                run.results.append(scenario_record)

            self.uow.evaluations.add(run)
            self.uow.commit()
            _ = len(run.results)
            self.uow.session.expunge_all()
            return run

    def get_run_by_id(self, run_id: str) -> Optional[EvaluationRun]:
        """Retrieve an evaluation run by primary key."""
        with self.uow:
            run = self.uow.evaluations.get_by_id(run_id)
            if run:
                _ = len(run.results)
                self.uow.session.expunge_all()
            return run

    def list_latest_runs(self, limit: int = 10) -> List[EvaluationRun]:
        """Retrieve recent evaluation runs."""
        with self.uow:
            runs = self.uow.evaluations.get_latest_runs(limit=limit)
            self.uow.session.expunge_all()
            return runs

    def count_total_runs(self) -> int:
        """Count total evaluation runs in the database."""
        with self.uow:
            return self.uow.evaluations.count()
