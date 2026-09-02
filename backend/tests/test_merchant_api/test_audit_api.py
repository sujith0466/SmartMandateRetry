"""Integration tests for Merchant Audit Events API filtering and search."""

from decimal import Decimal
import uuid
import pytest
from flask.testing import FlaskClient

from app.domain.models import AuditEvent, Customer, Merchant, RecoveryCase, Subscription
from app.infrastructure.repositories.unit_of_work import UnitOfWork


@pytest.fixture
def populated_audit_merchant(uow: UnitOfWork) -> tuple[str, str, str]:
    uid = uuid.uuid4().hex[:6]
    merch_id = f"m_audit_{uid}"
    target_case_id = f"case_target_{uid}"
    other_case_id = f"case_other_{uid}"

    with uow:
        m = Merchant(id=merch_id, name=f"Audit Merchant {uid}", razorpay_account_id=f"acc_audit_{uid}")
        c = Customer(id=f"c_audit_{uid}", merchant_id=m.id, razorpay_customer_id=f"cust_audit_{uid}", email="audit@example.com", contact="+919876543210")
        s = Subscription(id=f"s_audit_{uid}", merchant_id=m.id, customer_id=c.id, razorpay_subscription_id=f"sub_audit_{uid}", status="halted", plan_id="p_gold")
        
        case1 = RecoveryCase(
            id=target_case_id,
            merchant_id=m.id,
            subscription_id=s.id,
            invoice_id=f"inv_target_{uid}",
            payment_id=f"pay_target_{uid}",
            amount_inr=Decimal("2499.00"),
            currency="INR",
            stage="HALTED_RECOVERY",
            state="RECOVERED",
            version=1,
        )
        case2 = RecoveryCase(
            id=other_case_id,
            merchant_id=m.id,
            subscription_id=s.id,
            invoice_id=f"inv_other_{uid}",
            payment_id=f"pay_other_{uid}",
            amount_inr=Decimal("1999.00"),
            currency="INR",
            stage="HALTED_RECOVERY",
            state="FAILED",
            version=1,
        )

        ev1 = AuditEvent(
            id=f"aud_target_{uid}",
            merchant_id=merch_id,
            recovery_case_id=target_case_id,
            correlation_id=f"corr_target_{uid}",
            event_type="POLICY_DECISION_EVALUATED",
            actor="SYSTEM_ENGINE",
            payload={"test": 1},
        )
        ev2 = AuditEvent(
            id=f"aud_other_{uid}",
            merchant_id=merch_id,
            recovery_case_id=other_case_id,
            correlation_id=f"corr_other_{uid}",
            event_type="PAYMENT_FAILURE_CLASSIFIED",
            actor="WEBHOOK_INGESTION",
            payload={"test": 2},
        )
        uow.merchants.add(m)
        uow.customers.add(c)
        uow.subscriptions.add(s)
        uow.cases.add(case1)
        uow.cases.add(case2)
        uow.audit_events.add(ev1)
        uow.audit_events.add(ev2)
        uow.commit()

    return merch_id, target_case_id, other_case_id


def test_audit_events_search_and_filtering(client: FlaskClient, populated_audit_merchant):
    merch_id, target_case_id, other_case_id = populated_audit_merchant
    headers = {"X-Merchant-ID": merch_id}

    # 1. Search by Case ID
    res = client.get(f"/api/v1/audit-events?search={target_case_id}", headers=headers)
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert len(data) == 1
    assert data[0]["recovery_case_id"] == target_case_id

    # 2. Search by Correlation ID
    uid = target_case_id.split("_")[-1]
    res = client.get(f"/api/v1/audit-events?search=corr_other_{uid}", headers=headers)
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert len(data) == 1
    assert data[0]["recovery_case_id"] == other_case_id

    # 3. Search combined with event_type filter
    res = client.get(f"/api/v1/audit-events?search={target_case_id}&event_type=POLICY_DECISION_EVALUATED", headers=headers)
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert len(data) == 1
    assert data[0]["event_type"] == "POLICY_DECISION_EVALUATED"

    # 4. Search with non-matching query
    res = client.get("/api/v1/audit-events?search=NONEXISTENT_QUERY_999", headers=headers)
    assert res.status_code == 200
    data = res.get_json()["data"]
    assert len(data) == 0

    # 5. Export CSV with search filter
    res_csv = client.get(f"/api/v1/audit-events/export?search={target_case_id}", headers=headers)
    assert res_csv.status_code == 200
    assert "text/csv" in res_csv.content_type
    csv_text = res_csv.get_data(as_text=True)
    assert target_case_id in csv_text
    assert other_case_id not in csv_text
