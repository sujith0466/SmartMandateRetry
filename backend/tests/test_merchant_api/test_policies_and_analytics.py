"""Integration tests for Policies and Analytics endpoints."""

from decimal import Decimal
import uuid
import pytest
from flask.testing import FlaskClient

from app.domain.models import Customer, Merchant, RecoveryCase, RecoveryPolicy, Subscription
from app.infrastructure.repositories.unit_of_work import UnitOfWork


@pytest.fixture
def policy_merchant(uow: UnitOfWork) -> str:
    uid = uuid.uuid4().hex[:6]
    merch_id = f"m_pol_{uid}"
    with uow:
        m = Merchant(id=merch_id, name=f"Policy Merchant {uid}", razorpay_account_id=f"acc_pol_{uid}")
        c = Customer(id=f"c_pol_{uid}", merchant_id=m.id, razorpay_customer_id=f"cust_pol_{uid}")
        s = Subscription(id=f"s_pol_{uid}", merchant_id=m.id, customer_id=c.id, razorpay_subscription_id=f"sub_pol_{uid}", status="active", plan_id="p_pol")
        case = RecoveryCase(
            id=f"case_pol_{uid}",
            merchant_id=m.id,
            subscription_id=s.id,
            invoice_id=f"inv_pol_{uid}",
            amount_inr=Decimal("6000.00"),
            recovered_amount_inr=Decimal("6000.00"),
            currency="INR",
            stage="HALTED_RECOVERY",
            state="RECOVERED",
        )
        uow.merchants.add(m)
        uow.customers.add(c)
        uow.subscriptions.add(s)
        uow.cases.add(case)
        uow.commit()
    return merch_id


def test_get_policies_endpoint(client: FlaskClient, policy_merchant: str):
    resp = client.get("/api/v1/policies", headers={"X-Merchant-ID": policy_merchant})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["merchant_id"] == policy_merchant
    assert data["max_retries_per_case"] >= 1
    assert data["min_retry_interval_hours"] >= 1


def test_get_analytics_overview_endpoint(client: FlaskClient, policy_merchant: str):
    resp = client.get("/api/v1/analytics/overview", headers={"X-Merchant-ID": policy_merchant})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["merchant_id"] == policy_merchant
    assert data["total_cases_count"] >= 1
    assert data["recovered_cases_count"] >= 1
    assert data["recovered_revenue_inr"] >= 6000.0
