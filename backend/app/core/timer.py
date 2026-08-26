"""Safe timing instrumentation context managers for measuring latency."""

import contextlib
import time
from typing import Dict, Iterator, Optional

from app.core.metrics import metrics


@contextlib.contextmanager
def timed_operation(metric_name: str, labels: Optional[Dict[str, str]] = None) -> Iterator[None]:
    """
    Context manager measuring execution time in milliseconds and recording to metrics.
    Guaranteed to record duration even if an exception occurs inside the block.
    """
    start_time = time.perf_counter()
    try:
        yield
    finally:
        duration_ms = (time.perf_counter() - start_time) * 1000.0
        try:
            metrics.observe(metric_name, round(duration_ms, 2), labels=labels)
        except Exception:
            # Observability failures must be non-blocking
            pass
