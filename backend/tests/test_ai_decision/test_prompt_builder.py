"""Unit tests for AIPromptBuilder."""

from datetime import datetime, timezone
from decimal import Decimal
import json
import pytest

from app.domain.ai_prompt_builder import AIPromptBuilder
from app.domain.customer_context import (
    CaseContext, CustomerProfileContext, CustomerRecoveryContext,
    DataQualityContext, PaymentHistoryContext, RecoveryHistoryContext,
    SubscriptionContext
)
from app.domain.failure_assessment import FailureAssessment
from app.domain.failure_taxonomy import FailureCategory, Recoverability, Severity


@pytest.fixture
def sample_context() -> CustomerRecoveryContext:
    now = datetime(2026, 8, 26, 12, 0, 0, tzinfo=timezone.utc)
    return CustomerRecoveryContext(
        case=CaseContext(
            case_id="case_ai_01",
            invoice_id="inv_ai_01",
            amount_inr=Decimal("2500.00"),
            currency="INR",
            stage="HALTED_RECOVERY",
            state="DETECTED",
            created_at=now,
            age_hours=2,
        ),
        subscription=SubscriptionContext(
            subscription_id="sub_ai_01",
            status="halted",
            plan_id="plan_pro",
            current_cycle=4,
            created_at=now,
            age_days=90,
        ),
        customer=CustomerProfileContext(
            customer_id="cust_ai_01",
            tenure_months=4,
            historical_success_rate=Decimal("1.00"),
            masked_email="u***r@example.com",
            masked_contact="+91******1234",
        ),
        payment_history=PaymentHistoryContext(
            total_attempts=4,
            successful_payments=3,
            failed_payments=1,
            consecutive_failures=1,
            recent_failures_30d=1,
            sample_size=4,
            data_confidence="LOW",
        ),
        recovery_history=RecoveryHistoryContext(
            prior_recovery_cases=0,
            prior_successful_recoveries=0,
            prior_failed_recoveries=0,
            recovery_success_rate=None,
            last_recovery_strategy=None,
            last_recovery_at=None,
        ),
        failure_assessment=FailureAssessment(
            assessment_id="ass_ai_01",
            provider="razorpay",
            payment_id="pay_ai_01",
            subscription_id="sub_ai_01",
            invoice_id="inv_ai_01",
            failure_category=FailureCategory.TEMPORARY_LIQUIDITY,
            failure_code="INSUFFICIENT_FUNDS",
            raw_error_reason="insufficient_funds",
            raw_error_code="BAD_REQUEST_ERROR",
            recoverability=Recoverability.RECOVERABLE,
            severity=Severity.LOW,
            confidence=Decimal("1.00"),
            evidence={"matched_rule": "EXACT_REASON_INSUFFICIENT_FUNDS"},
            is_hard_decline=False,
        ),
        quality=DataQualityContext(
            context_version="1.0.0",
            completeness_score=Decimal("1.00"),
            is_enriched_via_api=False,
            missing_fields=[],
        )
    )


def test_ai_prompt_builder_structure(sample_context):
    sys_prompt, user_prompt, version = AIPromptBuilder.build_prompts(sample_context)

    assert "AI Recovery Reasoning Engine" in sys_prompt
    assert version == "1.0.0"
    assert "case_ai_01" in user_prompt
    assert "INSUFFICIENT_FUNDS" in user_prompt
    assert "u***r@example.com" in user_prompt

    # Verify no raw unmasked PII or credentials
    assert "secret" not in user_prompt.lower() or "[REDACTED]" in user_prompt
