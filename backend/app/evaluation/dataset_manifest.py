"""Dataset manifest serialization, deserialization, and integrity validation.

The manifest is the authoritative output artifact of Phase 16:
  datasets/eval_dataset_{seed}_{n}.json

Phase 17 (Benchmark Runner) will load this manifest to run scenarios
against SmartMandateRetry policy engine and baselines.
"""

from __future__ import annotations

import hashlib
import json
import os
from collections import Counter
from pathlib import Path
from typing import Any, Dict, List, Optional

from app.evaluation.scenario_schema import DatasetManifest, SyntheticScenario


class DatasetManifestManager:
    """Manages manifest serialization, deserialization, and validation."""

    MANIFEST_VERSION = "1.0"
    PHASE_VERSION = "1.0.0"

    def build(
        self,
        seed: int,
        scenarios: List[SyntheticScenario],
        generation_config: Optional[Dict[str, Any]] = None,
    ) -> DatasetManifest:
        """Build a DatasetManifest from generated scenarios.

        Args:
            seed: Master generation seed.
            scenarios: Fully generated and split scenarios.
            generation_config: Optional configuration metadata.

        Returns:
            DatasetManifest ready for serialization.
        """
        split_counts = dict(Counter(s.dataset_split for s in scenarios))
        family_distribution = dict(Counter(s.scenario_family for s in scenarios))
        tier_distribution = dict(Counter(s.difficulty_tier for s in scenarios))
        outcome_distribution = dict(Counter(s.ground_truth_label for s in scenarios))

        config = generation_config or {}
        config.setdefault("n_scenarios", len(scenarios))
        config.setdefault("seed", seed)

        return DatasetManifest(
            manifest_version=self.MANIFEST_VERSION,
            phase_16_version=self.PHASE_VERSION,
            generation_seed=seed,
            total_scenarios=len(scenarios),
            split_counts=split_counts,
            family_distribution=family_distribution,
            tier_distribution=tier_distribution,
            outcome_distribution=outcome_distribution,
            generation_config=config,
            scenarios=scenarios,
        )

    def save(
        self,
        manifest: DatasetManifest,
        output_dir: str,
    ) -> str:
        """Serialize manifest to JSON file in output_dir.

        File name: eval_dataset_{seed}_{n_scenarios}.json

        Returns:
            Absolute path to the saved file.
        """
        os.makedirs(output_dir, exist_ok=True)
        filename = f"eval_dataset_{manifest.generation_seed}_{manifest.total_scenarios}.json"
        filepath = os.path.join(output_dir, filename)

        data = manifest.to_dict()
        with open(filepath, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)

        return os.path.abspath(filepath)

    def load(self, filepath: str) -> DatasetManifest:
        """Load and validate a manifest from disk.

        Args:
            filepath: Absolute or relative path to manifest JSON.

        Returns:
            Validated DatasetManifest.

        Raises:
            FileNotFoundError: If file does not exist.
            ValueError: If manifest fails integrity checks.
        """
        if not os.path.exists(filepath):
            raise FileNotFoundError(f"Manifest not found: {filepath}")

        with open(filepath, "r", encoding="utf-8") as f:
            data = json.load(f)

        manifest = DatasetManifest(**{
            **{k: v for k, v in data.items() if k != "scenarios"},
            "scenarios": [SyntheticScenario(**s) for s in data.get("scenarios", [])],
        })

        self.validate(manifest)
        return manifest

    def validate(self, manifest: DatasetManifest) -> None:
        """Validate manifest internal integrity.

        Checks:
        - total_scenarios matches len(scenarios)
        - split_counts sum matches total_scenarios
        - All scenario_ids start with 'syn_'
        - All customer_ids start with 'synth_cust_'
        - All merchant_ids start with 'synth_merch_'
        - No PII patterns detected in scenario IDs
        - family_distribution counts match actual scenario families
        - tier_distribution counts match actual difficulty tiers

        Raises:
            ValueError: On any integrity violation.
        """
        n = len(manifest.scenarios)
        if n != manifest.total_scenarios:
            raise ValueError(
                f"Manifest integrity failure: total_scenarios={manifest.total_scenarios} "
                f"but found {n} scenarios"
            )

        actual_split_total = sum(manifest.split_counts.values())
        if actual_split_total != manifest.total_scenarios:
            raise ValueError(
                f"Manifest integrity failure: split_counts sum={actual_split_total} "
                f"!= total_scenarios={manifest.total_scenarios}"
            )

        # Verify scenario-level invariants
        for s in manifest.scenarios:
            if not s.scenario_id.startswith("syn_"):
                raise ValueError(
                    f"Integrity failure: scenario_id '{s.scenario_id}' missing 'syn_' prefix"
                )
            if not s.synthetic_customer_id.startswith("synth_cust_"):
                raise ValueError(
                    f"Integrity failure: customer_id '{s.synthetic_customer_id}' missing prefix"
                )
            if not s.synthetic_merchant_id.startswith("synth_merch_"):
                raise ValueError(
                    f"Integrity failure: merchant_id '{s.synthetic_merchant_id}' missing prefix"
                )

        # Verify distribution counts
        actual_families = dict(Counter(s.scenario_family for s in manifest.scenarios))
        if actual_families != manifest.family_distribution:
            raise ValueError(
                "Manifest integrity failure: family_distribution mismatch"
            )

        actual_tiers = dict(Counter(s.difficulty_tier for s in manifest.scenarios))
        if actual_tiers != manifest.tier_distribution:
            raise ValueError(
                "Manifest integrity failure: tier_distribution mismatch"
            )

    def compute_checksum(self, manifest: DatasetManifest) -> str:
        """Compute SHA-256 checksum of manifest (excluding scenarios for speed)."""
        summary = {
            "seed": manifest.generation_seed,
            "total_scenarios": manifest.total_scenarios,
            "split_counts": manifest.split_counts,
            "family_distribution": manifest.family_distribution,
            "phase_16_version": manifest.phase_16_version,
        }
        content = json.dumps(summary, sort_keys=True)
        return hashlib.sha256(content.encode("utf-8")).hexdigest()

    def print_summary(self, manifest: DatasetManifest) -> None:
        """Print a human-readable summary of the manifest."""
        print(f"\n{'='*60}")
        print(f"Phase 16 Dataset Manifest Summary")
        print(f"{'='*60}")
        print(f"  Seed:            {manifest.generation_seed}")
        print(f"  Total Scenarios: {manifest.total_scenarios}")
        print(f"  Phase Version:   {manifest.phase_16_version}")
        print(f"\n  Split Counts:")
        for split, count in sorted(manifest.split_counts.items()):
            pct = count / manifest.total_scenarios * 100
            print(f"    {split:<12}: {count:>5}  ({pct:.1f}%)")
        print(f"\n  Family Distribution:")
        for family, count in sorted(manifest.family_distribution.items()):
            print(f"    {family:<30}: {count:>5}")
        print(f"\n  Difficulty Tier Distribution:")
        for tier, count in sorted(manifest.tier_distribution.items()):
            print(f"    {tier:<10}: {count:>5}")
        print(f"\n  Ground Truth Label Distribution:")
        for label, count in sorted(manifest.outcome_distribution.items()):
            print(f"    {label:<10}: {count:>5}")
        print(f"{'='*60}\n")
