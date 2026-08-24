"""Structured JSON logging configuration with keyword argument support."""

import json
import logging
import sys
from datetime import datetime, timezone
from typing import Any, Dict


class JSONFormatter(logging.Formatter):
    """Formats log records as structured JSON."""

    # Sensitive keys that must be redacted
    SENSITIVE_KEYS = {
        "secret", "api_key", "webhook_secret", "razorpay_key_secret",
        "razorpay_webhook_secret", "openrouter_api_key", "password", "token", "authorization"
    }

    def format(self, record: logging.LogRecord) -> str:
        log_entry: Dict[str, Any] = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
        }

        # Extract extra structured attributes attached to record
        if hasattr(record, "extra_fields"):
            for k, v in record.extra_fields.items():
                if any(s in k.lower() for s in self.SENSITIVE_KEYS):
                    log_entry[k] = "[REDACTED]"
                else:
                    log_entry[k] = v

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
    """Return configured structured logger instance."""
    base_logger = logging.getLogger(name)
    return StructuredLoggerAdapter(base_logger, {})
