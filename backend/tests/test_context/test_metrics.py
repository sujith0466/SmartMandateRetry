"""Unit tests for DerivedMetricCalculator."""

from datetime import datetime, timezone, timedelta
from decimal import Decimal
import pytest

from app.domain.context_metrics import DerivedMetricCalculator


def test_calculate_success_rate():
    assert DerivedMetricCalculator.calculate_success_rate(10, 10) == Decimal("1.00")
    assert DerivedMetricCalculator.calculate_success_rate(8, 10) == Decimal("0.80")
    assert DerivedMetricCalculator.calculate_success_rate(0, 5) == Decimal("0.00")
    assert DerivedMetricCalculator.calculate_success_rate(0, 0) == Decimal("1.00")


def test_calculate_recovery_rate():
    assert DerivedMetricCalculator.calculate_recovery_rate(2, 4) == Decimal("0.50")
    assert DerivedMetricCalculator.calculate_recovery_rate(0, 3) == Decimal("0.00")
    assert DerivedMetricCalculator.calculate_recovery_rate(0, 0) is None


def test_evaluate_confidence_tier():
    assert DerivedMetricCalculator.evaluate_confidence_tier(10) == "HIGH"
    assert DerivedMetricCalculator.evaluate_confidence_tier(5) == "HIGH"
    assert DerivedMetricCalculator.evaluate_confidence_tier(4) == "LOW"
    assert DerivedMetricCalculator.evaluate_confidence_tier(1) == "LOW"
    assert DerivedMetricCalculator.evaluate_confidence_tier(0) == "INSUFFICIENT"


def test_calculate_age_hours_and_days():
    now = datetime(2026, 8, 26, 12, 0, 0, tzinfo=timezone.utc)
    created = now - timedelta(hours=36)

    assert DerivedMetricCalculator.calculate_age_hours(created, now=now) == 36
    assert DerivedMetricCalculator.calculate_age_days(created, now=now) == 1
