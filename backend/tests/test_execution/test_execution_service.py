"""Unit and integration tests for ActionDispatcher and RecoveryExecutionService."""

from datetime import datetime, timezone
from decimal import Decimal
import pytest
from sqlalchemy.orm import Session

from app.core.errors import ResourceNotFoundError
from app.domain.action_dispatcher import ActionDispatcher
from app.domain.action_execution_schemas import (
    ActionExecutionRequest, ActionExecutionResult, ActionExecutionStatus
)
from app.domain.models import AuditEvent, Customer, Merchant, RecoveryAction, RecoveryCase, Subscription
from app.infrastructure.repositories.unit_of_work import UnitOfWork
from app.services.recovery_execution_service import RecoveryExecutionService


@pytest.fixture
def sample_case_db(uow: UnitOfWork) -> RecoveryCase:
    case_id = "case_srv_01"
    with uow:
        m = Merchant(id="m_srv_01", name="Execution Merchant", razorpay_account_id="acc_srv_01")
        c = Customer(id="c_srv_01", merchant_id=m.id, razorpay_customer_id="cust_srv_01", email="test@user.internal", contact="+919999999999")
        s = Subscription(id="s_srv_01", merchant_id=m.id, customer_id=c.id, razorpay_subscription_id="sub_srv_01", status="halted", plan_id="p_1")
        case = RecoveryCase(
            id=case_id,
            merchant_id=m.id,
            subscription_id=s.id,
            invoice_id="inv_srv_01",
            amount_inr=Decimal("3000.00"),
            stage="HALTED_RECOVERY",
            state="DETECTED",
        )
        uow.merchants.add(m)
        uow.customers.add(c)
        uow.subscriptions.add(s)
        uow.cases.add(case)
        uow.commit()

    with uow:
        return uow.cases.get_by_id(case_id)


def test_dispatcher_blocked_action_never_calls_adapter(sample_case_db, uow: UnitOfWork):
    dispatcher = ActionDispatcher()
    req = ActionExecutionRequest(
        case_id=sample_case_db.id,
        policy_decision_id="pol_dec_blk",
        final_action="SCHEDULE_RECOVERY_CHECK",
        adjusted_delay_hours=24,
        execution_allowed=False,  # Blocked by Phase 7
    )
    result = dispatcher.dispatch(req, sample_case_db, uow)

    assert result.status == ActionExecutionStatus.BLOCKED
    assert result.execution_allowed is False
    assert result.error_code == "POLICY_EXECUTION_BLOCKED"


def test_execution_service_schedule_recovery_success(uow: UnitOfWork, db_session: Session, sample_case_db):
    service = RecoveryExecutionService(uow=uow)
    req = ActionExecutionRequest(
        case_id=sample_case_db.id,
        policy_decision_id="pol_dec_sched_01",
        final_action="SCHEDULE_RECOVERY_CHECK",
        adjusted_delay_hours=48,
        execution_allowed=True,
        correlation_id="corr_exec_01"
    )

    result = service.execute_action(req)

    assert result.status == ActionExecutionStatus.SCHEDULED
    assert result.action == "SCHEDULE_RECOVERY_CHECK"

    # Verify RecoveryAction persisted in DB
    action = db_session.query(RecoveryAction).filter_by(recovery_case_id=sample_case_db.id).first()
    assert action is not None
    assert action.status == "SCHEDULED"
    assert action.action_type == "SCHEDULE_RECOVERY_CHECK"

    # Verify Case state transitioned to SCHEDULED
    case = db_session.query(RecoveryCase).filter_by(id=sample_case_db.id).first()
    assert case.state == "SCHEDULED"
    assert case.attempt_count == 1

    # Verify AuditEvent recorded
    audit = db_session.query(AuditEvent).filter_by(correlation_id="corr_exec_01").first()
    assert audit is not None
    assert audit.event_type == "RECOVERY_ACTION_SCHEDULED"
    assert audit.actor == "ACTION_DISPATCHER"


def test_execution_service_idempotency_duplicate_request(uow: UnitOfWork, sample_case_db):
    service = RecoveryExecutionService(uow=uow)
    req = ActionExecutionRequest(
        case_id=sample_case_db.id,
        policy_decision_id="pol_dec_idem_01",
        final_action="MANUAL_ESCALATION",
        adjusted_delay_hours=0,
        execution_allowed=True,
        correlation_id="corr_idem_01"
    )

    # First call: executes and persists
    first_res = service.execute_action(req)
    assert first_res.status == ActionExecutionStatus.EXECUTED

    # Second call with identical request: returns cached result without re-executing
    second_res = service.execute_action(req)
    assert second_res.execution_id == first_res.execution_id
    assert second_res.provider == "idempotent_cache"


def test_execution_service_blocked_action_persisted_and_audited(uow: UnitOfWork, db_session: Session, sample_case_db):
    service = RecoveryExecutionService(uow=uow)
    req = ActionExecutionRequest(
        case_id=sample_case_db.id,
        policy_decision_id="pol_dec_hard_stop",
        final_action="STOP",
        adjusted_delay_hours=0,
        execution_allowed=False,  # Hard decline vetoed by Phase 7
        correlation_id="corr_blk_01"
    )

    result = service.execute_action(req)

    assert result.status == ActionExecutionStatus.BLOCKED
    assert result.execution_allowed is False

    # Verify AuditEvent recorded
    audit = db_session.query(AuditEvent).filter_by(correlation_id="corr_blk_01").first()
    assert audit is not None
    assert audit.event_type == "RECOVERY_ACTION_BLOCKED"


def test_execution_service_missing_case_raises_error(uow: UnitOfWork):
    service = RecoveryExecutionService(uow=uow)
    req = ActionExecutionRequest(
        case_id="case_non_existent",
        policy_decision_id="pol_dec_01",
        final_action="STOP",
        adjusted_delay_hours=0,
        execution_allowed=True,
    )

    with pytest.raises(ResourceNotFoundError) as exc_info:
        service.execute_action(req)
    assert "RecoveryCase 'case_non_existent' not found" in str(exc_info.value)
