"""Repositories layer unit and integration tests."""

from decimal import Decimal
import pytest
from app.domain.models import Customer, Merchant, RecoveryCase, Subscription
from app.infrastructure.repositories.unit_of_work import UnitOfWork


def test_merchant_and_policy_repositories(uow: UnitOfWork):
    with uow:
        m = Merchant(
            id="m_repo_test",
            name="Repo Merchant",
            razorpay_account_id="acc_repo_001"
        )
        uow.merchants.add(m)
        uow.flush()

        found_m = uow.merchants.find_by_razorpay_account("acc_repo_001")
        assert found_m is not None
        assert found_m.id == "m_repo_test"

        assert uow.merchants.count() >= 1


def test_webhook_event_idempotent_insert(uow: UnitOfWork):
    with uow:
        event, created_1 = uow.webhook_events.insert_if_not_exists(
            event_id="evt_test_unique_99",
            event_type="subscription.halted",
            payload={"test": "data"},
            signature_verified=True
        )
        assert created_1 is True
        assert event.event_id == "evt_test_unique_99"

        # Second insert with identical event_id
        same_event, created_2 = uow.webhook_events.insert_if_not_exists(
            event_id="evt_test_unique_99",
            event_type="subscription.halted",
            payload={"test": "duplicate_call"},
        )
        assert created_2 is False
        assert same_event.id == event.id


def test_audit_event_append_only(uow: UnitOfWork):
    with uow:
        m = Merchant(id="m_aud_test", name="Aud Merchant", razorpay_account_id="acc_aud_01")
        uow.merchants.add(m)
        uow.flush()

        uow.audit_events.record_event(
            merchant_id=m.id,
            event_type="POLICY_RULE_CHECK",
            actor="POLICY_GATE",
            payload={"rule": "max_retries", "verdict": "APPROVED"}
        )
        uow.audit_events.record_event(
            merchant_id=m.id,
            event_type="RECOVERY_INITIATED",
            actor="AI_ENGINE",
            payload={"action": "PAYMENT_LINK_RECOVERY"}
        )
        uow.flush()

        events = uow.audit_events.find_by_merchant(m.id)
        assert len(events) == 2
        assert events[0].event_type == "RECOVERY_INITIATED"  # ordered by created_at desc
