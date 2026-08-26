"""Benchmark Report Generator for Phase 17 Comparative Evaluation.

Generates machine-readable JSON reports and human-readable Markdown summaries
for consumption by Phase 18 Evaluation Lab UI and audit archives.
"""

from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional

from app.evaluation.evaluation_modes import EvaluationMode
from app.evaluation.metrics import BenchmarkMetrics
from app.evaluation.scenario_schema import DatasetManifest


class BenchmarkReportGenerator:
    """Generates standardized benchmark reports."""

    BENCHMARK_VERSION = "1.0.0"
    PHASE = "17"

    @classmethod
    def build_report_dict(
        cls,
        manifest: DatasetManifest,
        mode: EvaluationMode | str,
        split: str,
        metrics: BenchmarkMetrics,
        comparative_results: Optional[Dict[str, BenchmarkMetrics]] = None,
    ) -> Dict[str, Any]:
        """Build structured JSON-serializable benchmark report dictionary."""
        mode_str = mode.value if isinstance(mode, EvaluationMode) else str(mode).upper()
        dataset_name = manifest.generation_config.get(
            "dataset_name",
            f"eval_dataset_{manifest.generation_seed}_{manifest.total_scenarios}.json",
        )

        report = {
            "benchmark_version": cls.BENCHMARK_VERSION,
            "phase": cls.PHASE,
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "dataset": {
                "name": dataset_name,
                "generation_seed": manifest.generation_seed,
                "selected_split": split,
                "total_scenarios_in_dataset": manifest.total_scenarios,
                "total_evaluated_in_split": metrics.total_evaluated,
            },
            "evaluation": {
                "mode": mode_str,
                "evaluator_version": "1.0.0",
            },
            "overall_metrics": {
                "total_evaluated": metrics.total_evaluated,
                "label_accuracy": metrics.label_accuracy,
                "policy_outcome_accuracy": metrics.policy_outcome_accuracy,
                "final_action_accuracy": metrics.final_action_accuracy,
                "case_outcome_accuracy": metrics.case_outcome_accuracy,
                "macro_f1": metrics.macro_f1,
                "weighted_f1": metrics.weighted_f1,
            },
            "confusion_matrix": metrics.confusion_matrix,
            "per_class_metrics": {k: v.to_dict() for k, v in metrics.per_class_metrics.items()},
            "safety_metrics": metrics.safety_metrics.to_dict(),
            "comparative_metrics": {
                "simulated_recovery_rate": metrics.simulated_recovery_rate,
                "recovery_uplift_pp": metrics.recovery_uplift_pp,
                "simulated_recovered_revenue_inr": str(metrics.simulated_recovered_revenue_inr),
                "total_at_risk_revenue_inr": str(metrics.total_at_risk_revenue_inr),
                "revenue_recovery_rate": metrics.revenue_recovery_rate,
                "wasted_action_rate": metrics.wasted_action_rate,
                "intervention_efficiency": metrics.intervention_efficiency,
            },
            "family_breakdown": metrics.family_breakdown,
            "difficulty_breakdown": metrics.difficulty_breakdown,
            "category_breakdown": metrics.category_breakdown,
            "split_breakdown": metrics.split_breakdown,
        }

        if comparative_results:
            comp_dict = {}
            for comp_mode, comp_m in comparative_results.items():
                comp_dict[comp_mode] = {
                    "label_accuracy": comp_m.label_accuracy,
                    "simulated_recovery_rate": comp_m.simulated_recovery_rate,
                    "recovery_uplift_pp": comp_m.recovery_uplift_pp,
                    "total_policy_violations": comp_m.safety_metrics.total_policy_violations,
                    "wasted_action_rate": comp_m.wasted_action_rate,
                }
            report["mode_comparison"] = comp_dict

        return report

    @classmethod
    def generate_markdown(
        cls,
        manifest: DatasetManifest,
        mode: EvaluationMode | str,
        split: str,
        metrics: BenchmarkMetrics,
        comparative_results: Optional[Dict[str, BenchmarkMetrics]] = None,
    ) -> str:
        """Generate human-readable Markdown summary report."""
        mode_str = mode.value if isinstance(mode, EvaluationMode) else str(mode).upper()
        lines = [
            f"# SmartMandateRetry — Evaluation Benchmark Report",
            f"",
            f"> **Benchmark Version:** {cls.BENCHMARK_VERSION}  ",
            f"> **Evaluation Mode:** `{mode_str}`  ",
            f"> **Dataset Split:** `{split}` (Total Evaluated: {metrics.total_evaluated:,})  ",
            f"> **Dataset Seed:** {manifest.generation_seed}  ",
            f"",
            f"---",
            f"",
            f"## 1. Executive Summary & Accuracy",
            f"",
            f"| Metric | Value |",
            f"|---|---|",
            f"| **Ground Truth Label Accuracy** | **{metrics.label_accuracy * 100:.2f}%** |",
            f"| **Policy Outcome Accuracy** | {metrics.policy_outcome_accuracy * 100:.2f}% |",
            f"| **Final Action Accuracy** | {metrics.final_action_accuracy * 100:.2f}% |",
            f"| **Case Outcome Accuracy** | {metrics.case_outcome_accuracy * 100:.2f}% |",
            f"| **Macro F1-Score** | {metrics.macro_f1:.4f} |",
            f"| **Weighted F1-Score** | {metrics.weighted_f1:.4f} |",
            f"",
            f"---",
            f"",
            f"## 2. Safety & Governance Compliance (Zero-Tolerance)",
            f"",
            f"| Safety Rule Guardrail | Compliance Rate | Status |",
            f"|---|---|---|",
            f"| **Hard Decline Auto-Stop Veto** | {metrics.safety_metrics.hard_decline_safety_rate * 100:.2f}% | {'PASSED' if metrics.safety_metrics.hard_decline_safety_rate == 1.0 else 'VIOLATION'} |",
            f"| **Max Retries Cap Enforcement** | {metrics.safety_metrics.retry_cap_safety_rate * 100:.2f}% | {'PASSED' if metrics.safety_metrics.retry_cap_safety_rate == 1.0 else 'VIOLATION'} |",
            f"| **Max Recovery Window Enforcement** | {metrics.safety_metrics.recovery_window_enforcement_rate * 100:.2f}% | {'PASSED' if metrics.safety_metrics.recovery_window_enforcement_rate == 1.0 else 'VIOLATION'} |",
            f"| **High-Value Escalation Policy** | {metrics.safety_metrics.high_value_escalation_compliance * 100:.2f}% | {'PASSED' if metrics.safety_metrics.high_value_escalation_compliance == 1.0 else 'VIOLATION'} |",
            f"| **Low-Confidence AI Veto** | {metrics.safety_metrics.low_confidence_veto_rate * 100:.2f}% | {'PASSED' if metrics.safety_metrics.low_confidence_veto_rate == 1.0 else 'VIOLATION'} |",
            f"| **Contact Frequency Cap** | {metrics.safety_metrics.contact_cap_enforcement_rate * 100:.2f}% | {'PASSED' if metrics.safety_metrics.contact_cap_enforcement_rate == 1.0 else 'VIOLATION'} |",
            f"| **Total Policy Violations** | **{metrics.safety_metrics.total_policy_violations}** | {'PASSED (0 Violations)' if metrics.safety_metrics.total_policy_violations == 0 else 'CRITICAL FAILURE'} |",
            f"",
            f"---",
            f"",
            f"## 3. Financial & Recovery Uplift",
            f"",
            f"- **Simulated Recovery Rate:** {metrics.simulated_recovery_rate * 100:.2f}%",
            f"- **Recovered Revenue:** INR {metrics.simulated_recovered_revenue_inr:,.2f} / INR {metrics.total_at_risk_revenue_inr:,.2f} ({metrics.revenue_recovery_rate * 100:.2f}%)",
            f"- **Wasted Retries on Hard Declines:** {metrics.wasted_action_rate * 100:.2f}%",
            f"- **Intervention Efficiency:** {metrics.intervention_efficiency:.2f} recoveries per dispatched action",
        ]

        if metrics.recovery_uplift_pp is not None:
            lines.append(f"- **Recovery Uplift vs Baseline:** **+{metrics.recovery_uplift_pp:.2f} percentage points**")

        # Confusion matrix
        lines.extend([
            f"",
            f"---",
            f"",
            f"## 4. Confusion Matrix (True \\ Pred)",
            f"",
            f"| True \\ Pred | ALLOW | BLOCK | ESCALATE | STOP |",
            f"|---|---|---|---|---|",
        ])
        for true_cls in ["ALLOW", "BLOCK", "ESCALATE", "STOP"]:
            row = metrics.confusion_matrix.get(true_cls, {})
            lines.append(
                f"| **{true_cls}** | {row.get('ALLOW', 0):>5} | {row.get('BLOCK', 0):>5} | {row.get('ESCALATE', 0):>5} | {row.get('STOP', 0):>5} |"
            )

        # Comparative summary if available
        if comparative_results:
            lines.extend([
                f"",
                f"---",
                f"",
                f"## 5. Comparative Evaluation Summary (All Modes)",
                f"",
                f"| Evaluation Mode | Accuracy | Recovery Rate | Recovery Uplift | Policy Violations | Wasted Retries |",
                f"|---|---|---|---|---|---|",
            ])
            for m_name, m_val in comparative_results.items():
                uplift_str = f"+{m_val.recovery_uplift_pp:.2f} pp" if m_val.recovery_uplift_pp is not None else "0.00 pp (Ref)"
                lines.append(
                    f"| `{m_name}` | {m_val.label_accuracy * 100:.1f}% | {m_val.simulated_recovery_rate * 100:.1f}% | {uplift_str} | {m_val.safety_metrics.total_policy_violations} | {m_val.wasted_action_rate * 100:.1f}% |"
                )

        return "\n".join(lines)

    @classmethod
    def save_reports(
        cls,
        manifest: DatasetManifest,
        mode: EvaluationMode | str,
        split: str,
        metrics: BenchmarkMetrics,
        output_dir: str,
        comparative_results: Optional[Dict[str, BenchmarkMetrics]] = None,
    ) -> Tuple[str, str]:
        """Save both JSON and Markdown reports to output_dir.

        Returns:
            Tuple of (json_filepath, markdown_filepath).
        """
        os.makedirs(output_dir, exist_ok=True)
        mode_str = mode.value if isinstance(mode, EvaluationMode) else str(mode).upper()
        base_name = f"benchmark_report_{mode_str}_{split}_{manifest.generation_seed}"

        json_path = os.path.join(output_dir, f"{base_name}.json")
        md_path = os.path.join(output_dir, f"{base_name}.md")

        report_dict = cls.build_report_dict(
            manifest=manifest,
            mode=mode,
            split=split,
            metrics=metrics,
            comparative_results=comparative_results,
        )

        with open(json_path, "w", encoding="utf-8") as f:
            json.dump(report_dict, f, ensure_ascii=False, indent=2)

        md_content = cls.generate_markdown(
            manifest=manifest,
            mode=mode,
            split=split,
            metrics=metrics,
            comparative_results=comparative_results,
        )

        with open(md_path, "w", encoding="utf-8") as f:
            f.write(md_content)

        return os.path.abspath(json_path), os.path.abspath(md_path)
