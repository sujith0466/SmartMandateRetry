"""End-to-End integration tests for the Complete SmartMandateRetry Recovery Lifecycle."""

from datetime import datetime, timezone
from decimal import Decimal
import uuid
import pytest
from sqlalchemy.orm import Session

from app.domain.ai_decision_schemas import AIDecisionResult, FailureClassEnum, RecommendedActionEnum
from app.domain.customer_context import (
    CaseContext, CustomerProfileContext, CustomerRecoveryContext,
    DataQualityContext, PaymentHistoryContext, RecoveryHistoryContext,
    SubscriptionContext
)
from app.domain.failure_classifier import FailureClassificationEngine
from app.domain.failure_taxonomy import FailureCategory, Recoverability, Severity
from app.domain.models import Customer, Merchant, RecoveryAction, RecoveryCase, RecoveryPolicy, Subscription
from app.domain.normalized_event import NormalizedWebhookEvent
from app.domain.policy_decision import PolicyStatusEnum
from app.domain.policy_engine import PolicyEvaluationEngine
from app.domain.reconciliation_schemas import PaymentOutcome, ReconciliationStatus
from app.infrastructure.repositories.unit_of_work import UnitOfWork
from app.services.reconciliation_service import ReconciliationService


def _make_policy(merchant_id: str, **kwargs) -> RecoveryPolicy:
    defaults = {
        "id": f"pol_{uuid.uuid4().hex[:6]}",
        "merchant_id": merchant_id,
        "max_retries_per_case": 3,
        "min_retry_interval_hours": 24,
        "max_recovery_window_days": 14,
        "min_confidence_threshold": Decimal("0.70"),
        "high_value_threshold_inr": Decimal("50000.00"),
        "max_customer_contacts_per_cycle": 2,
        "hard_decline_auto_stop": True,
    }
    defaults.update(kwargs)
    return RecoveryPolicy(**defaults)


@pytest.fixture
def e2e_merchant_setup(uow: UnitOfWork):
    uid = uuid.uuid4().hex[:8]
    merch_id = f"m_e2e_{uid}"
    cust_id = f"c_e2e_{uid}"
    sub_id = f"sub_e2e_{uid}"
    case_id = f"case_e2e_{uid}"
    action_id = f"act_e2e_{uid}"
    plink_id = f"plink_e2e_{uid}"

    policy = _make_policy(merchant_id=merch_id)

    with uow:
        m = Merchant(id=merch_id, name=f"E2E Merchant {uid}", razorpay_account_id=f"acc_{uid}")
        c = Customer(
            id=cust_id,
            merchant_id=merch_id,
            razorpay_customer_id=f"cust_rzp_{uid}",
            email="e2e_customer@example.com",
            contact="+919876543210",
        )
        s = Subscription(
            id=sub_id,
            merchant_id=merch_id,
            customer_id=cust_id,
            razorpay_subscription_id=f"sub_rzp_{uid}",
            status="halted",
            plan_id="plan_enterprise",
        )
        case = RecoveryCase(
            id=case_id,
            merchant_id=merch_id,
            subscription_id=sub_id,
            invoice_id=f"inv_{uid}",
            amount_inr=Decimal("4500.00"),
            currency="INR",
            stage="HALTED_RECOVERY",
            state="IN_PROGRESS",
        )
        action = RecoveryAction(
            id=action_id,
            recovery_case_id=case.id,
            action_type="PAYMENT_LINK_RECOVERY",
            idempotency_key=f"phase8:{case_id}:act_01",
            status="EXECUTED",
            external_reference_id=plink_id,
        )
        uow.merchants.add(m)
        uow.customers.add(c)
        uow.subscriptions.add(s)
        uow.policies.add(policy)
        uow.cases.add(case)
        uow.actions.add(action)
        uow.commit()

    return {
        "merchant_id": merch_id,
        "customer_id": cust_id,
        "subscription_id": sub_id,
        "case_id": case_id,
        "action_id": action_id,
        "plink_id": plink_id,
        "account_id": f"acc_{uid}",
    }


