"""Pre-Phase-G Final Integrity & Backlog Closure Tests (DOC-IMPLEMENT-004)."""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
import pytest

from app.domain.customer_context import (
    CaseContext, CustomerProfileContext, CustomerRecoveryContext,
    DataQualityContext, PaymentHistoryContext, RecoveryHistoryContext, SubscriptionContext
)
from app.domain.failure_assessment import FailureAssessment
from app.domain.failure_taxonomy import FailureCategory, Recoverability, Severity
from app.domain.models import Merchant, PromiseToPay, RecoveryCase, RecoveryPolicy, Subscription
from app.domain.policy_engine import PolicyEvaluationEngine
from app.domain.policy_rules import PolicyRuleEvaluationContext, PromiseToPayProtectionRule
from app.domain.state_machine import RecoveryActionType
from app.evaluation.benchmark_runner import BenchmarkRunner
from app.evaluation.dataset_manifest import DatasetManifestManager
from app.infrastructure.recovery_adapters.channel_adapters import (
    DeliveryStatus, SMSChannelAdapter, WhatsAppChannelAdapter
)
from app.infrastructure.recovery_adapters.payment_link_adapter import PaymentLinkAdapter
from app.infrastructure.recovery_adapters.payment_method_adapter import PaymentMethodAdapter
from app.infrastructure.repositories.unit_of_work import UnitOfWork
from app.services.digest_service import RecoveryDigestService


def test_authoritative_benchmark_determinism():
    """Verify that the authoritative 5,000-scenario dataset is 100% deterministic across runs."""
    manifest = DatasetManifestManager().load("datasets/eval_dataset_42_5000.json")
    runner = BenchmarkRunner()

    run1 = runner.run_comparative_benchmark(manifest=manifest, split="TEST", persist=False)
    run2 = runner.run_comparative_benchmark(manifest=manifest, split="TEST", persist=False)

    assert run1["total_evaluated"] == 802
    assert run2["total_evaluated"] == 802

    # Check SmartMandate metrics
    m1 = run1["mode_metrics"]["SMART_MANDATE"]
    m2 = run2["mode_metrics"]["SMART_MANDATE"]

    assert m1.simulated_recovery_rate == m2.simulated_recovery_rate
    assert round(m1.simulated_recovery_rate * 100, 1) == 46.3
    assert m1.safety_metrics.total_policy_violations == 0
    assert round(m1.recovery_uplift_pp, 1) == 17.1

    # Check Razorpay Native baseline metrics
    n1 = run1["mode_metrics"]["RAZORPAY_NATIVE"]
    assert round(n1.simulated_recovery_rate * 100, 1) == 29.2
    assert n1.safety_metrics.total_policy_violations == 58


def test_fnd_001_payment_method_adapter_boundary():
    """Verify FND-001: PaymentMethodAdapter explicitly returns NOT_SUPPORTED per RBI guidelines."""
    from app.domain.action_execution_schemas import ActionExecutionRequest, ActionExecutionStatus
    adapter = PaymentMethodAdapter()
    uow = UnitOfWork()
    with uow:
        case = uow.session.query(RecoveryCase).first()
        assert case is not None
        req = ActionExecutionRequest(
            case_id=case.id,
            policy_decision_id="pdec_test_123",
            final_action="PAYMENT_METHOD_RECOVERY",
            adjusted_delay_hours=None,
            execution_allowed=True,
            idempotency_key="idemp_test_fnd001",
        )
        result = adapter.execute(req, case, uow)
        assert result.status == ActionExecutionStatus.NOT_SUPPORTED
        assert result.error_code == "OPERATION_NOT_SUPPORTED"
        assert "not available" in result.error_message


def test_fnd_001_payment_link_adapter():
    """Verify FND-001: PaymentLinkAdapter creates valid dynamic payment link."""
    from unittest.mock import MagicMock
    from app.domain.action_execution_schemas import ActionExecutionRequest, ActionExecutionStatus
    
    mock_client = MagicMock()
    mock_client.create_payment_link.return_value = {"id": "plink_test_12345", "status": "created"}
    adapter = PaymentLinkAdapter(client=mock_client)
    
    uow = UnitOfWork()
    with uow:
        case = uow.session.query(RecoveryCase).first()
        assert case is not None
        req = ActionExecutionRequest(
            case_id=case.id,
            policy_decision_id="pdec_test_123",
            final_action="PAYMENT_LINK_RECOVERY",
            adjusted_delay_hours=None,
            execution_allowed=True,
            idempotency_key=f"idemp_test_plink_{int(datetime.now(timezone.utc).timestamp())}",
        )
        result = adapter.execute(req, case, uow)
        assert result.status == ActionExecutionStatus.EXECUTED
        assert result.provider_reference == "plink_test_12345"


