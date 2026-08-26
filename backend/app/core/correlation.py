"""Context-local correlation ID management and propagation."""

import contextvars
from typing import Optional
import uuid

_correlation_id_ctx: contextvars.ContextVar[Optional[str]] = contextvars.ContextVar("correlation_id", default=None)


def generate_correlation_id(prefix: str = "corr") -> str:
    """Generate a clean, high-entropy correlation ID."""
    return f"{prefix}_{uuid.uuid4().hex[:12]}"


def get_correlation_id() -> Optional[str]:
    """Retrieve current context correlation ID if set."""
    return _correlation_id_ctx.get()


def set_correlation_id(correlation_id: Optional[str]) -> None:
    """Set current context correlation ID."""
    _correlation_id_ctx.set(correlation_id or generate_correlation_id())


class CorrelationContext:
    """Context manager for scoping correlation IDs across execution blocks."""

    def __init__(self, correlation_id: Optional[str] = None) -> None:
        self.correlation_id = correlation_id or generate_correlation_id()
        self.token: Optional[contextvars.Token] = None

    def __enter__(self) -> str:
        self.token = _correlation_id_ctx.set(self.correlation_id)
        return self.correlation_id

    def __exit__(self, exc_type, exc_val, exc_tb) -> None:
        if self.token is not None:
            _correlation_id_ctx.reset(self.token)
