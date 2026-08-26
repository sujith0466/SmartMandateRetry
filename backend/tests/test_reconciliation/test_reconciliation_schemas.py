"""Unit tests for Phase 9 Reconciliation domain schemas and models."""

from decimal import Decimal
from datetime import datetime, timezone
import pytest

from app.domain.reconciliation_schemas import (
    PaymentOutcome, ReconciliationEvidence, ReconciliationResult, ReconciliationStatus
)


def test_payment_outcome_enum_values():
    assert PaymentOutcome.PAYMENT_SUCCEEDED == "PAYMENT_SUCCEEDED"
    assert PaymentOutcome.PAYMENT_FAILED == "PAYMENT_FAILED"
    assert PaymentOutcome.PAYMENT_PENDING == "PAYMENT_PENDING"
    assert PaymentOutcome.PAYMENT_NOT_FOUND == "PAYMENT_NOT_FOUND"
    assert PaymentOutcome.PAYMENT_CANCELLED == "PAYMENT_CANCELLED"
    assert PaymentOutcome.UNKNOWN == "UNKNOWN"


def test_reconciliation_status_enum_values():
    assert ReconciliationStatus.RECONCILED == "RECONCILED"
    assert ReconciliationStatus.PENDING_VERIFICATION == "PENDING_VERIFICATION"
    assert ReconciliationStatus.MISMATCH == "MISMATCH"
    assert ReconciliationStatus.FAILED == "FAILED"
    assert ReconciliationStatus.DUPLICATE_IGNORED == "DUPLICATE_IGNORED"
    assert ReconciliationStatus.UNKNOWN == "UNKNOWN"


def test_reconciliation_result_to_dict():
    res = ReconciliationResult(
        reconciliation_id="rec_test_123",
        case_id="case_123",
        recovery_action_id="act_123",
        payment_outcome=PaymentOutcome.PAYMENT_SUCCEEDED,
        reconciliation_status=ReconciliationStatus.RECONCILED,
        settled_amount_inr=Decimal("1500.00"),
        currency="INR",
        evidence_id="ev_123",
        correlation_key="inv_123",
        correlation_match_type="INVOICE_ID",
        notes="Reconciled successfully",
    )
    d = res.to_dict()
    assert d["reconciliation_id"] == "rec_test_123"
    assert d["case_id"] == "case_123"
    assert d["payment_outcome"] == "PAYMENT_SUCCEEDED"
    assert d["reconciliation_status"] == "RECONCILED"
    assert d["settled_amount_inr"] == "1500.00"
    assert d["currency"] == "INR"
    assert d["correlation_match_type"] == "INVOICE_ID"
