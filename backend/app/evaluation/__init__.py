"""Phase 16 & 17 — Evaluation Subsystem.

Phase 16: Synthetic Scenario Generator & Benchmark Dataset Split
Phase 17: Comparative Benchmark Runner & Evaluation Engine
"""

from app.evaluation.scenario_schema import (
    SyntheticScenario,
    SyntheticPolicyConfig,
    SyntheticCustomerProfile,
    SyntheticRecoveryCase,
    SyntheticAIDecision,
    DatasetManifest,
)
from app.evaluation.seed_manager import SeedManager
from app.evaluation.scenario_generator import ScenarioGenerator
from app.evaluation.dataset_splitter import DatasetSplitter
from app.evaluation.dataset_manifest import DatasetManifestManager
from app.evaluation.evaluation_modes import (
    EvaluationMode,
    EvaluationPrediction,
    BaseEvaluator,
    SmartMandateEvaluator,
    RazorpayNativeEvaluator,
    RuleBasedEvaluator,
    AIUnguardedEvaluator,
    get_evaluator,
)
from app.evaluation.metrics import (
    BenchmarkMetrics,
    ClassMetrics,
    SafetyMetrics,
    ScenarioEvaluationResult,
    MetricsCalculator,
)
from app.evaluation.evaluation_engine import EvaluationEngine
from app.evaluation.persistence import EvaluationPersistenceService
from app.evaluation.report import BenchmarkReportGenerator
from app.evaluation.benchmark_runner import BenchmarkRunner

__all__ = [
    "SyntheticScenario",
    "SyntheticPolicyConfig",
    "SyntheticCustomerProfile",
    "SyntheticRecoveryCase",
    "SyntheticAIDecision",
    "DatasetManifest",
    "SeedManager",
    "ScenarioGenerator",
    "DatasetSplitter",
    "DatasetManifestManager",
    "EvaluationMode",
    "EvaluationPrediction",
    "BaseEvaluator",
    "SmartMandateEvaluator",
    "RazorpayNativeEvaluator",
    "RuleBasedEvaluator",
    "AIUnguardedEvaluator",
    "get_evaluator",
    "BenchmarkMetrics",
    "ClassMetrics",
    "SafetyMetrics",
    "ScenarioEvaluationResult",
    "MetricsCalculator",
    "EvaluationEngine",
    "EvaluationPersistenceService",
    "BenchmarkReportGenerator",
    "BenchmarkRunner",
]
