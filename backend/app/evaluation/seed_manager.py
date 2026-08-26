"""Deterministic PRNG seed manager for Phase 16 Synthetic Scenario Generator.

Guarantees:
- Same master_seed + same configuration = byte-identical scenario IDs
- Stable timestamps derived from seed, never from wall-clock time
- Per-family RNG isolation prevents family ordering from affecting other families
- All generated IDs are obviously synthetic (prefixed synth_/syn_)
"""

from __future__ import annotations

import hashlib
import random
from datetime import datetime, timedelta, timezone
from typing import Optional


# Base reference date: 2024-01-01 00:00:00 UTC — stable, not wall-clock
_BASE_DATE = datetime(2024, 1, 1, tzinfo=timezone.utc)
_HOURS_IN_YEAR = 365 * 24  # 8760 hours


class SeedManager:
    """Manages deterministic PRNG state for scenario generation.

    All outputs are deterministic given the same master_seed. No calls to
    datetime.now(), time.time(), os.urandom(), or uuid.uuid4() are made.
    """

    def __init__(self, master_seed: int) -> None:
        if not isinstance(master_seed, int):
            raise TypeError(f"master_seed must be int, got {type(master_seed).__name__}")
        self._master_seed = master_seed
        self._rng = random.Random(master_seed)

    @property
    def master_seed(self) -> int:
        return self._master_seed

    # ------------------------------------------------------------------
    # Per-family RNG derivation
    # ------------------------------------------------------------------

    def derive_family_rng(self, family_id: str) -> random.Random:
        """Derive a stable, isolated RNG for a specific scenario family.

        Each family gets its own seeded RNG so that generating one family
        does not affect the outputs of another family.
        """
        # Hash family name to a deterministic integer, XOR with master seed
        family_hash = int(hashlib.md5(family_id.encode("utf-8")).hexdigest(), 16)
        family_seed = (self._master_seed ^ (family_hash % (2**31))) & 0x7FFFFFFF
        return random.Random(family_seed)

    def derive_subkey_rng(self, key: str) -> random.Random:
        """Derive a stable RNG for any named sub-key (e.g. 'customer_pool')."""
        key_hash = int(hashlib.sha256(key.encode("utf-8")).hexdigest(), 16)
        sub_seed = (self._master_seed ^ (key_hash % (2**31))) & 0x7FFFFFFF
        return random.Random(sub_seed)

    # ------------------------------------------------------------------
    # Stable ID generation
    # ------------------------------------------------------------------

    def make_scenario_id(self, family_id: str, index: int) -> str:
        """Generate stable, obviously synthetic scenario ID.

        Format: syn_{seed}_{family}_{index:06d}
        """
        return f"syn_{self._master_seed}_{family_id}_{index:06d}"

    def make_customer_id(self, customer_index: int) -> str:
        """Generate stable synthetic customer ID.

        Format: synth_cust_{seed}_{idx:05d}
        """
        return f"synth_cust_{self._master_seed}_{customer_index:05d}"

    def make_merchant_id(self, merchant_index: int) -> str:
        """Generate stable synthetic merchant ID.

        Format: synth_merch_{seed}_{idx:04d}
        """
        return f"synth_merch_{self._master_seed}_{merchant_index:04d}"

    # ------------------------------------------------------------------
    # Stable timestamp generation (NOT wall-clock time)
    # ------------------------------------------------------------------

    def stable_timestamp(self, scenario_global_index: int) -> str:
        """Return a deterministic ISO 8601 UTC timestamp derived from seed.

        Uses a fixed base date (2024-01-01 UTC) plus a deterministic offset.
        Never reads system time.
        """
        # Derive stable hour offset: mix seed and index with prime multiplier
        offset_hours = (self._master_seed + scenario_global_index * 7) % _HOURS_IN_YEAR
        ts = _BASE_DATE + timedelta(hours=offset_hours)
        return ts.isoformat()

    def stable_date_offset_hours(self, scenario_global_index: int) -> int:
        """Return the stable hour offset for a scenario (useful for testing)."""
        return (self._master_seed + scenario_global_index * 7) % _HOURS_IN_YEAR

    # ------------------------------------------------------------------
    # Customer ID pool (entity-grouped for leakage prevention)
    # ------------------------------------------------------------------

    def build_customer_id_pool(self, n_customers: int) -> list[str]:
        """Build a deterministic pool of synthetic customer IDs.

        These are used as grouping entities for dataset splitting.
        """
        return [self.make_customer_id(i) for i in range(n_customers)]

    # ------------------------------------------------------------------
    # Merchant ID pool
    # ------------------------------------------------------------------

    def build_merchant_id_pool(self, n_merchants: int) -> list[str]:
        """Build a deterministic pool of synthetic merchant IDs."""
        return [self.make_merchant_id(i) for i in range(n_merchants)]

    # ------------------------------------------------------------------
    # Seed-stable hash for ordering (used by splitter)
    # ------------------------------------------------------------------

    def customer_sort_key(self, customer_id: str) -> int:
        """Produce a deterministic, seed-stable sort key for a customer ID.

        Used by DatasetSplitter to produce a stable, deterministic ordering
        of customer IDs before assigning splits.
        """
        combined = f"{self._master_seed}:{customer_id}"
        return int(hashlib.sha256(combined.encode("utf-8")).hexdigest(), 16)
