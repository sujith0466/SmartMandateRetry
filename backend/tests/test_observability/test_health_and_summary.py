"""Integration and endpoint tests for health probes, metrics, and operational summary."""

from decimal import Decimal
import uuid
import pytest
from flask.testing import FlaskClient
from sqlalchemy.orm import Session

from app.domain.models import AuditEvent, Customer, Merchant, RecoveryAction, RecoveryCase, Subscription
from app.infrastructure.repositories.unit_of_work import UnitOfWork
from app.services.observability_service import ObservabilityService


def _create_test_summary_case(uow: UnitOfWork) -> str:
    uid = uuid.uuid4().hex[:6]
    case_id = f"case_obs_{uid}"
    with uow:
        m = Merchant(id=f"m_obs_{uid}", name=f"Obs Merchant {uid}", razorpay_account_id=f"acc_obs_{uid}")
        c = Customer(id=f"c_obs_{uid}", merchant_id=m.id, razorpay_customer_id=f"cust_obs_{uid}")
        s = Subscription(id=f"s_obs_{uid}", merchant_id=m.id, customer_id=c.id, razorpay_subscription_id=f"sub_obs_{uid}", status="halted", plan_id="p_obs")
        case = RecoveryCase(
            id=case_id,
            merchant_id=m.id,
            subscription_id=s.id,
            invoice_id=f"inv_obs_{uid}",
            amount_inr=Decimal("12000.00"),
            recovered_amount_inr=Decimal("12000.00"),
            currency="INR",
            stage="HALTED_RECOVERY",
            state="RECOVERED",
            version=2,
        )
        action = RecoveryAction(
            id=f"act_obs_{uid}",
            recovery_case_id=case.id,
            action_type="PAYMENT_LINK_RECOVERY",
            idempotency_key=f"phase11:{case_id}:act_01",
            status="RECONCILED",
        )
        audit = AuditEvent(
            id=f"aud_obs_{uid}",
            merchant_id=m.id,
            recovery_case_id=case.id,
            event_type="RECOVERY_STATE_TRANSITIONED",
            actor="STATE_MACHINE_ENGINE",
            payload={"status": "TRANSITIONED"},
            correlation_id=f"corr_obs_{uid}"
        )
        uow.merchants.add(m)
        uow.customers.add(c)
        uow.subscriptions.add(s)
        uow.cases.add(case)
        uow.actions.add(action)
        uow.audit_events.add(audit)
        uow.commit()
    return case_id


def test_healthz_endpoint(client: FlaskClient):
    resp = client.get("/api/v1/healthz")
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["status"] == "healthy"


def test_readyz_endpoint(client: FlaskClient):
    resp = client.get("/api/v1/readyz")
    # In test environment, Redis might be mocked or localhost
    assert resp.status_code in (200, 503)
    data = resp.get_json()
    assert "checks" in data
    assert "database" in data["checks"]
    assert "llm_provider" in data["checks"]


def test_metrics_endpoint(client: FlaskClient):
    resp = client.get("/api/v1/metrics")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "counters" in data
    assert "gauges" in data
    assert "histograms" in data


def test_observability_summary_service(uow: UnitOfWork):
    case_id = _create_test_summary_case(uow)
    service = ObservabilityService(uow=uow)
    summary = service.get_operational_summary()

    pipeline = summary["recovery_pipeline"]
    assert pipeline["total_cases"] >= 1
    assert "RECOVERED" in pipeline["cases_by_state"]
    assert pipeline["total_recovered_inr"] >= 12000.0
    assert pipeline["total_audit_events"] >= 1


def test_observability_summary_endpoint(client: FlaskClient, uow: UnitOfWork):
    _create_test_summary_case(uow)
    resp = client.get("/api/v1/observability/summary")
    assert resp.status_code == 200
    data = resp.get_json()
    assert "recovery_pipeline" in data
    assert "telemetry" in data
