#!/usr/bin/env python3
"""Phase 17 — Comparative Benchmark Runner & Evaluation Engine CLI.

Usage:
    # Run SmartMandate on TEST split (default)
    python scripts/run_eval_benchmark.py --dataset datasets/eval_dataset_42_5000.json

    # Run comparative benchmark across all 4 modes
    python scripts/run_eval_benchmark.py --dataset datasets/eval_dataset_42_5000.json --compare --output reports/

    # Run specific mode on VALIDATION split with database persistence
    python scripts/run_eval_benchmark.py --dataset datasets/eval_dataset_42_5000.json --split VALIDATION --mode RULE_BASED --persist

    # Validate dataset manifest before execution
    python scripts/run_eval_benchmark.py --validate datasets/eval_dataset_42_5000.json
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

from app.evaluation.benchmark_runner import BenchmarkRunner
from app.evaluation.dataset_manifest import DatasetManifestManager
from app.evaluation.evaluation_modes import EvaluationMode


def cmd_validate(dataset_path: str) -> int:
    """Validate a dataset manifest file."""
    print(f"Validating dataset manifest: {dataset_path}")
    manager = DatasetManifestManager()
    try:
        manifest = manager.load(dataset_path)
    except FileNotFoundError:
        print(f"ERROR: Dataset manifest not found: {dataset_path}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"ERROR: Manifest validation failed: {e}", file=sys.stderr)
        return 1

    manager.print_summary(manifest)
    print("  Validation: PASSED")
    return 0


def cmd_run(
    dataset_path: str,
    split: str,
    mode: str,
    compare: bool,
    persist: bool,
    output: str | None,
) -> int:
    """Execute benchmark evaluation."""
    print("=" * 60)
    print("SmartMandateRetry — Evaluation Benchmark Runner")
    print("=" * 60)
    print(f"  Dataset:     {dataset_path}")
    print(f"  Split:       {split}")
    print(f"  Mode:        {'ALL (Comparative)' if compare else mode}")
    print(f"  Persist:     {persist}")
    print(f"  Output Dir:  {output or '(None)'}")
    print()

    # Load and validate manifest
    manager = DatasetManifestManager()
    try:
        manifest = manager.load(dataset_path)
    except FileNotFoundError:
        print(f"ERROR: Dataset manifest not found: {dataset_path}", file=sys.stderr)
        return 1
    except Exception as e:
        print(f"ERROR: Manifest validation failed: {e}", file=sys.stderr)
        return 1

    if persist:
        from app.infrastructure.database import init_db
        init_db()

    runner = BenchmarkRunner(manifest_manager=manager)
    start = time.monotonic()

    if compare or mode.upper() == "ALL":
        print(f"  Executing comparative evaluation across all 4 modes on '{split}' split...")
        results = runner.run_comparative_benchmark(
            manifest=manifest,
            split=split,
            persist=persist,
            output_dir=output,
        )
        elapsed = time.monotonic() - start

        print(f"\n{'=' * 60}")
        print("COMPARATIVE BENCHMARK SUMMARY")
        print(f"{'=' * 60}")
        print(f"  Total Scenarios Evaluated: {results['total_evaluated']:,}")
        print(f"  Baseline Recovery Rate:    {results['baseline_recovery_rate'] * 100:.2f}%\n")
        print(f"  {'Mode':<20} | {'Accuracy':<10} | {'Recovery Rate':<14} | {'Uplift':<12} | {'Violations':<10}")
        print(f"  {'-'*20}-+-{'-'*10}-+-{'-'*14}-+-{'-'*12}-+-{'-'*10}")

        for m_name, m_val in results["mode_metrics"].items():
            uplift_str = f"+{m_val.recovery_uplift_pp:.2f} pp" if m_val.recovery_uplift_pp is not None else "0.00 pp (Ref)"
            print(
                f"  {m_name:<20} | {m_val.label_accuracy * 100:>9.2f}% | {m_val.simulated_recovery_rate * 100:>13.2f}% | {uplift_str:>12} | {m_val.safety_metrics.total_policy_violations:>10}"
            )
        print(f"{'=' * 60}")

        if results["json_report_path"]:
            print(f"  JSON Report:     {results['json_report_path']}")
        if results["markdown_report_path"]:
            print(f"  Markdown Report: {results['markdown_report_path']}")

    else:
        # Single mode execution
        try:
            eval_mode = EvaluationMode(mode.upper())
        except ValueError:
            print(
                f"ERROR: Invalid evaluation mode '{mode}'. "
                f"Supported modes: {[m.value for m in EvaluationMode]} or ALL",
                file=sys.stderr,
            )
            return 1

        print(f"  Executing '{eval_mode.value}' on '{split}' split...")
        results = runner.run_benchmark(
            manifest=manifest,
            mode=eval_mode,
            split=split,
            persist=persist,
            output_dir=output,
        )
        elapsed = time.monotonic() - start
        m = results["metrics"]

        print(f"\n{'=' * 60}")
        print(f"BENCHMARK RESULTS: {eval_mode.value}")
        print(f"{'=' * 60}")
        print(f"  Total Evaluated:         {m.total_evaluated:,}")
        print(f"  Label Accuracy:          {m.label_accuracy * 100:.2f}%")
        print(f"  Policy Outcome Accuracy: {m.policy_outcome_accuracy * 100:.2f}%")
        print(f"  Final Action Accuracy:   {m.final_action_accuracy * 100:.2f}%")
        print(f"  Case Outcome Accuracy:   {m.case_outcome_accuracy * 100:.2f}%")
        print(f"  Macro F1-Score:          {m.macro_f1:.4f}")
        print(f"  Weighted F1-Score:       {m.weighted_f1:.4f}")
        print(f"  Simulated Recovery Rate: {m.simulated_recovery_rate * 100:.2f}%")
        print(f"  Policy Violations:       {m.safety_metrics.total_policy_violations}")
        print(f"{'=' * 60}")

        if results["json_report_path"]:
            print(f"  JSON Report:     {results['json_report_path']}")
        if results["markdown_report_path"]:
            print(f"  Markdown Report: {results['markdown_report_path']}")
        if results["run_id"]:
            print(f"  Persisted Run ID: {results['run_id']}")

    print(f"  Total Execution Time:    {elapsed:.3f}s")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Phase 17 — Comparative Benchmark Runner & Evaluation Engine",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )

    parser.add_argument(
        "--dataset",
        type=str,
        default="datasets/eval_dataset_42_5000.json",
        help="Path to Phase 16 dataset manifest JSON (default: datasets/eval_dataset_42_5000.json)",
    )
    parser.add_argument(
        "--split",
        type=str,
        default="TEST",
        choices=["TRAIN", "VALIDATION", "TEST", "ALL"],
        help="Dataset split partition to evaluate (default: TEST)",
    )
    parser.add_argument(
        "--mode",
        type=str,
        default="SMART_MANDATE",
        help="Evaluation mode (SMART_MANDATE, RAZORPAY_NATIVE, RULE_BASED, AI_UNGUARDED, ALL). Default: SMART_MANDATE",
    )
    parser.add_argument(
        "--compare",
        action="store_true",
        help="Execute comparative multi-mode evaluation (equivalent to --mode ALL)",
    )
    parser.add_argument(
        "--persist",
        action="store_true",
        help="Persist EvaluationRun and EvaluationScenarioResult records to database",
    )
    parser.add_argument(
        "--output",
        type=str,
        default=None,
        help="Output directory to save JSON and Markdown reports",
    )
    parser.add_argument(
        "--validate",
        type=str,
        default=None,
        metavar="MANIFEST_PATH",
        help="Validate a dataset manifest file and exit",
    )

    args = parser.parse_args()

    if args.validate:
        return cmd_validate(args.validate)
    else:
        return cmd_run(
            dataset_path=args.dataset,
            split=args.split,
            mode=args.mode,
            compare=args.compare,
            persist=args.persist,
            output=args.output,
        )


if __name__ == "__main__":
    sys.exit(main())
