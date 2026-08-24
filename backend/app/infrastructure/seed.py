"""Deterministic synthetic seed data factory for SmartMandateRetry."""

import logging
from decimal import Decimal
from typing import Optional

from app.core.logging import get_logger
from app.domain.models import (
    AuditEvent, Customer, Merchant, RecoveryAction,
    RecoveryCase, RecoveryDecision, RecoveryPolicy, Subscription
)
from app.infrastructure.database import get_session
from app.infrastructure.repositories.unit_of_work import UnitOfWork

logger = get_logger("smartmandate.seed")


def seed_database(uow: Optional[UnitOfWork] = None) -> None:
    """Populate database with deterministic synthetic seed entities."""
    if uow is None:
        uow = UnitOfWork(get_session)

    with uow:
        # 1. Seed or find default merchant
        merchant = uow.merchants.find_by_razorpay_account("acc_rzp_demo_merchant_001")
        if not merchant:
            merchant = Merchant(
                id="merch_demo_0001",
                name="SaaS Metrics Cloud Pvt Ltd",
                razorpay_account_id="acc_rzp_demo_merchant_001",
            )
            uow.merchants.add(merchant)
            uow.flush()
            logger.info("Created seed merchant", merchant_id=merchant.id)

        # 2. Seed policy
        policy = uow.policies.find_by_merchant_id(merchant.id)
        if not policy:
            policy = RecoveryPolicy(
                id="pol_demo_0001",
                merchant_id=merchant.id,
                max_retries_per_case=3,
                min_retry_interval_hours=24,
                max_recovery_window_days=14,
                min_confidence_threshold=Decimal("0.75"),
                high_value_threshold_inr=Decimal("10000.00"),
                max_customer_contacts_per_cycle=3,
                hard_decline_auto_stop=True,
            )
            uow.policies.add(policy)
            logger.info("Created seed recovery policy", policy_id=policy.id)

        # 3. Seed customers
        cust_1 = uow.customers.find_by_razorpay_id(merchant.id, "cust_rzp_001")
        if not cust_1:
            cust_1 = Customer(
                id="cust_demo_0001",
                merchant_id=merchant.id,
                razorpay_customer_id="cust_rzp_001",
                email="anand.verma@example.com",
                contact="+919876543210",
                tenure_months=18,
                historical_success_rate=Decimal("0.95"),
            )
            uow.customers.add(cust_1)

        cust_2 = uow.customers.find_by_razorpay_id(merchant.id, "cust_rzp_002")
        if not cust_2:
            cust_2 = Customer(
                id="cust_demo_0002",
                merchant_id=merchant.id,
                razorpay_customer_id="cust_rzp_002",
                email="priya.sharma@example.com",
                contact="+919876543211",
                tenure_months=2,
                historical_success_rate=Decimal("0.50"),
            )
            uow.customers.add(cust_2)

        uow.flush()

        # 4. Seed Subscriptions
        sub_1 = uow.subscriptions.find_by_razorpay_id("sub_rzp_mandate_001")
        if not sub_1:
            sub_1 = Subscription(
                id="sub_demo_0001",
                merchant_id=merchant.id,
                customer_id=cust_1.id,
                razorpay_subscription_id="sub_rzp_mandate_001",
                status="pending",
                plan_id="plan_pro_monthly",
                current_cycle=6,
            )
            uow.subscriptions.add(sub_1)

        sub_2 = uow.subscriptions.find_by_razorpay_id("sub_rzp_mandate_002")
        if not sub_2:
            sub_2 = Subscription(
                id="sub_demo_0002",
                merchant_id=merchant.id,
                customer_id=cust_2.id,
                razorpay_subscription_id="sub_rzp_mandate_002",
                status="halted",
                plan_id="plan_enterprise_annual",
                current_cycle=1,
            )
            uow.subscriptions.add(sub_2)

        uow.flush()

        # 5. Seed Recovery Cases
        case_1 = uow.cases.find_by_invoice_id(merchant.id, "inv_demo_001")
        if not case_1:
            case_1 = RecoveryCase(
                id="case_demo_0001",
                merchant_id=merchant.id,
                subscription_id=sub_1.id,
                invoice_id="inv_demo_001",
                payment_id="pay_failed_001",
                amount_inr=Decimal("2499.00"),
                stage="PENDING_OBSERVATION",
                state="SCHEDULED",
                failure_category="TEMPORARY",
                failure_code="insufficient_funds",
                attempt_count=0,
                contacts_count=0,
                recovered_amount_inr=Decimal("0.00"),
                version=1,
            )
            uow.cases.add(case_1)

        case_2 = uow.cases.find_by_invoice_id(merchant.id, "inv_demo_002")
        if not case_2:
            case_2 = RecoveryCase(
                id="case_demo_0002",
                merchant_id=merchant.id,
                subscription_id=sub_2.id,
                invoice_id="inv_demo_002",
                payment_id="pay_failed_002",
                amount_inr=Decimal("15000.00"),
                stage="HALTED_RECOVERY",
                state="ACTION_PENDING",
                failure_category="ACTION_REQUIRED",
                failure_code="card_expired",
                attempt_count=1,
                contacts_count=1,
                recovered_amount_inr=Decimal("0.00"),
                version=1,
            )
            uow.cases.add(case_2)

        uow.flush()

        # 6. Seed Audit Event
        uow.audit_events.record_event(
            merchant_id=merchant.id,
            recovery_case_id=case_1.id,
            event_type="CASE_INITIALIZED",
            actor="SYSTEM",
            payload={"reason": "Synthetic seed initialization"},
            correlation_id="corr_seed_001"
        )

        uow.commit()
        logger.info("Database seeding completed successfully.")


if __name__ == "__main__":
    seed_database()
    print("Database seeding completed successfully!")
