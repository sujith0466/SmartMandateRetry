"""Anti-IDOR and tenant isolation security tests for Merchant API."""

from decimal import Decimal
import uuid
import pytest
from flask.testing import FlaskClient

from app.domain.models import Customer, Merchant, RecoveryCase, Subscription
from app.infrastructure.repositories.unit_of_work import UnitOfWork


@pytest.fixture
def two_merchants(uow: UnitOfWork) -> tuple[str, str, str, str]:
    uid1 = uuid.uuid4().hex[:6]
    uid2 = uuid.uuid4().hex[:6]
    m1_id = f"m1_{uid1}"
    m2_id = f"m2_{uid2}"
    case1_id = f"case_m1_{uid1}"
    case2_id = f"case_m2_{uid2}"

    with uow:
        m1 = Merchant(id=m1_id, name=f"Merchant 1 {uid1}", razorpay_account_id=f"acc_m1_{uid1}")
        m2 = Merchant(id=m2_id, name=f"Merchant 2 {uid2}", razorpay_account_id=f"acc_m2_{uid2}")
        c1 = Customer(id=f"c1_{uid1}", merchant_id=m1.id, razorpay_customer_id=f"cust_m1_{uid1}")
        c2 = Customer(id=f"c2_{uid2}", merchant_id=m2.id, razorpay_customer_id=f"cust_m2_{uid2}")
        s1 = Subscription(id=f"s1_{uid1}", merchant_id=m1.id, customer_id=c1.id, razorpay_subscription_id=f"sub_m1_{uid1}", status="active", plan_id="p1")
        s2 = Subscription(id=f"s2_{uid2}", merchant_id=m2.id, customer_id=c2.id, razorpay_subscription_id=f"sub_m2_{uid2}", status="active", plan_id="p2")

        case1 = RecoveryCase(id=case1_id, merchant_id=m1.id, subscription_id=s1.id, invoice_id=f"inv_m1_{uid1}", amount_inr=Decimal("1000.00"), currency="INR", stage="HALTED_RECOVERY", state="SCHEDULED")
        case2 = RecoveryCase(id=case2_id, merchant_id=m2.id, subscription_id=s2.id, invoice_id=f"inv_m2_{uid2}", amount_inr=Decimal("2000.00"), currency="INR", stage="HALTED_RECOVERY", state="SCHEDULED")

        uow.merchants.add(m1)
        uow.merchants.add(m2)
        uow.customers.add(c1)
        uow.customers.add(c2)
        uow.subscriptions.add(s1)
        uow.subscriptions.add(s2)
        uow.cases.add(case1)
        uow.cases.add(case2)
        uow.audit_events.record_event(merchant_id=m1.id, event_type="RECOVERY_STATE_TRANSITIONED", actor="SYSTEM", payload={}, recovery_case_id=case1.id, correlation_id=f"corr1_{uid1}")
        uow.audit_events.record_event(merchant_id=m2.id, event_type="RECOVERY_STATE_TRANSITIONED", actor="SYSTEM", payload={}, recovery_case_id=case2.id, correlation_id=f"corr2_{uid2}")
        uow.commit()

    return m1_id, m2_id, case1_id, case2_id


def test_merchant_cannot_read_other_merchant_case(client: FlaskClient, two_merchants):
    m1_id, m2_id, case1_id, case2_id = two_merchants

    # Merchant 1 attempts to access Merchant 2's case -> 404 (anti-enumeration)
    resp = client.get(f"/api/v1/cases/{case2_id}", headers={"X-Merchant-ID": m1_id})
    assert resp.status_code == 404
    data = resp.get_json()
    assert data["error"]["code"] == "NOT_FOUND"


def test_merchant_case_list_only_returns_own_cases(client: FlaskClient, two_merchants):
    m1_id, m2_id, case1_id, case2_id = two_merchants

    resp = client.get("/api/v1/cases", headers={"X-Merchant-ID": m1_id})
    assert resp.status_code == 200
    data = resp.get_json()
    case_ids = [c["id"] for c in data["data"]]
    assert case1_id in case_ids
    assert case2_id not in case_ids


def test_merchant_cannot_read_other_merchant_audit_events(client: FlaskClient, two_merchants):
    m1_id, m2_id, case1_id, case2_id = two_merchants

    resp = client.get("/api/v1/audit-events", headers={"X-Merchant-ID": m1_id})
    assert resp.status_code == 200
    data = resp.get_json()
    case_ids = [ev["recovery_case_id"] for ev in data["data"]]
    assert case2_id not in case_ids
