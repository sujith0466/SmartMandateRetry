"""Integration tests for RecoveryCase, Action, and Reconciliation REST APIs."""

from decimal import Decimal
import uuid
import pytest
from flask.testing import FlaskClient

from app.domain.models import Customer, Merchant, RecoveryAction, RecoveryCase, Subscription
from app.infrastructure.repositories.unit_of_work import UnitOfWork


@pytest.fixture
def populated_api_merchant(uow: UnitOfWork) -> tuple[str, str]:
    uid = uuid.uuid4().hex[:6]
    merch_id = f"m_api_{uid}"
    case_id = f"case_api_{uid}"
    with uow:
        m = Merchant(id=merch_id, name=f"API Merchant {uid}", razorpay_account_id=f"acc_api_{uid}")
        c = Customer(id=f"c_api_{uid}", merchant_id=m.id, razorpay_customer_id=f"cust_api_{uid}", email="customer@example.com", contact="+919876543210")
        s = Subscription(id=f"s_api_{uid}", merchant_id=m.id, customer_id=c.id, razorpay_subscription_id=f"sub_api_{uid}", status="halted", plan_id="p_gold")
        case = RecoveryCase(
            id=case_id,
            merchant_id=m.id,
            subscription_id=s.id,
            invoice_id=f"inv_api_{uid}",
            payment_id=f"pay_api_{uid}",
            amount_inr=Decimal("4500.00"),
            recovered_amount_inr=Decimal("4500.00"),
            currency="INR",
            stage="HALTED_RECOVERY",
            state="RECOVERED",
            version=3,
        )
        action = RecoveryAction(
            id=f"act_api_{uid}",
            recovery_case_id=case.id,
            action_type="PAYMENT_LINK_RECOVERY",
            idempotency_key=f"phase12:{case_id}:act_01",
            status="RECONCILED",
            external_reference_id=f"plink_api_{uid}",
        )
        uow.merchants.add(m)
        uow.customers.add(c)
        uow.subscriptions.add(s)
        uow.cases.add(case)
        uow.actions.add(action)
        uow.commit()

    return merch_id, case_id


def test_list_cases_with_pagination_and_filter(client: FlaskClient, populated_api_merchant):
    merch_id, case_id = populated_api_merchant
    resp = client.get(
        "/api/v1/cases?page=1&limit=10&state=RECOVERED",
        headers={"X-Merchant-ID": merch_id}
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data["data"]) >= 1
    assert data["data"][0]["id"] == case_id
    assert data["data"][0]["state"] == "RECOVERED"
    assert data["pagination"]["page"] == 1
    assert data["pagination"]["limit"] == 10


def test_get_case_detail_with_customer_and_subscription(client: FlaskClient, populated_api_merchant):
    merch_id, case_id = populated_api_merchant
    resp = client.get(
        f"/api/v1/cases/{case_id}",
        headers={"X-Merchant-ID": merch_id}
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["case"]["id"] == case_id
    assert data["case"]["amount_inr"] == 4500.0
    assert data["customer"]["email"] == "c***r@example.com"  # Sanitized email
    assert data["customer"]["contact"] == "+91******3210"   # Sanitized phone
    assert data["subscription"]["plan_id"] == "p_gold"


def test_list_case_actions(client: FlaskClient, populated_api_merchant):
    merch_id, case_id = populated_api_merchant
    resp = client.get(
        f"/api/v1/cases/{case_id}/actions",
        headers={"X-Merchant-ID": merch_id}
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert len(data["actions"]) >= 1
    assert data["actions"][0]["action_type"] == "PAYMENT_LINK_RECOVERY"
    assert data["actions"][0]["status"] == "RECONCILED"


def test_get_case_reconciliation(client: FlaskClient, populated_api_merchant):
    merch_id, case_id = populated_api_merchant
    resp = client.get(
        f"/api/v1/cases/{case_id}/reconciliation",
        headers={"X-Merchant-ID": merch_id}
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["case_id"] == case_id
    assert data["is_settled"] is True
    assert data["recovered_amount_inr"] == 4500.0
