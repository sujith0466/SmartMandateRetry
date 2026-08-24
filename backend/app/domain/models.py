"""SQLAlchemy 2.0 ORM domain models base."""

from datetime import datetime, timezone
from typing import Any, Optional
from sqlalchemy import (
    Boolean, Column, DateTime, ForeignKey, Integer,
    Numeric, String, Text
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    """Base declarative class for all models."""
    pass


class Merchant(Base):
    __tablename__ = "merchants"

    id = Column(String(36), primary_key=True)
    name = Column(String(255), nullable=False)
    razorpay_account_id = Column(String(64), nullable=False, unique=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    policies = relationship("RecoveryPolicy", back_populates="merchant", uselist=False)
    customers = relationship("Customer", back_populates="merchant")
    cases = relationship("RecoveryCase", back_populates="merchant")


class RecoveryPolicy(Base):
    __tablename__ = "recovery_policies"

    id = Column(String(36), primary_key=True)
    merchant_id = Column(String(36), ForeignKey("merchants.id"), nullable=False)
    max_retries_per_case = Column(Integer, default=3, nullable=False)
    min_retry_interval_hours = Column(Integer, default=24, nullable=False)
    max_recovery_window_days = Column(Integer, default=14, nullable=False)
    min_confidence_threshold = Column(Numeric(3, 2), default=0.75, nullable=False)
    high_value_threshold_inr = Column(Numeric(12, 2), default=10000.00, nullable=False)
    max_customer_contacts_per_cycle = Column(Integer, default=3, nullable=False)
    hard_decline_auto_stop = Column(Boolean, default=True, nullable=False)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    merchant = relationship("Merchant", back_populates="policies")


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id = Column(String(36), primary_key=True)
    event_id = Column(String(128), nullable=False, unique=True)
    event_type = Column(String(64), nullable=False)
    payload = Column(JSONB, nullable=False)
    signature_verified = Column(Boolean, default=False, nullable=False)
    processed = Column(Boolean, default=False, nullable=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))


class Customer(Base):
    __tablename__ = "customers"

    id = Column(String(36), primary_key=True)
    merchant_id = Column(String(36), ForeignKey("merchants.id"), nullable=False)
    razorpay_customer_id = Column(String(64), nullable=False)
    email = Column(String(255), nullable=True)
    contact = Column(String(32), nullable=True)
    tenure_months = Column(Integer, default=0)
    historical_success_rate = Column(Numeric(3, 2), default=1.00)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    merchant = relationship("Merchant", back_populates="customers")
    subscriptions = relationship("Subscription", back_populates="customer")


class Subscription(Base):
    __tablename__ = "subscriptions"

    id = Column(String(36), primary_key=True)
    merchant_id = Column(String(36), ForeignKey("merchants.id"), nullable=False)
    customer_id = Column(String(36), ForeignKey("customers.id"), nullable=False)
    razorpay_subscription_id = Column(String(64), nullable=False, unique=True)
    status = Column(String(32), nullable=False)
    plan_id = Column(String(64), nullable=False)
    current_cycle = Column(Integer, default=1)
    updated_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    customer = relationship("Customer", back_populates="subscriptions")
    cases = relationship("RecoveryCase", back_populates="subscription")


class RecoveryCase(Base):
    __tablename__ = "recovery_cases"

    id = Column(String(36), primary_key=True)
    merchant_id = Column(String(36), ForeignKey("merchants.id"), nullable=False)
    subscription_id = Column(String(36), ForeignKey("subscriptions.id"), nullable=False)
    invoice_id = Column(String(64), nullable=True)
    payment_id = Column(String(64), nullable=True)
    amount_inr = Column(Numeric(12, 2), nullable=False)
    currency = Column(String(3), default="INR")
    stage = Column(String(32), nullable=False)  # PENDING_OBSERVATION / HALTED_RECOVERY
    state = Column(String(32), nullable=False)  # DETECTED, SCHEDULED, RECOVERED, etc.
    failure_category = Column(String(32), nullable=True)
    failure_code = Column(String(64), nullable=True)
    attempt_count = Column(Integer, default=0)
    recovered_amount_inr = Column(Numeric(12, 2), default=0.00)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
    resolved_at = Column(DateTime(timezone=True), nullable=True)

    merchant = relationship("Merchant", back_populates="cases")
    subscription = relationship("Subscription", back_populates="cases")
    decisions = relationship("RecoveryDecision", back_populates="recovery_case")
    actions = relationship("RecoveryAction", back_populates="recovery_case")


class RecoveryDecision(Base):
    __tablename__ = "recovery_decisions"

    id = Column(String(36), primary_key=True)
    recovery_case_id = Column(String(36), ForeignKey("recovery_cases.id"), nullable=False)
    recommended_action = Column(String(64), nullable=False)
    delay_hours = Column(Integer, default=0)
    confidence = Column(Numeric(3, 2), nullable=False)
    reasoning = Column(Text, nullable=False)
    risk_flags = Column(JSONB, default=list)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    recovery_case = relationship("RecoveryCase", back_populates="decisions")


class RecoveryAction(Base):
    __tablename__ = "recovery_actions"

    id = Column(String(36), primary_key=True)
    recovery_case_id = Column(String(36), ForeignKey("recovery_cases.id"), nullable=False)
    action_type = Column(String(64), nullable=False)
    idempotency_key = Column(String(128), nullable=False, unique=True)
    status = Column(String(32), nullable=False)
    external_reference_id = Column(String(128), nullable=True)
    executed_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    recovery_case = relationship("RecoveryCase", back_populates="actions")


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id = Column(String(36), primary_key=True)
    merchant_id = Column(String(36), ForeignKey("merchants.id"), nullable=False)
    recovery_case_id = Column(String(36), ForeignKey("recovery_cases.id"), nullable=True)
    event_type = Column(String(64), nullable=False)
    actor = Column(String(64), nullable=False)
    payload = Column(JSONB, nullable=False)
    correlation_id = Column(String(128), nullable=True)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))
