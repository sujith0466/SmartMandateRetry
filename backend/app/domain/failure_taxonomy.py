"""Provider-neutral failure intelligence taxonomy enums."""

from enum import Enum


class FailureCategory(str, Enum):
    """Standardized failure categories across all payment providers."""
    TEMPORARY_LIQUIDITY = "TEMPORARY_LIQUIDITY"
    TEMPORARY_TECHNICAL = "TEMPORARY_TECHNICAL"
    ACTION_REQUIRED_INSTRUMENT = "ACTION_REQUIRED_INSTRUMENT"
    ACTION_REQUIRED_AUTH = "ACTION_REQUIRED_AUTH"
    PERMANENT_HARD_DECLINE = "PERMANENT_HARD_DECLINE"
    UNKNOWN_AMBIGUOUS = "UNKNOWN_AMBIGUOUS"


class Recoverability(str, Enum):
    """Standardized recoverability potential assessment."""
    RECOVERABLE = "RECOVERABLE"          # Transient issue; retrying on same token is viable
    CONDITIONAL = "CONDITIONAL"          # Token unusable; requires out-of-band action / new method
    NON_RECOVERABLE = "NON_RECOVERABLE"  # Hard permanent decline; retries prohibited
    UNKNOWN = "UNKNOWN"                  # Inconclusive evidence; no assumption of success


class Severity(str, Enum):
    """Operational severity of the payment failure."""
    LOW = "LOW"        # Transient balance/network glitch
    MEDIUM = "MEDIUM"  # Requires customer action or ambiguous investigation
    HIGH = "HIGH"      # Permanent hard decline / fraud alert
