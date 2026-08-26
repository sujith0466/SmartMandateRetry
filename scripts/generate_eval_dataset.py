#!/usr/bin/env python3
"""Phase 16 — Synthetic Evaluation Dataset Generator CLI.

Usage:
    python scripts/generate_eval_dataset.py --seed 42 --n-scenarios 5000 --output datasets/
    python scripts/generate_eval_dataset.py --seed 42 --n-scenarios 100 --output datasets/quick/
    python scripts/generate_eval_dataset.py --validate datasets/eval_dataset_42_5000.json

Security contract:
    - NEVER reads real customer/payment/merchant data
    - NEVER reads .env or any secrets
    - NEVER connects to a database or external service
    - NEVER uses wall-clock time for scenario generation
    - All generated IDs are prefixed with synth_ or syn_
    - Generated files land in datasets/ (gitignored; never committed)
"""

import argparse
import os
import sys
import time

# Ensure backend/ is on the Python path when run from repository root
_REPO_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_BACKEND = os.path.join(_REPO_ROOT, "backend")
if _BACKEND not in sys.path:
    sys.path.insert(0, _BACKEND)

from app.evaluation.dataset_manifest import DatasetManifestManager
from app.evaluation.dataset_splitter import DatasetSplitter
from app.evaluation.scenario_generator import ScenarioGenerator
from app.evaluation.seed_manager import SeedManager


def cmd_generate(seed: int, n_scenarios: int, output: str) -> int:
    """Generate a synthetic evaluation dataset and write a manifest file.

    Returns:
        0 on success, 1 on failure.
    """
    print(f"Phase 16 Synthetic Scenario Generator")
    print(f"  Seed:        {seed}")
    print(f"  Scenarios:   {n_scenarios}")
    print(f"  Output dir:  {output}")
    print()

    start = time.monotonic()

    # 1. Initialize seed manager
    sm = SeedManager(master_seed=seed)

    # 2. Generate scenarios (unsplit)
    generator = ScenarioGenerator(seed_manager=sm)
    n_customers = max(50, n_scenarios // 10)   # ~10% of scenarios as customers
    n_merchants = max(5, n_scenarios // 250)   # ~0.4% as merchants
    print(f"  Generating {n_scenarios} scenarios...")
    scenarios = generator.generate(
        n_scenarios=n_scenarios,
        n_customers=n_customers,
        n_merchants=n_merchants,
    )

    # 3. Assign splits (entity-grouped, leakage-safe)
    splitter = DatasetSplitter(seed_manager=sm)
    print(f"  Assigning dataset splits (entity-grouped, seed-stable)...")
    scenarios = splitter.split(scenarios)

    # 4. Verify no leakage
    if not splitter.verify_no_leakage(scenarios):
        print("ERROR: Leakage detected — a customer appears in multiple splits!", file=sys.stderr)
        return 1

    # 5. Build manifest
    manager = DatasetManifestManager()
    manifest = manager.build(
        seed=seed,
        scenarios=scenarios,
        generation_config={
            "n_scenarios": n_scenarios,
            "n_customers": n_customers,
            "n_merchants": n_merchants,
            "seed": seed,
        },
    )

    # 6. Validate manifest integrity
    try:
        manager.validate(manifest)
    except ValueError as e:
        print(f"ERROR: Manifest validation failed: {e}", file=sys.stderr)
        return 1

    # 7. Save to disk
    filepath = manager.save(manifest, output_dir=output)
    elapsed = time.monotonic() - start

    # 8. Print summary
    manager.print_summary(manifest)

    # 9. Verify leakage and show split stats
    stats = splitter.compute_split_stats(scenarios)
    print(f"  Leakage check:    PASSED (no customer in multiple splits)")
    print(f"  Generation time:  {elapsed:.2f}s")
    print(f"  Manifest saved:   {filepath}")

    if elapsed > 10.0:
        print(f"  WARNING: Generation took {elapsed:.2f}s (target <10s for 5000 scenarios)")

    return 0


def cmd_validate(manifest_path: str) -> int:
    """Validate an existing manifest file.

    Returns:
        0 on success, 1 on failure.
    """
    print(f"Validating manifest: {manifest_path}")

    manager = DatasetManifestManager()
    try:
        manifest = manager.load(manifest_path)
    except FileNotFoundError as e:
        print(f"ERROR: {e}", file=sys.stderr)
        return 1
    except (ValueError, Exception) as e:
        print(f"ERROR: Manifest validation failed: {e}", file=sys.stderr)
        return 1

    manager.print_summary(manifest)
    print(f"  Validation: PASSED")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Phase 16 — Synthetic Evaluation Dataset Generator",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    subparsers = parser.add_subparsers(dest="command")

    # Generate subcommand (default)
    gen_parser = parser.add_argument_group("generate options")
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Master random seed for deterministic generation (default: 42)",
    )
    parser.add_argument(
        "--n-scenarios",
        type=int,
        default=5000,
        help="Number of scenarios to generate (default: 5000)",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="datasets/",
        help="Output directory for manifest file (default: datasets/)",
    )
    parser.add_argument(
        "--validate",
        type=str,
        default=None,
        metavar="MANIFEST_PATH",
        help="Validate an existing manifest file instead of generating",
    )

    args = parser.parse_args()

    if args.validate:
        return cmd_validate(args.validate)
    else:
        if args.n_scenarios < 1:
            print("ERROR: --n-scenarios must be >= 1", file=sys.stderr)
            return 1
        return cmd_generate(
            seed=args.seed,
            n_scenarios=args.n_scenarios,
            output=args.output,
        )


if __name__ == "__main__":
    sys.exit(main())
