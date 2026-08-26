"""Evaluation Metrics Engine for Phase 17 Comparative Benchmark.

Computes comprehensive deterministic classification, safety compliance,
operational efficiency, and comparative uplift metrics from scenario evaluation results.
Zero-denominator cases are handled deterministically without errors.
"""

from __future__ import annotations

from collections import Counter, defaultdict
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from app.evaluation.evaluation_modes import EvaluationPrediction
from app.evaluation.scenario_schema import SyntheticScenario


CLASSES = ["ALLOW", "BLOCK", "ESCALATE", "STOP"]


@dataclass
class ScenarioEvaluationResult:
    """Individual scenario evaluation paired with ground truth."""
    scenario: SyntheticScenario
    prediction: EvaluationPrediction
    is_label_correct: bool
    is_policy_outcome_correct: bool
    is_final_action_correct: bool
    is_case_outcome_correct: bool

    def to_dict(self) -> Dict[str, Any]:
        return {
            "scenario_id": self.scenario.scenario_id,
            "scenario_family": self.scenario.scenario_family,
            "difficulty_tier": self.scenario.difficulty_tier,
            "dataset_split": self.scenario.dataset_split,
            "ground_truth_label": self.scenario.ground_truth_label,
            "predicted_label": self.prediction.predicted_label,
            "expected_final_action": self.scenario.expected_final_action,
            "predicted_final_action": self.prediction.predicted_final_action,
            "expected_policy_outcome": self.scenario.expected_policy_outcome,
            "predicted_policy_outcome": self.prediction.predicted_policy_outcome,
            "expected_case_outcome": self.scenario.expected_case_outcome,
            "predicted_case_outcome": self.prediction.predicted_case_outcome,
            "is_label_correct": self.is_label_correct,
            "is_policy_outcome_correct": self.is_policy_outcome_correct,
            "is_final_action_correct": self.is_final_action_correct,
            "is_case_outcome_correct": self.is_case_outcome_correct,
            "is_policy_violation": self.prediction.is_policy_violation,
            "violation_type": self.prediction.violation_type,
            "execution_time_ms": self.prediction.execution_time_ms,
            "reasons": self.prediction.reasons,
        }


@dataclass
class ClassMetrics:
    """Precision, recall, F1, and support for a single class."""
    precision: float
    recall: float
    f1_score: float
    support: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "precision": round(self.precision, 4),
            "recall": round(self.recall, 4),
            "f1_score": round(self.f1_score, 4),
            "support": self.support,
        }


@dataclass
class SafetyMetrics:
    """Safety and governance compliance metrics (zero-tolerance)."""
    hard_decline_safety_rate: float
    retry_cap_safety_rate: float
    recovery_window_enforcement_rate: float
    high_value_escalation_compliance: float
    low_confidence_veto_rate: float
    contact_cap_enforcement_rate: float
    total_policy_violations: int

    def to_dict(self) -> Dict[str, Any]:
        return {
            "hard_decline_safety_rate": round(self.hard_decline_safety_rate, 4),
            "retry_cap_safety_rate": round(self.retry_cap_safety_rate, 4),
            "recovery_window_enforcement_rate": round(self.recovery_window_enforcement_rate, 4),
            "high_value_escalation_compliance": round(self.high_value_escalation_compliance, 4),
            "low_confidence_veto_rate": round(self.low_confidence_veto_rate, 4),
            "contact_cap_enforcement_rate": round(self.contact_cap_enforcement_rate, 4),
            "total_policy_violations": self.total_policy_violations,
        }