class TestRecoveryLifecycleE2E:
    def test_e2e_successful_recovery_lifecycle(self, uow: UnitOfWork, db_session: Session, e2e_merchant_setup: dict):
        """Test full flow: Failure -> Classification -> Policy -> Action -> Reconciliation -> Success."""
        merch_id = e2e_merchant_setup["merchant_id"]
        case_id = e2e_merchant_setup["case_id"]
        plink_id = e2e_merchant_setup["plink_id"]
        account_id = e2e_merchant_setup["account_id"]

        # Step 1: Failure Intelligence Classification
        classifier = FailureClassificationEngine()
        failure_event = NormalizedWebhookEvent(
            provider="razorpay",
            event_id=f"evt_{uuid.uuid4().hex[:6]}",
            event_type="payment.failed",
            occurred_at=datetime.now(timezone.utc),
            merchant_account_id=account_id,
            entity_type="payment",
            entity_id="pay_fail_01",
            subscription_id=e2e_merchant_setup["subscription_id"],
            invoice_id="inv_01",
            amount_inr=Decimal("4500.00"),
            currency="INR",
            error_metadata={
                "error_reason": "insufficient_funds",
                "error_code": "BAD_REQUEST_PAYMENT_ACCOUNT_INSUFFICIENT_BALANCE",
                "error_description": "Account balance is insufficient",
                "error_source": "bank",
                "error_step": "payment_debit",
            },
            raw_payload={},
        )
        assessment = classifier.classify(failure_event)
        assert assessment.failure_category == FailureCategory.TEMPORARY_LIQUIDITY
        assert assessment.recoverability == Recoverability.RECOVERABLE
        assert assessment.is_hard_decline is False

        # Step 2: Policy Evaluation
        now = datetime(2026, 8, 26, 12, 0, 0, tzinfo=timezone.utc)
        context = CustomerRecoveryContext(
            case=CaseContext(case_id, "inv_01", Decimal("4500.00"), "INR", "HALTED_RECOVERY", "DETECTED", now, 1),
            subscription=SubscriptionContext("s_01", "halted", "p_1", 2, now, 30),
            customer=CustomerProfileContext("cust_01", 2, Decimal("1.00"), None, None),
            payment_history=PaymentHistoryContext(5, 4, 1, 0, 0, 5, "HIGH"),
            recovery_history=RecoveryHistoryContext(1, 0, 0, None, None, None),
            failure_assessment=assessment,
            quality=DataQualityContext("1.0.0", Decimal("1.00"), False, []),
        )
        decision = AIDecisionResult("d_01", case_id, FailureClassEnum.TEMPORARY, RecommendedActionEnum.PAYMENT_LINK_RECOVERY, 24, Decimal("0.92"), "AI rec", [], "model", "1.0", False)
        engine = PolicyEvaluationEngine()
        policy = _make_policy(merchant_id=merch_id)
        policy_result = engine.evaluate(context, decision, policy)

        assert policy_result.status == PolicyStatusEnum.ALLOWED
        assert policy_result.final_action == "PAYMENT_LINK_RECOVERY"

        # Step 3: Webhook Reconciliation of Successful Payment Link Payment
        recon_service = ReconciliationService(uow=uow)
        recon_event = NormalizedWebhookEvent(
            provider="razorpay",
            event_id=f"evt_{uuid.uuid4().hex[:6]}",
            event_type="payment_link.paid",
            occurred_at=datetime.now(timezone.utc),
            merchant_account_id=account_id,
            entity_type="payment_link",
            entity_id=plink_id,
            subscription_id=None,
            invoice_id=None,
            amount_inr=Decimal("4500.00"),
            currency="INR",
            error_metadata={},
            raw_payload={"id": plink_id, "status": "paid"},
        )
        result = recon_service.reconcile_normalized_event(recon_event, correlation_id=f"corr_e2e_{uuid.uuid4().hex[:6]}")

        assert result.reconciliation_status == ReconciliationStatus.RECONCILED
        assert result.payment_outcome == PaymentOutcome.PAYMENT_SUCCEEDED

        # Step 4: Verify DB Case and Action are RECOVERED
        case = db_session.query(RecoveryCase).filter_by(id=case_id).first()
        assert case.state == "RECOVERED"
        assert case.recovered_amount_inr == Decimal("4500.00")
        assert case.resolved_at is not None

        action = db_session.query(RecoveryAction).filter_by(recovery_case_id=case_id).first()
        assert action.status == "RECONCILED"

    def test_e2e_hard_decline_auto_stop_lifecycle(self, e2e_merchant_setup: dict):
        """Test that terminal card stolen error is immediately vetoed and stopped."""
        classifier = FailureClassificationEngine()
        failure_event = NormalizedWebhookEvent(
            provider="razorpay",
            event_id=f"evt_{uuid.uuid4().hex[:6]}",
            event_type="payment.failed",
            occurred_at=datetime.now(timezone.utc),
            merchant_account_id=e2e_merchant_setup["account_id"],
            entity_type="payment",
            entity_id="pay_hard_01",
            subscription_id=e2e_merchant_setup["subscription_id"],
            invoice_id="inv_02",
            amount_inr=Decimal("2000.00"),
            currency="INR",
            error_metadata={
                "error_reason": "card_lost_or_stolen",
                "error_code": "GATEWAY_PAYMENT_CARD_STOLEN",
                "error_description": "Card reported stolen",
                "error_source": "bank",
                "error_step": "payment_authorization",
            },
            raw_payload={},
        )
        assessment = classifier.classify(failure_event)
        assert assessment.failure_category == FailureCategory.PERMANENT_HARD_DECLINE
        assert assessment.recoverability == Recoverability.NON_RECOVERABLE
        assert assessment.is_hard_decline is True

        now = datetime(2026, 8, 26, 12, 0, 0, tzinfo=timezone.utc)
        context = CustomerRecoveryContext(
            case=CaseContext("c_hard", "inv_02", Decimal("2000.00"), "INR", "HALTED_RECOVERY", "DETECTED", now, 1),
            subscription=SubscriptionContext("s_hard", "halted", "p_1", 2, now, 30),
            customer=CustomerProfileContext("cust_hard", 2, Decimal("1.00"), None, None),
            payment_history=PaymentHistoryContext(5, 4, 1, 0, 0, 5, "HIGH"),
            recovery_history=RecoveryHistoryContext(1, 0, 0, None, None, None),
            failure_assessment=assessment,
            quality=DataQualityContext("1.0.0", Decimal("1.00"), False, []),
        )
        decision = AIDecisionResult("d_hard", "c_hard", FailureClassEnum.PERMANENT, RecommendedActionEnum.SCHEDULE_RECOVERY_CHECK, 24, Decimal("0.95"), "AI rec", [], "model", "1.0", False)
        engine = PolicyEvaluationEngine()
        policy = _make_policy(merchant_id=e2e_merchant_setup["merchant_id"])
        policy_result = engine.evaluate(context, decision, policy)

        # P0 guardrail must veto and force STOP
        assert policy_result.status == PolicyStatusEnum.BLOCKED
        assert policy_result.final_action == "STOP"
        assert policy_result.execution_allowed is False
