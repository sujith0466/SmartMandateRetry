"""Thread-safe in-memory metrics registry with low-cardinality label enforcement."""

from collections import defaultdict
import threading
from typing import Any, Dict, List, Optional

HIGH_CARDINALITY_LABEL_KEYS = {
    "customer_id", "email", "phone", "contact", "payment_id", "invoice_id",
    "subscription_id", "correlation_id", "token", "case_id"
}


def sanitize_labels(labels: Optional[Dict[str, str]]) -> Dict[str, str]:
    """Sanitize metric labels to prevent cardinality explosion and PII leakage."""
    if not labels:
        return {}
    clean: Dict[str, str] = {}
    for k, v in labels.items():
        k_str = str(k).lower()
        if k_str not in HIGH_CARDINALITY_LABEL_KEYS:
            clean[k_str] = str(v)
    return clean


class MetricsRegistry:
    """Thread-safe in-memory metrics collector for telemetry and diagnostics."""

    _instance: Optional["MetricsRegistry"] = None
    _lock = threading.Lock()

    def __new__(cls) -> "MetricsRegistry":
        with cls._lock:
            if cls._instance is None:
                cls._instance = super().__new__(cls)
                cls._instance._counters = defaultdict(float)
                cls._instance._gauges = defaultdict(float)
                cls._instance._histograms = defaultdict(list)
                cls._instance._registry_lock = threading.Lock()
            return cls._instance

    def _format_key(self, name: str, labels: Optional[Dict[str, str]] = None) -> str:
        clean = sanitize_labels(labels)
        if not clean:
            return name
        label_str = ",".join(f"{k}={v}" for k, v in sorted(clean.items()))
        return f"{name}{{{label_str}}}"

    def increment(self, name: str, value: float = 1.0, labels: Optional[Dict[str, str]] = None) -> None:
        """Increment a counter metric."""
        key = self._format_key(name, labels)
        with self._registry_lock:
            self._counters[key] += value

    def gauge(self, name: str, value: float, labels: Optional[Dict[str, str]] = None) -> None:
        """Set a gauge metric value."""
        key = self._format_key(name, labels)
        with self._registry_lock:
            self._gauges[key] = value

    def observe(self, name: str, value: float, labels: Optional[Dict[str, str]] = None) -> None:
        """Record an observation in a histogram/timer distribution."""
        key = self._format_key(name, labels)
        with self._registry_lock:
            self._histograms[key].append(value)
            # Bound memory: retain latest 1000 observations per series
            if len(self._histograms[key]) > 1000:
                self._histograms[key] = self._histograms[key][-1000:]

    def get_snapshot(self) -> Dict[str, Any]:
        """Export all current metrics as a clean dictionary."""
        with self._registry_lock:
            histogram_stats: Dict[str, Any] = {}
            for k, samples in self._histograms.items():
                if samples:
                    histogram_stats[k] = {
                        "count": len(samples),
                        "avg": round(sum(samples) / len(samples), 2),
                        "min": min(samples),
                        "max": max(samples),
                    }
                else:
                    histogram_stats[k] = {"count": 0, "avg": 0.0, "min": 0.0, "max": 0.0}

            return {
                "counters": dict(self._counters),
                "gauges": dict(self._gauges),
                "histograms": histogram_stats,
            }

    def reset_for_tests(self) -> None:
        """Clear all metrics for test isolation."""
        with self._registry_lock:
            self._counters.clear()
            self._gauges.clear()
            self._histograms.clear()


# Global singleton instance accessor
metrics = MetricsRegistry()
