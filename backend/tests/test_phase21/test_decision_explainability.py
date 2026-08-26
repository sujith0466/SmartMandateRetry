"""Phase 21: Decision Explainability and Attribution Tests."""

from decimal import Decimal
import uuid
import pytest
from flask.testing import FlaskClient

from app.domain.decision_explainability import DecisionExplainabilityBuilder
from app.domain.models import Customer, Merchant, RecoveryCase, Subscription
from app.infrastructure.repositories.unit_of_work import UnitOfWork


class TestDecisionExplainability:
    def test_build_attribution_allowed_case(self):
        """Test attribution structure for an authorized AI decision."""
        attr = DecisionExplainabilityBuilder.build_attribution(
            case_id="case_exp_01",
            ai_action="PAYMENT_LINK_DELIVERY",
            ai_confidence=0.92,
            policy_status="ALLOWED",
            final_action="PAYMENT_LINK_DELIVERY",
            policy_reasons=[],
            policy_rules_applied=[],
            amount_inr=4500.00,
            attempt_count=1,
            max_retries=3,
            is_hard_decline=False,
            prior_successful_recoveries=3,
        )

        assert attr.case_id == "case_exp_01"
        assert attr.policy_status == "ALLOWED"
        assert attr.final_action == "PAYMENT_LINK_DELIVERY"
        assert attr.governing_authority == "AI_PROPOSED_POLICY_AUTHORIZED"
        assert len(attr.factor_weights) == 4
        assert any(fw.factor_name == "failure_recoverability" and fw.impact == "POSITIVE" for fw in attr.factor_weights)
        assert any(fw.factor_name == "customer_history" and fw.impact == "POSITIVE" for fw in attr.factor_weights)

    def test_build_attribution_blocked_hard_decline(self):
        """Test attribution structure when policy engine vetoes a hard decline."""
        attr = DecisionExplainabilityBuilder.build_attribution(
            case_id="case_exp_02",
            ai_action="SCHEDULE_RETRY",
            ai_confidence=0.85,
            policy_status="BLOCKED",
            final_action="STOP_RECOVERY",
            policy_reasons=["Terminal non-recoverable error code"],
            policy_rules_applied=["HARD_DECLINE_SAFETY_RULE"],
            amount_inr=12000.00,
            attempt_count=1,
            max_retries=3,
            is_hard_decline=True,
            prior_successful_recoveries=0,
        )

        assert attr.policy_status == "BLOCKED"
        assert attr.final_action == "STOP_RECOVERY"
        assert attr.governing_authority == "POLICY_ENGINE_SAFETY_GATE (VETO)"
        assert attr.policy_override_explanation is not None
        assert "vetoed AI recommendation" in attr.policy_override_explanation
        assert any(fw.factor_name == "failure_recoverability" and fw.impact == "NEGATIVE" for fw in attr.factor_weights)

    def test_case_explainability_api(self, client: FlaskClient, uow: UnitOfWork):
        """Test GET /api/v1/cases/<case_id>/explainability endpoint."""
        uid = uuid.uuid4().hex[:6]
        merch_id = f"m_exp_{uid}"
        cust_id = f"cust_exp_{uid}"
        sub_id = f"sub_exp_{uid}"
        case_id = f"case_exp_{uid}"

        with uow:
            m = Merchant(id=merch_id, name=f"Exp Merchant {uid}", razorpay_account_id=f"acc_{uid}")
            c = Customer(id=cust_id, merchant_id=merch_id, email=f"exp_{uid}@example.com", contact="+919876543210", razorpay_customer_id=f"rzp_cust_{uid}")
            s = Subscription(id=sub_id, merchant_id=merch_id, customer_id=cust_id, status="active", plan_id="plan_01", razorpay_subscription_id=f"rzp_sub_{uid}")
            rc = RecoveryCase(
                id=case_id,
                merchant_id=merch_id,
                subscription_id=sub_id,
                invoice_id=f"inv_exp_{uid}",
                payment_id=f"pay_exp_{uid}",
                amount_inr=Decimal("3500.00"),
                currency="INR",
                stage="PENDING_OBSERVATION",
                state="DETECTED",
                failure_category="TEMPORARY",
                attempt_count=1,
                contacts_count=1,
            )
            uow.merchants.add(m)
            uow.customers.add(c)
            uow.subscriptions.add(s)
            uow.cases.add(rc)
            uow.commit()

        resp = client.get(f"/api/v1/cases/{case_id}/explainability", headers={"X-Merchant-ID": merch_id})
        assert resp.status_code == 200
        data = resp.get_json()

        assert data["case_id"] == case_id
        assert "factor_weights" in data
        assert len(data["factor_weights"]) == 4
        assert "governing_authority" in data
        assert "summary" in data
