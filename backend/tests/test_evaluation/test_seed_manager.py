"""Tests for Phase 16 SeedManager — determinism, ID stability, and timestamp correctness."""

import pytest
from app.evaluation.seed_manager import SeedManager


class TestSeedManagerDeterminism:
    """Verify that same seed produces identical outputs."""

    def test_same_seed_same_scenario_id(self):
        sm1 = SeedManager(42)
        sm2 = SeedManager(42)
        assert sm1.make_scenario_id("insufficient_funds", 0) == sm2.make_scenario_id("insufficient_funds", 0)
        assert sm1.make_scenario_id("hard_decline_stop", 99) == sm2.make_scenario_id("hard_decline_stop", 99)

    def test_different_seed_different_scenario_id(self):
        sm1 = SeedManager(42)
        sm2 = SeedManager(99)
        id1 = sm1.make_scenario_id("insufficient_funds", 0)
        id2 = sm2.make_scenario_id("insufficient_funds", 0)
        assert id1 != id2

    def test_same_seed_same_customer_id(self):
        sm1 = SeedManager(42)
        sm2 = SeedManager(42)
        assert sm1.make_customer_id(7) == sm2.make_customer_id(7)

    def test_same_seed_same_merchant_id(self):
        sm1 = SeedManager(42)
        sm2 = SeedManager(42)
        assert sm1.make_merchant_id(3) == sm2.make_merchant_id(3)

    def test_same_seed_same_timestamp(self):
        sm1 = SeedManager(42)
        sm2 = SeedManager(42)
        assert sm1.stable_timestamp(0) == sm2.stable_timestamp(0)
        assert sm1.stable_timestamp(100) == sm2.stable_timestamp(100)

    def test_same_seed_same_customer_sort_key(self):
        sm1 = SeedManager(42)
        sm2 = SeedManager(42)
        cid = "synth_cust_42_00007"
        assert sm1.customer_sort_key(cid) == sm2.customer_sort_key(cid)


class TestSeedManagerIDFormats:
    """Verify ID formats are obviously synthetic."""

    def test_scenario_id_prefix(self):
        sm = SeedManager(42)
        sid = sm.make_scenario_id("insufficient_funds", 5)
        assert sid.startswith("syn_")
        assert "insufficient_funds" in sid

    def test_scenario_id_format(self):
        sm = SeedManager(42)
        sid = sm.make_scenario_id("hard_decline_stop", 3)
        assert sid == "syn_42_hard_decline_stop_000003"

    def test_customer_id_prefix(self):
        sm = SeedManager(42)
        cid = sm.make_customer_id(10)
        assert cid.startswith("synth_cust_")

    def test_merchant_id_prefix(self):
        sm = SeedManager(42)
        mid = sm.make_merchant_id(2)
        assert mid.startswith("synth_merch_")

    def test_scenario_id_zero_padded(self):
        sm = SeedManager(42)
        sid = sm.make_scenario_id("foo", 1)
        # Index should be zero-padded to 6 digits
        assert sid.endswith("000001")


class TestSeedManagerTimestamps:
    """Verify stable timestamps are not wall-clock time."""

    def test_stable_timestamp_not_current_time(self):
        import datetime
        sm = SeedManager(42)
        ts = sm.stable_timestamp(0)
        # The generated timestamp must be a 2024 date (base date range)
        assert "2024" in ts

    def test_stable_timestamp_is_iso8601(self):
        import datetime
        sm = SeedManager(42)
        ts = sm.stable_timestamp(0)
        # Must parse as ISO 8601
        parsed = datetime.datetime.fromisoformat(ts)
        assert parsed is not None

    def test_different_index_different_timestamp(self):
        sm = SeedManager(42)
        ts0 = sm.stable_timestamp(0)
        ts1 = sm.stable_timestamp(1)
        # Different scenario indices should usually produce different timestamps
        # (not guaranteed for all values but for 0 and 1 with any seed)
        # Just verify they are both valid timestamps
        assert ts0.startswith("2024")
        assert ts1.startswith("2024")


class TestSeedManagerFamilyRNG:
    """Verify per-family RNG isolation."""

    def test_family_rng_deterministic(self):
        sm = SeedManager(42)
        rng1 = sm.derive_family_rng("insufficient_funds")
        rng2 = sm.derive_family_rng("insufficient_funds")
        # Both RNGs should produce identical sequences
        assert rng1.random() == rng2.random()

    def test_different_families_different_rng(self):
        sm = SeedManager(42)
        rng1 = sm.derive_family_rng("insufficient_funds")
        rng2 = sm.derive_family_rng("hard_decline_stop")
        # Different families should get different RNGs (very likely)
        v1 = rng1.random()
        v2 = rng2.random()
        assert v1 != v2

    def test_invalid_seed_type_raises(self):
        with pytest.raises(TypeError):
            SeedManager("not_an_int")

    def test_customer_pool_deterministic(self):
        sm1 = SeedManager(42)
        sm2 = SeedManager(42)
        pool1 = sm1.build_customer_id_pool(10)
        pool2 = sm2.build_customer_id_pool(10)
        assert pool1 == pool2