def test_fnd_002_promise_to_pay_contact_suppression_rule():
    """Verify FND-002: PromiseToPayProtectionRule suppresses contacts during active promise window."""
    from app.domain.ai_decision_schemas import AIDecisionResult, FailureClassEnum, RecommendedActionEnum
    
    rule = PromiseToPayProtectionRule()

    now = datetime.now(timezone.utc)
    future_due = now + timedelta(days=2)

    case_ctx = CaseContext(
        case_id="case_test_1",
        invoice_id="inv_test_1",
        amount_inr=Decimal("1500.00"),
        currency="INR",
        stage="PENDING_OBSERVATION",
        state="DECISION_PENDING",
        created_at=now,
        age_hours=2,
    )
    sub_ctx = SubscriptionContext(
        subscription_id="sub_test_1",
        status="active",
        plan_id="plan_pro",
        current_cycle=3,
        created_at=now,
        age_days=60,
    )
    cust_ctx = CustomerProfileContext(
        customer_id="cust_test_1",
        tenure_months=12,
        historical_success_rate=Decimal("0.95"),
        masked_email="t***@example.com",
        masked_contact="+9198****1210",
    )
    pay_ctx = PaymentHistoryContext(
        total_attempts=5,
        successful_payments=4,
        failed_payments=1,
        consecutive_failures=1,
        recent_failures_30d=1,
        sample_size=5,
        data_confidence="HIGH",
    )
    rec_ctx = RecoveryHistoryContext(
        prior_recovery_cases=0,
        prior_successful_recoveries=0,
        prior_failed_recoveries=0,
        recovery_success_rate=None,
        last_recovery_strategy=None,
        last_recovery_at=None,
    )
    fail_assessment = FailureAssessment(
        assessment_id="asm_test_1",
        provider="razorpay",
        payment_id="pay_test_1",
        subscription_id="sub_test_1",
        invoice_id="inv_test_1",
        failure_category=FailureCategory.TEMPORARY_LIQUIDITY,
        failure_code="BAD_REQUEST",
        raw_error_reason="insufficient funds",
        raw_error_code="PAYMENT_FAILED",
        recoverability=Recoverability.RECOVERABLE,
        severity=Severity.MEDIUM,
        confidence=Decimal("0.90"),
        evidence={},
        is_hard_decline=False,
    )

    ctx_with_promise = CustomerRecoveryContext(
        case=case_ctx,
        subscription=sub_ctx,
        customer=cust_ctx,
        payment_history=pay_ctx,
        recovery_history=rec_ctx,
        failure_assessment=fail_assessment,
        quality=DataQualityContext(),
        active_promise_due_at=future_due,
    )

    policy = RecoveryPolicy(
        merchant_id="merch_test",
        max_retries_per_case=3,
        min_retry_interval_hours=24,
        max_recovery_window_days=14,
        min_confidence_threshold=Decimal("0.75"),
        high_value_threshold_inr=Decimal("10000.00"),
        max_customer_contacts_per_cycle=3,
        hard_decline_auto_stop=True,
    )

    ai_decision = AIDecisionResult(
        decision_id="dec_test_1",
        case_id="case_test_1",
        failure_class=FailureClassEnum.TEMPORARY,
        recommended_action=RecommendedActionEnum.PAYMENT_LINK_RECOVERY,
        delay_hours=0,
        confidence=Decimal("0.90"),
        reasoning="Test reasoning",
        risk_flags=[],
        model="gpt-4o",
        prompt_version="1.0.0",
        is_fallback=False,
    )

    eval_ctx = PolicyRuleEvaluationContext(
        context=ctx_with_promise,
        decision=ai_decision,
        policy=policy,
    )

    rule.evaluate(eval_ctx)

    assert "ACTIVE_PROMISE_PROTECTION" in eval_ctx.rules_applied
    assert "ACTIVE_PROMISE_TO_PAY_WINDOW" in eval_ctx.reasons
    assert eval_ctx.current_action == "SCHEDULE_RECOVERY_CHECK"
    assert eval_ctx.execution_allowed is False
    assert eval_ctx.adjusted_delay_hours is not None
    assert eval_ctx.adjusted_delay_hours >= 40


def test_fnd_003_weekly_roi_digest_service():
    """Verify FND-003: RecoveryDigestService generates truthful summary."""
    uow = UnitOfWork()
    service = RecoveryDigestService(uow=uow)

    # Use first seeded merchant
    with uow:
        merchant = uow.session.query(Merchant).first()
        assert merchant is not None
        merchant_id = merchant.id

    digest = service.generate_weekly_digest(merchant_id=merchant_id, period_days=7)

    assert digest["merchant_id"] == merchant_id
    assert digest["data_source"] == "LIVE_MERCHANT_LEDGER"
    assert "metrics" in digest
    assert digest["delivery"]["delivery_status"] == "SIMULATED"
    assert digest["metrics"]["baseline_recovery_rate_percent"] == 29.2


def test_fnd_004_channel_adapters_sandbox():
    """Verify FND-004: Multi-channel WhatsApp & SMS adapters format and return truthful SIMULATED status."""
    wa_adapter = WhatsAppChannelAdapter()
    sms_adapter = SMSChannelAdapter()

    assert wa_adapter.channel_name == "WHATSAPP"
    assert sms_adapter.channel_name == "SMS"

    uow = UnitOfWork()
    with uow:
        case = uow.session.query(RecoveryCase).first()
        assert case is not None

        wa_res = wa_adapter.dispatch_nudge(case, payment_link_url="https://rzp.io/i/test", uow=uow)
        assert wa_res.status == DeliveryStatus.SIMULATED
        assert wa_res.delivery_mode == "SANDBOX_SIMULATION"
        assert wa_res.channel == "WHATSAPP"

        sms_res = sms_adapter.dispatch_nudge(case, payment_link_url="https://rzp.io/i/test", uow=uow)
        assert sms_res.status == DeliveryStatus.SIMULATED
        assert sms_res.delivery_mode == "SANDBOX_SIMULATION"
        assert sms_res.channel == "SMS"