@dataclass
class BenchmarkMetrics:
    """Consolidated benchmark evaluation metrics."""
    total_evaluated: int
    label_accuracy: float
    policy_outcome_accuracy: float
    final_action_accuracy: float
    case_outcome_accuracy: float
    macro_f1: float
    weighted_f1: float
    confusion_matrix: Dict[str, Dict[str, int]]
    per_class_metrics: Dict[str, ClassMetrics]
    safety_metrics: SafetyMetrics
    simulated_recovery_rate: float
    simulated_recovered_revenue_inr: Decimal
    total_at_risk_revenue_inr: Decimal
    revenue_recovery_rate: float
    wasted_action_rate: float
    intervention_efficiency: float
    recovery_uplift_pp: Optional[float] = None
    family_breakdown: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    difficulty_breakdown: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    category_breakdown: Dict[str, Dict[str, Any]] = field(default_factory=dict)
    split_breakdown: Dict[str, Dict[str, Any]] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "total_evaluated": self.total_evaluated,
            "label_accuracy": round(self.label_accuracy, 4),
            "policy_outcome_accuracy": round(self.policy_outcome_accuracy, 4),
            "final_action_accuracy": round(self.final_action_accuracy, 4),
            "case_outcome_accuracy": round(self.case_outcome_accuracy, 4),
            "macro_f1": round(self.macro_f1, 4),
            "weighted_f1": round(self.weighted_f1, 4),
            "confusion_matrix": self.confusion_matrix,
            "per_class_metrics": {k: v.to_dict() for k, v in self.per_class_metrics.items()},
            "safety_metrics": self.safety_metrics.to_dict(),
            "simulated_recovery_rate": round(self.simulated_recovery_rate, 4),
            "simulated_recovered_revenue_inr": str(self.simulated_recovered_revenue_inr),
            "total_at_risk_revenue_inr": str(self.total_at_risk_revenue_inr),
            "revenue_recovery_rate": round(self.revenue_recovery_rate, 4),
            "wasted_action_rate": round(self.wasted_action_rate, 4),
            "intervention_efficiency": round(self.intervention_efficiency, 4),
            "recovery_uplift_pp": round(self.recovery_uplift_pp, 2) if self.recovery_uplift_pp is not None else None,
            "family_breakdown": self.family_breakdown,
            "difficulty_breakdown": self.difficulty_breakdown,
            "category_breakdown": self.category_breakdown,
            "split_breakdown": self.split_breakdown,
        }


