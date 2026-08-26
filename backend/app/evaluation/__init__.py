"""Phase 16 — Synthetic Scenario Generator & Benchmark Dataset Split.

This package provides deterministic, leakage-safe synthetic evaluation
scenario generation. It imports domain contracts read-only and never
modifies Phase 2-15 business logic.
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
]
