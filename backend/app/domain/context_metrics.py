"""Deterministic metric calculation engine for customer recovery context."""

from datetime import datetime, timezone
from decimal import Decimal, ROUND_HALF_UP
from typing import Optional, Tuple


class DerivedMetricCalculator:
    """Calculates rates, confidence tiers, and age metrics deterministically."""

    @staticmethod
    def calculate_success_rate(success_count: int, total_count: int) -> Decimal:
        """
        Calculate success rate as Decimal between 0.00 and 1.00.
        Returns 1.00 if total_count == 0 (no failures yet).
        """
        if total_count <= 0:
            return Decimal("1.00")
        if success_count <= 0:
            return Decimal("0.00")
        rate = Decimal(success_count) / Decimal(total_count)
        return rate.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @staticmethod
    def calculate_recovery_rate(recovered_count: int, total_cases: int) -> Optional[Decimal]:
        """
        Calculate recovery rate across prior recovery cases.
        Returns None if total_cases == 0.
        """
        if total_cases <= 0:
            return None
        if recovered_count <= 0:
            return Decimal("0.00")
        rate = Decimal(recovered_count) / Decimal(total_cases)
        return rate.quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    @staticmethod
    def evaluate_confidence_tier(sample_size: int) -> str:
        """
        Determine data confidence tier based on sample size:
        - sample_size >= 5: HIGH
        - 1 <= sample_size < 5: LOW
        - sample_size == 0: INSUFFICIENT
        """
        if sample_size >= 5:
            return "HIGH"
        elif sample_size >= 1:
            return "LOW"
        return "INSUFFICIENT"

    @staticmethod
    def calculate_age_hours(created_at: Optional[datetime], now: Optional[datetime] = None) -> int:
        """Calculate age in integer hours, handling None safely."""
        if not created_at:
            return 0
        current_time = now or datetime.now(timezone.utc)
        delta = current_time - created_at
        return max(0, int(delta.total_seconds() // 3600))

    @staticmethod
    def calculate_age_days(created_at: Optional[datetime], now: Optional[datetime] = None) -> int:
        """Calculate age in integer days, handling None safely."""
        if not created_at:
            return 0
        current_time = now or datetime.now(timezone.utc)
        delta = current_time - created_at
        return max(0, int(delta.total_seconds() // 86400))
