"""Phase 20: Production Security, Multi-Tenant Isolation, and IDOR Resistance Tests."""

from decimal import Decimal
import uuid
import pytest
from flask.testing import FlaskClient

from app.domain.models import Customer, Merchant, RecoveryCase, RecoveryPolicy, Subscription
from app.infrastructure.repositories.unit_of_work import UnitOfWork


class TestSecurityIsolation:
    def test_merchant_isolation_on_cases_api(self, client: FlaskClient, uow: UnitOfWork):
        """Test IDOR protection: Merchant B cannot access Merchant A cases."""
        uid_a = uuid.uuid4().hex[:6]
        uid_b = uuid.uuid4().hex[:6]
        merch_a = f"m_a_{uid_a}"
        merch_b = f"m_b_{uid_b}"
        case_a_id = f"case_a_{uid_a}"

        with uow:
            m_a = Merchant(id=merch_a, name="Merchant A", razorpay_account_id=f"acc_a_{uid_a}")
            m_b = Merchant(id=merch_b, name="Merchant B", razorpay_account_id=f"acc_b_{uid_b}")
            c_a = Customer(id=f"c_a_{uid_a}", merchant_id=merch_a, razorpay_customer_id=f"cust_a_{uid_a}")
            s_a = Subscription(id=f"s_a_{uid_a}", merchant_id=merch_a, customer_id=c_a.id, razorpay_subscription_id=f"sub_a_{uid_a}", status="active", plan_id="p1")
            case_a = RecoveryCase(id=case_a_id, merchant_id=merch_a, subscription_id=s_a.id, invoice_id=f"inv_a_{uid_a}", amount_inr=Decimal("500.00"), currency="INR", stage="HALTED_RECOVERY", state="IN_PROGRESS")
            uow.merchants.add(m_a)
            uow.merchants.add(m_b)
            uow.customers.add(c_a)
            uow.subscriptions.add(s_a)
            uow.cases.add(case_a)
            uow.commit()

        # Merchant B tries to query Merchant A case ID
        resp = client.get(f"/api/v1/cases/{case_a_id}", headers={"X-Merchant-ID": merch_b})
        assert resp.status_code in (403, 404)

        # Merchant A queries own case ID -> 200 OK
        resp_valid = client.get(f"/api/v1/cases/{case_a_id}", headers={"X-Merchant-ID": merch_a})
        assert resp_valid.status_code == 200

    def test_missing_merchant_header_rejected(self, client: FlaskClient):
        """Test that unauthenticated requests to protected endpoints return 401."""
        resp = client.get("/api/v1/cases")
        assert resp.status_code == 401
