"""Unit tests for FailureRuleRegistry and pattern matching."""

from decimal import Decimal
import pytest

from app.domain.failure_extractor import ExtractedFailureEvidence
from app.domain.failure_rules import FailureRuleRegistry
from app.domain.failure_taxonomy import FailureCategory, Recoverability, Severity


def create_evidence(
    reason: str = None,
    code: str = None,
    description: str = None,
    source: str = None,
    step: str = None,
    method: str = "card"
) -> ExtractedFailureEvidence:
    return ExtractedFailureEvidence(
        provider="razorpay",
        payment_id="pay_test_001",
        subscription_id="sub_test_001",
        invoice_id="inv_test_001",
        error_code=code,
        error_description=description,
        error_source=source,
        error_step=step,
        error_reason=reason,
        payment_method=method,
        raw_payload_snippet={}
    )


def test_rule_registry_temporary_liquidity():
    ev = create_evidence(reason="insufficient_funds")
    res = FailureRuleRegistry.evaluate(ev)
    assert res.failure_category == FailureCategory.TEMPORARY_LIQUIDITY
    assert res.failure_code == "INSUFFICIENT_FUNDS"
    assert res.recoverability == Recoverability.RECOVERABLE
    assert res.severity == Severity.LOW
    assert res.confidence == Decimal("1.00")
    assert res.is_hard_decline is False
    assert res.match_strategy == "EXACT_REASON"


def test_rule_registry_temporary_technical():
    ev = create_evidence(reason="gateway_technical_error")
    res = FailureRuleRegistry.evaluate(ev)
    assert res.failure_category == FailureCategory.TEMPORARY_TECHNICAL
    assert res.failure_code == "GATEWAY_OUTAGE"
    assert res.recoverability == Recoverability.RECOVERABLE
    assert res.confidence == Decimal("1.00")
    assert res.is_hard_decline is False


def test_rule_registry_action_required_instrument():
    ev = create_evidence(reason="card_expired")
    res = FailureRuleRegistry.evaluate(ev)
    assert res.failure_category == FailureCategory.ACTION_REQUIRED_INSTRUMENT
    assert res.failure_code == "CARD_EXPIRED"
    assert res.recoverability == Recoverability.CONDITIONAL
    assert res.severity == Severity.MEDIUM
    assert res.confidence == Decimal("0.95")
    assert res.is_hard_decline is False


def test_rule_registry_action_required_auth():
    ev = create_evidence(reason="authentication_failed")
    res = FailureRuleRegistry.evaluate(ev)
    assert res.failure_category == FailureCategory.ACTION_REQUIRED_AUTH
    assert res.failure_code == "AUTHENTICATION_FAILED"
    assert res.recoverability == Recoverability.CONDITIONAL
    assert res.confidence == Decimal("0.90")


def test_rule_registry_permanent_hard_decline():
    for hard_reason in ("do_not_honour", "account_closed", "fraud_suspected", "card_lost_or_stolen"):
        ev = create_evidence(reason=hard_reason)
        res = FailureRuleRegistry.evaluate(ev)
        assert res.failure_category == FailureCategory.PERMANENT_HARD_DECLINE
        assert res.recoverability == Recoverability.NON_RECOVERABLE
        assert res.severity == Severity.HIGH
        assert res.confidence == Decimal("1.00")
        assert res.is_hard_decline is True


def test_rule_registry_description_keyword_fallback():
    # Blank reason, but description mentions insufficient funds
    ev = create_evidence(reason="", description="Customer has low balance in checking account")
    res = FailureRuleRegistry.evaluate(ev)
    assert res.failure_category == FailureCategory.TEMPORARY_LIQUIDITY
    assert res.confidence == Decimal("0.85")
    assert res.match_strategy == "DESCRIPTION_KEYWORD"


def test_rule_registry_composite_gateway_fallback():
    # Blank reason, generic GATEWAY_ERROR from bank
    ev = create_evidence(reason="", code="GATEWAY_ERROR", source="bank")
    res = FailureRuleRegistry.evaluate(ev)
    assert res.failure_category == FailureCategory.TEMPORARY_TECHNICAL
    assert res.recoverability == Recoverability.RECOVERABLE
    assert res.confidence == Decimal("0.80")
    assert res.match_strategy == "COMPOSITE_SOURCE"


def test_rule_registry_unknown_fallback():
    # Completely unrecognized error
    ev = create_evidence(reason="unknown_bank_code_xyz999", description="Unspecified bank response")
    res = FailureRuleRegistry.evaluate(ev)
    assert res.failure_category == FailureCategory.UNKNOWN_AMBIGUOUS
    assert res.recoverability == Recoverability.UNKNOWN
    assert res.severity == Severity.MEDIUM
    assert res.confidence == Decimal("0.50")
    assert res.is_hard_decline is False
    assert res.match_strategy == "UNKNOWN_FALLBACK"
