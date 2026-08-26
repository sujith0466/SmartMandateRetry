"""Tests for Phase 16 DatasetManifest — serialization, deserialization, integrity."""

import json
import os
import tempfile
import pytest

from app.evaluation.dataset_manifest import DatasetManifestManager
from app.evaluation.dataset_splitter import DatasetSplitter
from app.evaluation.scenario_generator import ScenarioGenerator
from app.evaluation.seed_manager import SeedManager


def make_manifest(seed: int = 42, n: int = 100):
    sm = SeedManager(seed)
    gen = ScenarioGenerator(sm)
    scenarios = gen.generate(n_scenarios=n, n_customers=max(10, n // 10))
    splitter = DatasetSplitter(sm)
    scenarios = splitter.split(scenarios)
    manager = DatasetManifestManager()
    return manager.build(seed=seed, scenarios=scenarios), manager


class TestManifestBuild:
    def test_manifest_total_matches_scenarios(self):
        manifest, _ = make_manifest(n=100)
        assert manifest.total_scenarios == len(manifest.scenarios)
        assert manifest.total_scenarios == 100

    def test_manifest_split_counts_sum_matches_total(self):
        manifest, _ = make_manifest(n=100)
        assert sum(manifest.split_counts.values()) == manifest.total_scenarios

    def test_manifest_family_distribution_matches(self):
        from collections import Counter
        manifest, _ = make_manifest(n=200)
        actual = dict(Counter(s.scenario_family for s in manifest.scenarios))
        assert actual == manifest.family_distribution

    def test_manifest_tier_distribution_matches(self):
        from collections import Counter
        manifest, _ = make_manifest(n=200)
        actual = dict(Counter(s.difficulty_tier for s in manifest.scenarios))
        assert actual == manifest.tier_distribution

    def test_manifest_seed_preserved(self):
        manifest, _ = make_manifest(seed=42, n=50)
        assert manifest.generation_seed == 42

    def test_manifest_version_set(self):
        manifest, _ = make_manifest(n=50)
        assert manifest.manifest_version == "1.0"
        assert manifest.phase_16_version == "1.0.0"


class TestManifestSerialization:
    def test_manifest_saves_to_json(self):
        manifest, manager = make_manifest(n=50)
        with tempfile.TemporaryDirectory() as tmpdir:
            path = manager.save(manifest, output_dir=tmpdir)
            assert os.path.exists(path)
            assert path.endswith(".json")

    def test_saved_json_is_valid(self):
        manifest, manager = make_manifest(n=50)
        with tempfile.TemporaryDirectory() as tmpdir:
            path = manager.save(manifest, output_dir=tmpdir)
            with open(path, "r") as f:
                data = json.load(f)
            assert "scenarios" in data
            assert "total_scenarios" in data
            assert len(data["scenarios"]) == 50

    def test_filename_encodes_seed_and_count(self):
        manifest, manager = make_manifest(seed=99, n=50)
        with tempfile.TemporaryDirectory() as tmpdir:
            path = manager.save(manifest, output_dir=tmpdir)
            filename = os.path.basename(path)
            assert "99" in filename   # seed
            assert "50" in filename   # n_scenarios


class TestManifestDeserialization:
    def test_load_roundtrip(self):
        manifest, manager = make_manifest(seed=42, n=50)
        with tempfile.TemporaryDirectory() as tmpdir:
            path = manager.save(manifest, output_dir=tmpdir)
            loaded = manager.load(path)
        assert loaded.total_scenarios == manifest.total_scenarios
        assert loaded.generation_seed == manifest.generation_seed
        assert len(loaded.scenarios) == len(manifest.scenarios)

    def test_load_scenario_ids_preserved(self):
        manifest, manager = make_manifest(seed=42, n=50)
        with tempfile.TemporaryDirectory() as tmpdir:
            path = manager.save(manifest, output_dir=tmpdir)
            loaded = manager.load(path)
        original_ids = [s.scenario_id for s in manifest.scenarios]
        loaded_ids = [s.scenario_id for s in loaded.scenarios]
        assert original_ids == loaded_ids

    def test_load_nonexistent_raises(self):
        manager = DatasetManifestManager()
        with pytest.raises(FileNotFoundError):
            manager.load("/nonexistent/path/manifest.json")


class TestManifestIntegrity:
    def test_validate_passes_on_valid_manifest(self):
        manifest, manager = make_manifest(n=100)
        # Should not raise
        manager.validate(manifest)

    def test_validate_fails_on_wrong_total(self):
        manifest, manager = make_manifest(n=50)
        # Manually corrupt total_scenarios
        corrupted = manifest.model_copy(update={"total_scenarios": 999})
        with pytest.raises(ValueError, match="total_scenarios"):
            manager.validate(corrupted)

    def test_validate_fails_on_wrong_split_counts(self):
        manifest, manager = make_manifest(n=50)
        corrupted = manifest.model_copy(update={"split_counts": {"TRAIN": 99, "VALIDATION": 0, "TEST": 0}})
        with pytest.raises(ValueError):
            manager.validate(corrupted)

    def test_deterministic_byte_identical_manifests(self):
        """Same seed must produce byte-identical JSON output."""
        def build_json(seed, n):
            sm = SeedManager(seed)
            gen = ScenarioGenerator(sm)
            scenarios = gen.generate(n_scenarios=n, n_customers=max(10, n // 10))
            splitter = DatasetSplitter(sm)
            scenarios = splitter.split(scenarios)
            manager = DatasetManifestManager()
            manifest = manager.build(seed=seed, scenarios=scenarios)
            return json.dumps(manifest.to_dict(), ensure_ascii=False, sort_keys=True)

        json1 = build_json(42, 100)
        json2 = build_json(42, 100)
        assert json1 == json2, "Same seed must produce byte-identical JSON manifest"

    def test_checksum_deterministic(self):
        manifest1, manager1 = make_manifest(seed=42, n=50)
        manifest2, manager2 = make_manifest(seed=42, n=50)
        assert manager1.compute_checksum(manifest1) == manager2.compute_checksum(manifest2)

    def test_checksum_changes_on_scenario_mutation(self):
        manifest1, manager = make_manifest(seed=42, n=50)
        chk1 = manager.compute_checksum(manifest1)
        # Modify scenario field in copy
        manifest2 = manifest1.model_copy(deep=True)
        manifest2.scenarios[0].customer_profile.tenure_months += 1
        chk2 = manager.compute_checksum(manifest2)
        assert chk1 != chk2, "Mutating a scenario field must change the full manifest checksum"