class MetricsCalculator:
    """Deterministic calculator for benchmark metrics."""

    @staticmethod
    def compute(
        results: List[ScenarioEvaluationResult],
        baseline_recovery_rate: Optional[float] = None,
    ) -> BenchmarkMetrics:
        """Compute full benchmark metrics from a list of ScenarioEvaluationResults."""
        total = len(results)
        if total == 0:
            return MetricsCalculator._empty_metrics()

        # 1. Accuracies
        label_acc = sum(1 for r in results if r.is_label_correct) / total
        pol_acc = sum(1 for r in results if r.is_policy_outcome_correct) / total
        act_acc = sum(1 for r in results if r.is_final_action_correct) / total
        case_acc = sum(1 for r in results if r.is_case_outcome_correct) / total

        # 2. Confusion matrix & Per-class metrics
        cm: Dict[str, Dict[str, int]] = {
            true_cls: {pred_cls: 0 for pred_cls in CLASSES}
            for true_cls in CLASSES
        }
        for r in results:
            t = r.scenario.ground_truth_label
            p = r.prediction.predicted_label
            if t in cm and p in cm[t]:
                cm[t][p] += 1

        per_class: Dict[str, ClassMetrics] = {}
        f1_list = []
        support_list = []

        for c in CLASSES:
            tp = cm[c][c]
            fp = sum(cm[other][c] for other in CLASSES if other != c)
            fn = sum(cm[c][other] for other in CLASSES if other != c)
            supp = sum(cm[c].values())

            prec = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            rec = tp / (tp + fn) if (tp + fn) > 0 else 0.0
            f1 = (2 * prec * rec) / (prec + rec) if (prec + rec) > 0 else 0.0

            per_class[c] = ClassMetrics(precision=prec, recall=rec, f1_score=f1, support=supp)
            f1_list.append(f1)
            support_list.append(supp)

        macro_f1 = sum(f1_list) / len(f1_list) if f1_list else 0.0
        total_support = sum(support_list)
        weighted_f1 = (
            sum(f * s for f, s in zip(f1_list, support_list)) / total_support
            if total_support > 0
            else 0.0
        )

        # 3. Safety metrics
        safety = MetricsCalculator._compute_safety_metrics(results)

        # 4. Financial & Recovery metrics
        rec_eligible = [
            r for r in results
            if r.scenario.recoverability == "RECOVERABLE" and not r.scenario.is_hard_decline
        ]
        recovered_count = sum(
            1 for r in rec_eligible if r.prediction.predicted_case_outcome == "RECOVERED"
        )
        sim_rec_rate = (
            recovered_count / len(rec_eligible) if len(rec_eligible) > 0 else 0.0
        )

        total_rev = sum((r.scenario.recovery_case.amount_inr for r in results), Decimal("0"))
        recovered_rev = sum(
            (
                r.scenario.recovery_case.amount_inr
                for r in rec_eligible
                if r.prediction.predicted_case_outcome == "RECOVERED"
            ),
            Decimal("0"),
        )
        rev_rate = float(recovered_rev / total_rev) if total_rev > 0 else 0.0

        actions_dispatched = sum(
            1 for r in results if r.prediction.predicted_final_action not in ("STOP",)
        )
        wasted_on_hard = sum(
            1 for r in results
            if r.scenario.is_hard_decline and r.prediction.predicted_final_action not in ("STOP",)
        )
        wasted_rate = (
            wasted_on_hard / actions_dispatched if actions_dispatched > 0 else 0.0
        )
        efficiency = (
            recovered_count / actions_dispatched if actions_dispatched > 0 else 0.0
        )

        uplift = None
        if baseline_recovery_rate is not None:
            uplift = (sim_rec_rate - baseline_recovery_rate) * 100.0

        # 5. Breakdowns
        fam_bd = MetricsCalculator._compute_dimension_breakdown(results, lambda r: r.scenario.scenario_family)
        tier_bd = MetricsCalculator._compute_dimension_breakdown(results, lambda r: r.scenario.difficulty_tier)
        cat_bd = MetricsCalculator._compute_dimension_breakdown(results, lambda r: r.scenario.failure_category)
        split_bd = MetricsCalculator._compute_dimension_breakdown(results, lambda r: r.scenario.dataset_split)

        return BenchmarkMetrics(
            total_evaluated=total,
            label_accuracy=label_acc,
            policy_outcome_accuracy=pol_acc,
            final_action_accuracy=act_acc,
            case_outcome_accuracy=case_acc,
            macro_f1=macro_f1,
            weighted_f1=weighted_f1,
            confusion_matrix=cm,
            per_class_metrics=per_class,
            safety_metrics=safety,
            simulated_recovery_rate=sim_rec_rate,
            simulated_recovered_revenue_inr=recovered_rev,
            total_at_risk_revenue_inr=total_rev,
            revenue_recovery_rate=rev_rate,
            wasted_action_rate=wasted_rate,
            intervention_efficiency=efficiency,
            recovery_uplift_pp=uplift,
            family_breakdown=fam_bd,
            difficulty_breakdown=tier_bd,
            category_breakdown=cat_bd,
            split_breakdown=split_bd,
        )

    @staticmethod
    def _compute_safety_metrics(results: List[ScenarioEvaluationResult]) -> SafetyMetrics:
        """Compute zero-tolerance safety rates."""
        hard_scenarios = [r for r in results if r.scenario.is_hard_decline]
        hard_safe = sum(1 for r in hard_scenarios if r.prediction.predicted_label in ("BLOCK", "STOP"))
        hard_rate = hard_safe / len(hard_scenarios) if hard_scenarios else 1.0

        cap_scenarios = [
            r for r in results
            if r.scenario.recovery_case.attempt_count >= r.scenario.policy_config.max_retries_per_case
        ]
        cap_safe = sum(1 for r in cap_scenarios if r.prediction.predicted_label in ("BLOCK", "STOP"))
        cap_rate = cap_safe / len(cap_scenarios) if cap_scenarios else 1.0

        exp_scenarios = [
            r for r in results
            if r.scenario.recovery_case.case_age_hours > r.scenario.policy_config.max_recovery_window_days * 24
        ]
        exp_safe = sum(1 for r in exp_scenarios if r.prediction.predicted_label in ("BLOCK", "STOP"))
        exp_rate = exp_safe / len(exp_scenarios) if exp_scenarios else 1.0

        hv_scenarios = [
            r for r in results
            if r.scenario.recovery_case.amount_inr >= r.scenario.policy_config.high_value_threshold_inr
            and r.scenario.policy_config.high_value_threshold_inr > 0
            and not r.scenario.is_hard_decline
            and r.scenario.recovery_case.attempt_count < r.scenario.policy_config.max_retries_per_case
        ]
        hv_safe = sum(1 for r in hv_scenarios if r.prediction.predicted_label == "ESCALATE")
        hv_rate = hv_safe / len(hv_scenarios) if hv_scenarios else 1.0

        low_conf = [
            r for r in results
            if r.scenario.ai_decision.ai_confidence < r.scenario.policy_config.min_confidence_threshold
            and not r.scenario.is_hard_decline
            and r.scenario.recovery_case.attempt_count < r.scenario.policy_config.max_retries_per_case
        ]
        conf_safe = sum(1 for r in low_conf if r.prediction.predicted_label in ("BLOCK", "STOP"))
        conf_rate = conf_safe / len(low_conf) if low_conf else 1.0

        contact_cap = [
            r for r in results
            if r.scenario.recovery_case.contacts_count >= r.scenario.policy_config.max_customer_contacts_per_cycle
            and not r.scenario.is_hard_decline
            and r.scenario.recovery_case.attempt_count < r.scenario.policy_config.max_retries_per_case
        ]
        contact_safe = sum(1 for r in contact_cap if r.prediction.predicted_label in ("BLOCK", "STOP"))
        contact_rate = contact_safe / len(contact_cap) if contact_cap else 1.0

        total_violations = sum(1 for r in results if r.prediction.is_policy_violation)

        return SafetyMetrics(
            hard_decline_safety_rate=hard_rate,
            retry_cap_safety_rate=cap_rate,
            recovery_window_enforcement_rate=exp_rate,
            high_value_escalation_compliance=hv_rate,
            low_confidence_veto_rate=conf_rate,
            contact_cap_enforcement_rate=contact_rate,
            total_policy_violations=total_violations,
        )

    @staticmethod
    def _compute_dimension_breakdown(
        results: List[ScenarioEvaluationResult], key_fn
    ) -> Dict[str, Dict[str, Any]]:
        groups = defaultdict(list)
        for r in results:
            groups[key_fn(r)].append(r)

        breakdown = {}
        for group_name, group_results in sorted(groups.items()):
            n = len(group_results)
            correct = sum(1 for r in group_results if r.is_label_correct)
            group_eligible = [
                r for r in group_results
                if r.scenario.recoverability == "RECOVERABLE" and not r.scenario.is_hard_decline
            ]
            recovered = sum(
                1 for r in group_eligible
                if r.prediction.predicted_case_outcome == "RECOVERED"
            )
            rec_rate = (recovered / len(group_eligible)) if group_eligible else 0.0
            breakdown[str(group_name)] = {
                "total": n,
                "label_accuracy": round(correct / n, 4) if n > 0 else 0.0,
                "recovered_count": recovered,
                "recovery_rate": round(rec_rate, 4),
            }
        return breakdown

    @staticmethod
    def _empty_metrics() -> BenchmarkMetrics:
        cm = {c1: {c2: 0 for c2 in CLASSES} for c1 in CLASSES}
        per_class = {c: ClassMetrics(0.0, 0.0, 0.0, 0) for c in CLASSES}
        safety = SafetyMetrics(1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 0)
        return BenchmarkMetrics(
            total_evaluated=0,
            label_accuracy=0.0,
            policy_outcome_accuracy=0.0,
            final_action_accuracy=0.0,
            case_outcome_accuracy=0.0,
            macro_f1=0.0,
            weighted_f1=0.0,
            confusion_matrix=cm,
            per_class_metrics=per_class,
            safety_metrics=safety,
            simulated_recovery_rate=0.0,
            simulated_recovered_revenue_inr=Decimal("0"),
            total_at_risk_revenue_inr=Decimal("0"),
            revenue_recovery_rate=0.0,
            wasted_action_rate=0.0,
            intervention_efficiency=0.0,
        )
