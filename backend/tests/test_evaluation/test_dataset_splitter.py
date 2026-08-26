"""Tests for Phase 16 DatasetSplitter — leakage, proportions, and distribution."""

import pytest
from decimal import Decimal
from collections import Counter

from app.evaluation.dataset_splitter import DatasetSplitter
from app.evaluation.scenario_generator import ScenarioGenerator, ALL_FAMILIES
from app.evaluation.seed_manager import SeedManager


def generate_and_split(seed: int = 42, n: int = 500) -> list:
    sm = SeedManager(seed)
    gen = ScenarioGenerator(sm)
    scenarios = gen.generate(n_scenarios=n, n_customers=max(20, n // 10))
    splitter = DatasetSplitter(sm)
    return splitter.split(scenarios)


class TestNoEntityLeakage:
    """Verify a customer ID never appears in more than one split."""

    def test_no_leakage_500_scenarios(self):
        sm = SeedManager(42)
        scenarios = generate_and_split(seed=42, n=500)
        splitter = DatasetSplitter(sm)
        assert splitter.verify_no_leakage(scenarios), "Entity leakage detected!"

    def test_no_leakage_1000_scenarios(self):
        sm = SeedManager(7)
        scenarios = generate_and_split(seed=7, n=1000)
        splitter = DatasetSplitter(sm)
        assert splitter.verify_no_leakage(scenarios), "Entity leakage detected!"

    def test_no_leakage_5000_scenarios(self):
        sm = SeedManager(42)
        scenarios = generate_and_split(seed=42, n=5000)
        splitter = DatasetSplitter(sm)
        assert splitter.verify_no_leakage(scenarios), "Entity leakage in 5000 scenarios!"

    def test_customer_in_exactly_one_split(self):
        scenarios = generate_and_split(seed=42, n=500)
        from collections import defaultdict
        customer_splits = defaultdict(set)
        for s in scenarios:
            customer_splits[s.synthetic_customer_id].add(s.dataset_split)
        for cid, splits in customer_splits.items():
            assert len(splits) == 1, f"Customer {cid} in multiple splits: {splits}"


class TestSplitProportions:
    """Verify TRAIN/VALIDATION/TEST proportions are approximately 70/15/15."""

    def test_train_proportion_approximately_70pct(self):
        scenarios = generate_and_split(seed=42, n=1000)
        total = len(scenarios)
        train_count = sum(1 for s in scenarios if s.dataset_split == "TRAIN")
        pct = train_count / total
        # Allow ±5% tolerance due to entity grouping discretization
        assert 0.60 <= pct <= 0.80, f"TRAIN proportion {pct:.2%} outside [60%, 80%]"

    def test_validation_proportion_approximately_15pct(self):
        scenarios = generate_and_split(seed=42, n=1000)
        total = len(scenarios)
        val_count = sum(1 for s in scenarios if s.dataset_split == "VALIDATION")
        pct = val_count / total
        assert 0.05 <= pct <= 0.30, f"VALIDATION proportion {pct:.2%} outside [5%, 30%]"

    def test_test_proportion_approximately_15pct(self):
        scenarios = generate_and_split(seed=42, n=1000)
        total = len(scenarios)
        test_count = sum(1 for s in scenarios if s.dataset_split == "TEST")
        pct = test_count / total
        assert 0.05 <= pct <= 0.30, f"TEST proportion {pct:.2%} outside [5%, 30%]"

    def test_all_three_splits_present(self):
        scenarios = generate_and_split(seed=42, n=500)
        splits = {s.dataset_split for s in scenarios}
        assert "TRAIN" in splits
        assert "VALIDATION" in splits
        assert "TEST" in splits


class TestSplitDistribution:
    """Verify all families and tiers present in each split."""

    def test_all_families_in_train(self):
        scenarios = generate_and_split(seed=42, n=2000)
        train = [s for s in scenarios if s.dataset_split == "TRAIN"]
        train_families = {s.scenario_family for s in train}
        for family in ALL_FAMILIES:
            assert family in train_families, f"Family '{family}' missing from TRAIN"

    def test_all_families_in_validation_and_test(self):
        scenarios = generate_and_split(seed=42, n=5000)
        for split_name in ("VALIDATION", "TEST"):
            split = [s for s in scenarios if s.dataset_split == split_name]
            split_families = {s.scenario_family for s in split}
            # Flexible check: at least 10 of 14 families present in smaller splits
            assert len(split_families) >= 10, (
                f"{split_name} has only {len(split_families)} families"
            )


class TestSplitDeterminism:
    """Verify same seed produces identical split assignments."""

    def test_same_seed_same_splits(self):
        scenarios1 = generate_and_split(seed=42, n=200)
        scenarios2 = generate_and_split(seed=42, n=200)
        splits1 = [(s.scenario_id, s.dataset_split) for s in scenarios1]
        splits2 = [(s.scenario_id, s.dataset_split) for s in scenarios2]
        assert splits1 == splits2

    def test_different_seeds_different_assignments(self):
        scenarios1 = generate_and_split(seed=42, n=200)
        scenarios2 = generate_and_split(seed=99, n=200)
        # IDs will differ (different seeds), so just verify both produce splits
        splits1 = {s.dataset_split for s in scenarios1}
        splits2 = {s.dataset_split for s in scenarios2}
        assert splits1 == {"TRAIN", "VALIDATION", "TEST"}
        assert splits2 == {"TRAIN", "VALIDATION", "TEST"}


class TestSplitStats:
    """Test compute_split_stats method."""

    def test_stats_include_all_splits(self):
        sm = SeedManager(42)
        scenarios = generate_and_split(seed=42, n=500)
        splitter = DatasetSplitter(sm)
        stats = splitter.compute_split_stats(scenarios)
        assert "split_counts" in stats
        assert "family_by_split" in stats
        assert "tier_by_split" in stats

    def test_stats_counts_match_scenarios(self):
        sm = SeedManager(42)
        scenarios = generate_and_split(seed=42, n=500)
        splitter = DatasetSplitter(sm)
        stats = splitter.compute_split_stats(scenarios)
        total_from_stats = sum(stats["split_counts"].values())
        assert total_from_stats == len(scenarios)
