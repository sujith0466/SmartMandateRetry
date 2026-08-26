"""Leakage-safe entity-grouped dataset splitter for Phase 16.

Strategy:
- Group by synthetic_customer_id (each customer lands in exactly one split)
- Sort customers by seed-stable hash (deterministic)
- Assign: first 70% -> TRAIN, next 15% -> VALIDATION, last 15% -> TEST
- All scenarios for a customer inherit its split assignment

This guarantees:
1. Zero cross-split entity leakage
2. Deterministic results for same seed + same scenarios
3. Approximate TRAIN/VAL/TEST proportions across families and tiers
"""

from __future__ import annotations

from collections import defaultdict
from typing import Dict, List, Tuple

from app.evaluation.scenario_schema import SyntheticScenario
from app.evaluation.seed_manager import SeedManager


class DatasetSplitter:
    """Assigns TRAIN/VALIDATION/TEST splits to generated scenarios.

    Uses entity-grouped splitting by synthetic_customer_id.
    All operations are deterministic given the same SeedManager.
    """

    TRAIN_RATIO = 0.70
    VALIDATION_RATIO = 0.15
    TEST_RATIO = 0.15

    def __init__(self, seed_manager: SeedManager) -> None:
        self._sm = seed_manager

    def split(self, scenarios: List[SyntheticScenario]) -> List[SyntheticScenario]:
        """Assign dataset_split to each scenario using entity-grouped splitting.

        Args:
            scenarios: Unsplit scenarios from ScenarioGenerator.

        Returns:
            New list of scenarios with dataset_split assigned.
        """
        # 1. Collect unique customer IDs
        customer_ids = sorted(set(s.synthetic_customer_id for s in scenarios))

        # 2. Sort customers by seed-stable hash (deterministic)
        customer_ids_sorted = sorted(
            customer_ids, key=lambda cid: self._sm.customer_sort_key(cid)
        )

        # 3. Compute split boundaries
        n = len(customer_ids_sorted)
        train_end = int(n * self.TRAIN_RATIO)
        val_end = train_end + int(n * self.VALIDATION_RATIO)

        # 4. Assign each customer to a split
        customer_split: Dict[str, str] = {}
        for i, cid in enumerate(customer_ids_sorted):
            if i < train_end:
                customer_split[cid] = "TRAIN"
            elif i < val_end:
                customer_split[cid] = "VALIDATION"
            else:
                customer_split[cid] = "TEST"

        # 5. Return scenarios with updated dataset_split
        result: List[SyntheticScenario] = []
        for s in scenarios:
            split = customer_split.get(s.synthetic_customer_id, "TRAIN")
            # Rebuild with the assigned split (Pydantic model_copy)
            updated = s.model_copy(update={"dataset_split": split})
            result.append(updated)

        return result

    def compute_split_stats(
        self, scenarios: List[SyntheticScenario]
    ) -> Dict[str, Dict[str, int]]:
        """Compute split statistics for verification.

        Returns:
            Dict with keys 'split_counts', 'family_by_split', 'tier_by_split'.
        """
        split_counts: Dict[str, int] = defaultdict(int)
        family_by_split: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))
        tier_by_split: Dict[str, Dict[str, int]] = defaultdict(lambda: defaultdict(int))

        for s in scenarios:
            split_counts[s.dataset_split] += 1
            family_by_split[s.dataset_split][s.scenario_family] += 1
            tier_by_split[s.dataset_split][s.difficulty_tier] += 1

        return {
            "split_counts": dict(split_counts),
            "family_by_split": {k: dict(v) for k, v in family_by_split.items()},
            "tier_by_split": {k: dict(v) for k, v in tier_by_split.items()},
        }

    def verify_no_leakage(self, scenarios: List[SyntheticScenario]) -> bool:
        """Verify that no customer_id appears in more than one split.

        Returns:
            True if no leakage; False if leakage detected.
        """
        customer_splits: Dict[str, set] = defaultdict(set)
        for s in scenarios:
            customer_splits[s.synthetic_customer_id].add(s.dataset_split)

        for cid, splits in customer_splits.items():
            if len(splits) > 1:
                return False
        return True

    def get_split_proportions(
        self, scenarios: List[SyntheticScenario]
    ) -> Dict[str, float]:
        """Compute actual split proportions."""
        n = len(scenarios)
        if n == 0:
            return {}
        counts: Dict[str, int] = defaultdict(int)
        for s in scenarios:
            counts[s.dataset_split] += 1
        return {split: count / n for split, count in counts.items()}
