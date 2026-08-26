"""Declarative failure intelligence rule registry and pattern matcher."""

from dataclasses import dataclass
from decimal import Decimal
import re
from typing import Callable, Dict, List, Optional, Tuple

from app.domain.failure_extractor import ExtractedFailureEvidence
from app.domain.failure_taxonomy import FailureCategory, Recoverability, Severity


@dataclass(frozen=True)
class RuleMatchResult:
    """Outcome of matching failure evidence against classification rules."""
    failure_category: FailureCategory
    failure_code: str
    recoverability: Recoverability
    severity: Severity
    confidence: Decimal
    is_hard_decline: bool
    matched_rule: str
    match_strategy: str  # EXACT_REASON, COMPOSITE_SOURCE, DESCRIPTION_KEYWORD, UNKNOWN_FALLBACK


class FailureRuleRegistry:
    """
    Deterministic rule engine mapping gateway failure evidence to standardized
    categories, recoverability, severity, and confidence scores.
    """

    # 1. Exact Razorpay Error Reason Mappings
    _EXACT_REASON_MAP: Dict[str, Tuple[FailureCategory, str, Recoverability, Severity, Decimal, bool]] = {
        # TEMPORARY_LIQUIDITY
        "insufficient_funds": (FailureCategory.TEMPORARY_LIQUIDITY, "INSUFFICIENT_FUNDS", Recoverability.RECOVERABLE, Severity.LOW, Decimal("1.00"), False),
        "insufficient_balance": (FailureCategory.TEMPORARY_LIQUIDITY, "INSUFFICIENT_FUNDS", Recoverability.RECOVERABLE, Severity.LOW, Decimal("1.00"), False),
        "limit_exceeded": (FailureCategory.TEMPORARY_LIQUIDITY, "LIMIT_EXCEEDED", Recoverability.RECOVERABLE, Severity.LOW, Decimal("1.00"), False),
        "daily_limit_exceeded": (FailureCategory.TEMPORARY_LIQUIDITY, "LIMIT_EXCEEDED", Recoverability.RECOVERABLE, Severity.LOW, Decimal("1.00"), False),
        "transaction_limit_exceeded": (FailureCategory.TEMPORARY_LIQUIDITY, "LIMIT_EXCEEDED", Recoverability.RECOVERABLE, Severity.LOW, Decimal("1.00"), False),

        # TEMPORARY_TECHNICAL
        "gateway_technical_error": (FailureCategory.TEMPORARY_TECHNICAL, "GATEWAY_OUTAGE", Recoverability.RECOVERABLE, Severity.LOW, Decimal("1.00"), False),
        "bank_technical_error": (FailureCategory.TEMPORARY_TECHNICAL, "BANK_OUTAGE", Recoverability.RECOVERABLE, Severity.LOW, Decimal("1.00"), False),
        "network_error": (FailureCategory.TEMPORARY_TECHNICAL, "NETWORK_ERROR", Recoverability.RECOVERABLE, Severity.LOW, Decimal("1.00"), False),
        "server_error": (FailureCategory.TEMPORARY_TECHNICAL, "SERVER_ERROR", Recoverability.RECOVERABLE, Severity.LOW, Decimal("1.00"), False),
        "timed_out": (FailureCategory.TEMPORARY_TECHNICAL, "TIMEOUT", Recoverability.RECOVERABLE, Severity.LOW, Decimal("1.00"), False),
        "gateway_timeout": (FailureCategory.TEMPORARY_TECHNICAL, "TIMEOUT", Recoverability.RECOVERABLE, Severity.LOW, Decimal("1.00"), False),
        "issuer_down": (FailureCategory.TEMPORARY_TECHNICAL, "ISSUER_UNAVAILABLE", Recoverability.RECOVERABLE, Severity.LOW, Decimal("1.00"), False),
        "bank_server_error": (FailureCategory.TEMPORARY_TECHNICAL, "BANK_OUTAGE", Recoverability.RECOVERABLE, Severity.LOW, Decimal("1.00"), False),

        # ACTION_REQUIRED_INSTRUMENT
        "card_expired": (FailureCategory.ACTION_REQUIRED_INSTRUMENT, "CARD_EXPIRED", Recoverability.CONDITIONAL, Severity.MEDIUM, Decimal("0.95"), False),
        "expired_card": (FailureCategory.ACTION_REQUIRED_INSTRUMENT, "CARD_EXPIRED", Recoverability.CONDITIONAL, Severity.MEDIUM, Decimal("0.95"), False),
        "mandate_inactive": (FailureCategory.ACTION_REQUIRED_INSTRUMENT, "MANDATE_INACTIVE", Recoverability.CONDITIONAL, Severity.MEDIUM, Decimal("0.95"), False),
        "mandate_not_found": (FailureCategory.ACTION_REQUIRED_INSTRUMENT, "MANDATE_NOT_FOUND", Recoverability.CONDITIONAL, Severity.MEDIUM, Decimal("0.95"), False),
        "token_invalidated": (FailureCategory.ACTION_REQUIRED_INSTRUMENT, "TOKEN_INVALIDATED", Recoverability.CONDITIONAL, Severity.MEDIUM, Decimal("0.95"), False),
        "card_inactive": (FailureCategory.ACTION_REQUIRED_INSTRUMENT, "CARD_INACTIVE", Recoverability.CONDITIONAL, Severity.MEDIUM, Decimal("0.95"), False),
        "issuer_not_supported": (FailureCategory.ACTION_REQUIRED_INSTRUMENT, "ISSUER_NOT_SUPPORTED", Recoverability.CONDITIONAL, Severity.MEDIUM, Decimal("0.95"), False),
        "international_card_not_supported": (FailureCategory.ACTION_REQUIRED_INSTRUMENT, "INTERNATIONAL_NOT_SUPPORTED", Recoverability.CONDITIONAL, Severity.MEDIUM, Decimal("0.95"), False),
        "invalid_vpa": (FailureCategory.ACTION_REQUIRED_INSTRUMENT, "INVALID_VPA", Recoverability.CONDITIONAL, Severity.MEDIUM, Decimal("0.95"), False),
        "invalid_card_details": (FailureCategory.ACTION_REQUIRED_INSTRUMENT, "INVALID_INSTRUMENT", Recoverability.CONDITIONAL, Severity.MEDIUM, Decimal("0.95"), False),

        # ACTION_REQUIRED_AUTH
        "authentication_failed": (FailureCategory.ACTION_REQUIRED_AUTH, "AUTHENTICATION_FAILED", Recoverability.CONDITIONAL, Severity.MEDIUM, Decimal("0.90"), False),
        "otp_not_entered": (FailureCategory.ACTION_REQUIRED_AUTH, "OTP_TIMEOUT", Recoverability.CONDITIONAL, Severity.MEDIUM, Decimal("0.90"), False),
        "pin_incorrect": (FailureCategory.ACTION_REQUIRED_AUTH, "PIN_INCORRECT", Recoverability.CONDITIONAL, Severity.MEDIUM, Decimal("0.90"), False),
        "2fa_failed": (FailureCategory.ACTION_REQUIRED_AUTH, "AUTHENTICATION_FAILED", Recoverability.CONDITIONAL, Severity.MEDIUM, Decimal("0.90"), False),
        "customer_cancelled": (FailureCategory.ACTION_REQUIRED_AUTH, "CUSTOMER_CANCELLED", Recoverability.CONDITIONAL, Severity.MEDIUM, Decimal("0.90"), False),
        "customer_dropped": (FailureCategory.ACTION_REQUIRED_AUTH, "CUSTOMER_DROPPED", Recoverability.CONDITIONAL, Severity.MEDIUM, Decimal("0.90"), False),

        # PERMANENT_HARD_DECLINE
        "do_not_honour": (FailureCategory.PERMANENT_HARD_DECLINE, "DO_NOT_HONOUR", Recoverability.NON_RECOVERABLE, Severity.HIGH, Decimal("1.00"), True),
        "account_closed": (FailureCategory.PERMANENT_HARD_DECLINE, "ACCOUNT_CLOSED", Recoverability.NON_RECOVERABLE, Severity.HIGH, Decimal("1.00"), True),
        "account_blocked": (FailureCategory.PERMANENT_HARD_DECLINE, "ACCOUNT_BLOCKED", Recoverability.NON_RECOVERABLE, Severity.HIGH, Decimal("1.00"), True),
        "fraud_suspected": (FailureCategory.PERMANENT_HARD_DECLINE, "FRAUD_SUSPECTED", Recoverability.NON_RECOVERABLE, Severity.HIGH, Decimal("1.00"), True),
        "card_lost_or_stolen": (FailureCategory.PERMANENT_HARD_DECLINE, "CARD_STOLEN", Recoverability.NON_RECOVERABLE, Severity.HIGH, Decimal("1.00"), True),
        "card_blocked": (FailureCategory.PERMANENT_HARD_DECLINE, "CARD_BLOCKED", Recoverability.NON_RECOVERABLE, Severity.HIGH, Decimal("1.00"), True),
        "mandate_revoked": (FailureCategory.PERMANENT_HARD_DECLINE, "MANDATE_REVOKED", Recoverability.NON_RECOVERABLE, Severity.HIGH, Decimal("1.00"), True),
        "blacklisted_customer": (FailureCategory.PERMANENT_HARD_DECLINE, "CUSTOMER_BLACKLISTED", Recoverability.NON_RECOVERABLE, Severity.HIGH, Decimal("1.00"), True),
    }

    # 2. Description Keyword Patterns (Fallback when error_reason is missing/generic)
    _DESCRIPTION_PATTERNS: List[Tuple[re.Pattern, FailureCategory, str, Recoverability, Severity, Decimal, bool, str]] = [
        (re.compile(r"insufficient\s+funds?|low\s+balance|not\s+enough\s+funds", re.IGNORECASE), FailureCategory.TEMPORARY_LIQUIDITY, "INSUFFICIENT_FUNDS", Recoverability.RECOVERABLE, Severity.LOW, Decimal("0.85"), False, "DESC_INSUFFICIENT_FUNDS"),
        (re.compile(r"technical\s+(error|glitch)|network\s+(issue|timeout)|gateway\s+timeout|bank\s+server", re.IGNORECASE), FailureCategory.TEMPORARY_TECHNICAL, "TECHNICAL_OUTAGE", Recoverability.RECOVERABLE, Severity.LOW, Decimal("0.85"), False, "DESC_TECHNICAL_OUTAGE"),
        (re.compile(r"card.*expired|expired.*card", re.IGNORECASE), FailureCategory.ACTION_REQUIRED_INSTRUMENT, "CARD_EXPIRED", Recoverability.CONDITIONAL, Severity.MEDIUM, Decimal("0.85"), False, "DESC_CARD_EXPIRED"),
        (re.compile(r"authenticat.*fail|otp.*(fail|timeout|expire)|incorrect\s+pin", re.IGNORECASE), FailureCategory.ACTION_REQUIRED_AUTH, "AUTH_FAILED", Recoverability.CONDITIONAL, Severity.MEDIUM, Decimal("0.85"), False, "DESC_AUTH_FAILED"),
        (re.compile(r"do\s+not\s+honou?r|account\s+closed|fraud|card\s+(stolen|lost|blocked)", re.IGNORECASE), FailureCategory.PERMANENT_HARD_DECLINE, "HARD_DECLINE", Recoverability.NON_RECOVERABLE, Severity.HIGH, Decimal("0.90"), True, "DESC_HARD_DECLINE"),
    ]

    @classmethod
    def evaluate(cls, evidence: ExtractedFailureEvidence) -> RuleMatchResult:
        """
        Evaluate failure evidence using deterministic precedence:
        1. Exact error_reason match
        2. Description pattern match (if reason is missing/generic)
        3. Fallback UNKNOWN_AMBIGUOUS
        """
        reason = (evidence.error_reason or "").lower().strip()

        # Step 1: Exact error_reason match
        if reason and reason in cls._EXACT_REASON_MAP:
            cat, code, rec, sev, conf, hard = cls._EXACT_REASON_MAP[reason]
            return RuleMatchResult(
                failure_category=cat,
                failure_code=code,
                recoverability=rec,
                severity=sev,
                confidence=conf,
                is_hard_decline=hard,
                matched_rule=f"EXACT_REASON_{reason.upper()}",
                match_strategy="EXACT_REASON"
            )

        # Step 2: Description pattern match fallback
        desc = (evidence.error_description or "").strip()
        if desc:
            for pattern, cat, code, rec, sev, conf, hard, rule_id in cls._DESCRIPTION_PATTERNS:
                if pattern.search(desc):
                    return RuleMatchResult(
                        failure_category=cat,
                        failure_code=code,
                        recoverability=rec,
                        severity=sev,
                        confidence=conf,
                        is_hard_decline=hard,
                        matched_rule=rule_id,
                        match_strategy="DESCRIPTION_KEYWORD"
                    )

        # Step 3: Composite fallback for Gateway technical codes
        if evidence.error_code in ("GATEWAY_ERROR", "SERVER_ERROR") and evidence.error_source in ("bank", "gateway"):
            return RuleMatchResult(
                failure_category=FailureCategory.TEMPORARY_TECHNICAL,
                failure_code="GATEWAY_SERVER_ERROR",
                recoverability=Recoverability.RECOVERABLE,
                severity=Severity.LOW,
                confidence=Decimal("0.80"),
                is_hard_decline=False,
                matched_rule="COMPOSITE_GATEWAY_ERROR",
                match_strategy="COMPOSITE_SOURCE"
            )

        # Step 4: Unknown / Ambiguous Fallback
        return RuleMatchResult(
            failure_category=FailureCategory.UNKNOWN_AMBIGUOUS,
            failure_code="UNRECOGNIZED_ERROR",
            recoverability=Recoverability.UNKNOWN,
            severity=Severity.MEDIUM,
            confidence=Decimal("0.50"),
            is_hard_decline=False,
            matched_rule="FALLBACK_UNKNOWN_HANDLER",
            match_strategy="UNKNOWN_FALLBACK"
        )
