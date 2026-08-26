"""Unit tests for MetricsRegistry, label sanitization, and timing instrumentation."""

import time
import pytest

from app.core.correlation import CorrelationContext, generate_correlation_id, get_correlation_id
from app.core.metrics import MetricsRegistry, sanitize_labels
from app.core.timer import timed_operation


@pytest.fixture(autouse=True)
def clean_metrics():
    registry = MetricsRegistry()
    registry.reset_for_tests()
    yield
    registry.reset_for_tests()


def test_metrics_counter_and_gauge():
    registry = MetricsRegistry()
    registry.increment("test_counter", 1.0, labels={"status": "success"})
    registry.increment("test_counter", 2.0, labels={"status": "success"})
    registry.gauge("test_gauge", 42.5, labels={"pool": "primary"})

    snapshot = registry.get_snapshot()
    assert snapshot["counters"]["test_counter{status=success}"] == 3.0
    assert snapshot["gauges"]["test_gauge{pool=primary}"] == 42.5


def test_sanitize_labels_strips_high_cardinality():
    dirty_labels = {
        "status": "success",
        "customer_id": "cust_12345",
        "email": "user@test.com",
        "payment_id": "pay_9999",
        "provider": "razorpay"
    }

    clean = sanitize_labels(dirty_labels)
    assert clean == {"status": "success", "provider": "razorpay"}
    assert "customer_id" not in clean
    assert "email" not in clean
    assert "payment_id" not in clean


def test_timed_operation_records_histogram():
    registry = MetricsRegistry()
    with timed_operation("operation_latency_ms", labels={"service": "reconciliation"}):
        time.sleep(0.01)

    snapshot = registry.get_snapshot()
    histogram_key = "operation_latency_ms{service=reconciliation}"
    assert histogram_key in snapshot["histograms"]
    assert snapshot["histograms"][histogram_key]["count"] == 1
    assert snapshot["histograms"][histogram_key]["avg"] >= 5.0


def test_timed_operation_records_on_exception():
    registry = MetricsRegistry()
    with pytest.raises(ValueError):
        with timed_operation("failed_operation_ms"):
            time.sleep(0.005)
            raise ValueError("Operation failed")

    snapshot = registry.get_snapshot()
    assert "failed_operation_ms" in snapshot["histograms"]
    assert snapshot["histograms"]["failed_operation_ms"]["count"] == 1


def test_correlation_context_lifecycle():
    from app.core.correlation import set_correlation_id
    set_correlation_id(None)
    cid1 = generate_correlation_id()
    assert cid1.startswith("corr_")

    with CorrelationContext("corr_scoped_123"):
        assert get_correlation_id() == "corr_scoped_123"

    assert get_correlation_id() is None
