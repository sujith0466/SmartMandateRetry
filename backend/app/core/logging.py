"""Structured JSON logging configuration with deep redaction and correlation ID propagation."""

import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from app.core.correlation import get_correlation_id
from app.core.sanitizer import sanitize_data


class JSONFormatter(logging.Formatter):
    """Formats log records as structured JSON with automatic PII/secret redaction."""

    def format(self, record: logging.LogRecord) -> str:
        log_entry: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Auto-inject correlation ID if available in context
        cid = get_correlation_id()
        if cid:
            log_entry["correlation_id"] = cid

        # Extract and sanitize extra structured attributes attached to record
        if hasattr(record, "extra_fields"):
            sanitized_extras = sanitize_data(record.extra_fields)
            if isinstance(sanitized_extras, dict):
                log_entry.update(sanitized_extras)

        if record.exc_info:
            log_entry["exception"] = self.formatException(record.exc_info)

        return json.dumps(log_entry)


class StructuredLoggerAdapter(logging.LoggerAdapter):
    """Logger adapter accepting arbitrary keyword arguments as structured JSON fields."""

    def process(self, msg: Any, kwargs: Any) -> tuple:
        extra_fields = {}
        for k in list(kwargs.keys()):
            if k not in ("exc_info", "stack_info", "stacklevel", "extra"):
                extra_fields[k] = kwargs.pop(k)

        extra = kwargs.setdefault("extra", {})
        extra["extra_fields"] = extra_fields
        return msg, kwargs


def setup_logging(debug: bool = False) -> None:
    """Initialize root logger with JSON handler."""
    root_logger = logging.getLogger()
    root_logger.setLevel(logging.DEBUG if debug else logging.INFO)

    for handler in root_logger.handlers[:]:
        root_logger.removeHandler(handler)

    handler = logging.StreamHandler(sys.stdout)
    handler.setFormatter(JSONFormatter())
    root_logger.addHandler(handler)


def get_logger(name: str) -> StructuredLoggerAdapter:
    """Obtain a structured logger adapter by name."""
    logger = logging.getLogger(name)
    return StructuredLoggerAdapter(logger, {})
