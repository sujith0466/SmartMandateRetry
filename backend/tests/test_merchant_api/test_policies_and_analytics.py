"""Integration tests for Policies, Policy Governance, and Analytics endpoints."""

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


def test_update_policy_endpoint_success_and_audit(client: FlaskClient, policy_merchant: str):
    update_payload = {
        "max_retries_per_case": 5,
        "min_retry_interval_hours": 36,
        "min_confidence_threshold": 0.85,
        "high_value_threshold_inr": 15000.0,
        "max_customer_contacts_per_cycle": 4,
        "hard_decline_auto_stop": True,
    }
    resp = client.put(
        "/api/v1/policies",
        json=update_payload,
        headers={"X-Merchant-ID": policy_merchant, "X-Correlation-ID": "test-corr-pol-1"},
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["max_retries_per_case"] == 5
    assert data["min_retry_interval_hours"] == 36
    assert data["min_confidence_threshold"] == 0.85
    assert data["high_value_threshold_inr"] == 15000.0
    assert data["max_customer_contacts_per_cycle"] == 4

    # Verify history contains audit event
    hist_resp = client.get("/api/v1/policies/history", headers={"X-Merchant-ID": policy_merchant})
    assert hist_resp.status_code == 200
    hist_data = hist_resp.get_json()
    assert len(hist_data["history"]) >= 1
    event = hist_data["history"][0]
    assert event["event_type"] == "POLICY_CONFIGURATION_UPDATED"
    assert event["actor"] == "MERCHANT_OPERATOR"
    assert event["payload"]["new_state"]["max_retries_per_case"] == 5


def test_update_policy_validation_errors(client: FlaskClient, policy_merchant: str):
    # Invalid max retries (> 10)
    resp = client.put(
        "/api/v1/policies",
        json={"max_retries_per_case": 15},
        headers={"X-Merchant-ID": policy_merchant},
    )
    assert resp.status_code == 400
    assert "max_retries_per_case" in resp.get_json()["error"]["message"]

    # Invalid interval (< 1)
    resp2 = client.put(
        "/api/v1/policies",
        json={"min_retry_interval_hours": 0},
        headers={"X-Merchant-ID": policy_merchant},
    )
    assert resp2.status_code == 400

    # Invalid confidence threshold (> 1.0)
    resp3 = client.put(
        "/api/v1/policies",
        json={"min_confidence_threshold": 1.5},
        headers={"X-Merchant-ID": policy_merchant},
    )
    assert resp3.status_code == 400


def test_preview_policy_changes_endpoint(client: FlaskClient, policy_merchant: str):
    preview_payload = {
        "max_retries_per_case": 4,
        "min_retry_interval_hours": 12,
        "high_value_threshold_inr": 20000.0,
    }
    resp = client.post(
        "/api/v1/policies/preview",
        json=preview_payload,
        headers={"X-Merchant-ID": policy_merchant},
    )
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["has_changes"] is True
    assert len(data["diffs"]) >= 1
    assert len(data["impact_notes"]) >= 1


def test_policy_tenant_isolation(client: FlaskClient, policy_merchant: str, uow: UnitOfWork):
    # Create second merchant
    other_id = f"m_other_{uuid.uuid4().hex[:6]}"
    with uow:
        m2 = Merchant(id=other_id, name="Other Merchant", razorpay_account_id=f"acc_{other_id}")
        uow.merchants.add(m2)
        uow.commit()

    # Update policy for first merchant
    client.put(
        "/api/v1/policies",
        json={"max_retries_per_case": 7},
        headers={"X-Merchant-ID": policy_merchant},
    )

    # Check second merchant's policy is untouched default
    resp_other = client.get("/api/v1/policies", headers={"X-Merchant-ID": other_id})
    assert resp_other.status_code == 200
    assert resp_other.get_json()["max_retries_per_case"] == 3


def test_get_analytics_overview_endpoint(client: FlaskClient, policy_merchant: str):
    resp = client.get("/api/v1/analytics/overview", headers={"X-Merchant-ID": policy_merchant})
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["merchant_id"] == policy_merchant
    assert data["total_cases_count"] >= 1
    assert data["recovered_cases_count"] >= 1
    assert data["recovered_revenue_inr"] >= 6000.0
