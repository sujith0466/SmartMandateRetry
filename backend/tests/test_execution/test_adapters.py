"""Unit tests for recovery action adapters."""

from datetime import datetime, timezone
from decimal import Decimal
from unittest.mock import MagicMock
import pytest
import requests

from app.domain.action_execution_schemas import (
    ActionExecutionRequest, ActionExecutionResult, ActionExecutionStatus
)
from app.domain.models import Customer, Merchant, RecoveryCase, Subscription
from app.infrastructure.recovery_adapters import (
    ManualEscalationAdapter, PaymentLinkAdapter, PaymentMethodAdapter,
    ScheduleRecoveryAdapter, StopRecoveryAdapter
)


@pytest.fixture
def sample_case() -> RecoveryCase:
    m = Merchant(id="m_1", name="Merchant 1", razorpay_account_id="acc_1")
    c = Customer(id="c_1", merchant_id="m_1", razorpay_customer_id="cust_1", email="user@test.com", contact="+919876543210")
    s = Subscription(id="s_1", merchant_id="m_1", customer_id="c_1", razorpay_subscription_id="sub_1", status="halted", plan_id="p_1")
    s.customer = c
    case = RecoveryCase(
        id="case_exec_01",
        merchant_id="m_1",
        subscription_id="s_1",
        invoice_id="inv_exec_01",
        amount_inr=Decimal("2500.00"),
        stage="HALTED_RECOVERY",
        state="DETECTED"
    )
    case.subscription = s
    return case


def test_schedule_adapter_respects_phase7_adjusted_delay(sample_case):
    adapter = ScheduleRecoveryAdapter()
    req = ActionExecutionRequest(
        case_id=sample_case.id,
        policy_decision_id="pol_dec_01",
        final_action="SCHEDULE_RECOVERY_CHECK",
        adjusted_delay_hours=48,
        execution_allowed=True,
    )
    res = adapter.execute(req, sample_case, uow=None)

    assert res.status == ActionExecutionStatus.SCHEDULED
    assert res.action == "SCHEDULE_RECOVERY_CHECK"
    assert res.scheduled_for is not None
    assert res.provider == "celery_redis"
    assert res.provider_reference is not None


def test_payment_link_adapter_success(sample_case):
    mock_client = MagicMock()
    mock_client.create_payment_link.return_value = {"id": "plink_test_12345", "status": "created"}

    adapter = PaymentLinkAdapter(client=mock_client)
    req = ActionExecutionRequest(
        case_id=sample_case.id,
        policy_decision_id="pol_dec_02",
        final_action="PAYMENT_LINK_RECOVERY",
        adjusted_delay_hours=0,
        execution_allowed=True,
    )
    res = adapter.execute(req, sample_case, uow=None)

    assert res.status == ActionExecutionStatus.EXECUTED
    assert res.provider_reference == "plink_test_12345"
    mock_client.create_payment_link.assert_called_once()
    # Check amount converted to paise (2500.00 -> 250000)
    args, kwargs = mock_client.create_payment_link.call_args
    assert kwargs["amount_paise"] == 250000


def test_payment_link_adapter_handles_timeout(sample_case):
    mock_client = MagicMock()
    mock_client.create_payment_link.side_effect = requests.exceptions.Timeout("Connection timed out")

    adapter = PaymentLinkAdapter(client=mock_client)
    req = ActionExecutionRequest(
        case_id=sample_case.id,
        policy_decision_id="pol_dec_03",
        final_action="PAYMENT_LINK_RECOVERY",
        adjusted_delay_hours=0,
        execution_allowed=True,
    )
    res = adapter.execute(req, sample_case, uow=None)

    assert res.status == ActionExecutionStatus.FAILED
    assert res.error_code == "PROVIDER_TIMEOUT"


def test_payment_method_adapter_returns_not_supported(sample_case):
    adapter = PaymentMethodAdapter()
    req = ActionExecutionRequest(
        case_id=sample_case.id,
        policy_decision_id="pol_dec_04",
        final_action="PAYMENT_METHOD_RECOVERY",
        adjusted_delay_hours=0,
        execution_allowed=True,
    )
    res = adapter.execute(req, sample_case, uow=None)

    assert res.status == ActionExecutionStatus.NOT_SUPPORTED
    assert res.error_code == "OPERATION_NOT_SUPPORTED"


def test_manual_escalation_adapter(sample_case):
    adapter = ManualEscalationAdapter()
    req = ActionExecutionRequest(
        case_id=sample_case.id,
        policy_decision_id="pol_dec_05",
        final_action="MANUAL_ESCALATION",
        adjusted_delay_hours=0,
        execution_allowed=True,
    )
    res = adapter.execute(req, sample_case, uow=None)

    assert res.status == ActionExecutionStatus.EXECUTED
    assert res.provider == "internal_escalation"


def test_stop_adapter(sample_case):
    adapter = StopRecoveryAdapter()
    req = ActionExecutionRequest(
        case_id=sample_case.id,
        policy_decision_id="pol_dec_06",
        final_action="STOP",
        adjusted_delay_hours=0,
        execution_allowed=True,
    )
    res = adapter.execute(req, sample_case, uow=None)

    assert res.status == ActionExecutionStatus.EXECUTED
    assert res.provider == "internal_stop"
