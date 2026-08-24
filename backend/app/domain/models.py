"""SQLAlchemy 2.0 ORM domain models with full constraints and typing."""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional
import uuid

from sqlalchemy import (
    Boolean, CheckConstraint, Column, DateTime, ForeignKey, Index,
    Integer, Numeric, String, Text, UniqueConstraint
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship
from sqlalchemy.types import JSON


class Base(DeclarativeBase):
    """Base declarative class for all models."""
    pass


# Type-safe cross-database JSON column definition
JsonType = JSON().with_variant(JSONB, "postgresql")


def utc_now() -> datetime:
    """Return timezone-aware current UTC timestamp."""
    return datetime.now(timezone.utc)


def generate_uuid(prefix: str = "") -> str:
    """Generate a prefixed UUID string strictly guaranteed to fit within VARCHAR(36)."""
    raw_hex = uuid.uuid4().hex
    if prefix:
        avail = 35 - len(prefix)
        return f"{prefix}_{raw_hex[:avail]}"
    return str(uuid.uuid4())


class Merchant(Base):
    __tablename__ = "merchants"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: generate_uuid("merch"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    razorpay_account_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    policy: Mapped[Optional["RecoveryPolicy"]] = relationship("RecoveryPolicy", back_populates="merchant", uselist=False, cascade="all, delete-orphan")
    customers: Mapped[List["Customer"]] = relationship("Customer", back_populates="merchant", cascade="all, delete-orphan")
    cases: Mapped[List["RecoveryCase"]] = relationship("RecoveryCase", back_populates="merchant")
    audit_events: Mapped[List["AuditEvent"]] = relationship("AuditEvent", back_populates="merchant")

    __table_args__ = (
        Index("ix_merchants_razorpay_account_id", "razorpay_account_id"),
    )


class RecoveryPolicy(Base):
    __tablename__ = "recovery_policies"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: generate_uuid("pol"))
    merchant_id: Mapped[str] = mapped_column(String(36), ForeignKey("merchants.id", ondelete="RESTRICT"), nullable=False, unique=True)
    max_retries_per_case: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    min_retry_interval_hours: Mapped[int] = mapped_column(Integer, default=24, nullable=False)
    max_recovery_window_days: Mapped[int] = mapped_column(Integer, default=14, nullable=False)
    min_confidence_threshold: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=Decimal("0.75"), nullable=False)
    high_value_threshold_inr: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("10000.00"), nullable=False)
    max_customer_contacts_per_cycle: Mapped[int] = mapped_column(Integer, default=3, nullable=False)
    hard_decline_auto_stop: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    merchant: Mapped["Merchant"] = relationship("Merchant", back_populates="policy")

    __table_args__ = (
        CheckConstraint("max_retries_per_case >= 1 AND max_retries_per_case <= 10", name="chk_pol_max_retries"),
        CheckConstraint("min_retry_interval_hours >= 1 AND min_retry_interval_hours <= 168", name="chk_pol_min_interval"),
        CheckConstraint("max_recovery_window_days >= 1 AND max_recovery_window_days <= 60", name="chk_pol_recovery_window"),
        CheckConstraint("min_confidence_threshold >= 0.0 AND min_confidence_threshold <= 1.0", name="chk_pol_confidence"),
        CheckConstraint("high_value_threshold_inr >= 0", name="chk_pol_high_value"),
        CheckConstraint("max_customer_contacts_per_cycle >= 1 AND max_customer_contacts_per_cycle <= 10", name="chk_pol_max_contacts"),
        Index("ix_recovery_policies_merchant_id", "merchant_id"),
    )


class WebhookEvent(Base):
    __tablename__ = "webhook_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: generate_uuid("evt"))
    event_id: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    payload: Mapped[Dict[str, Any]] = mapped_column(JsonType, nullable=False)
    signature_verified: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    processed: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    __table_args__ = (
        Index("ix_webhook_events_event_id", "event_id"),
        Index("ix_webhook_events_event_type", "event_type"),
        Index("ix_webhook_events_processed", "processed"),
    )


class Customer(Base):
    __tablename__ = "customers"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: generate_uuid("cust"))
    merchant_id: Mapped[str] = mapped_column(String(36), ForeignKey("merchants.id", ondelete="RESTRICT"), nullable=False)
    razorpay_customer_id: Mapped[str] = mapped_column(String(64), nullable=False)
    email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    contact: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    tenure_months: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    historical_success_rate: Mapped[Decimal] = mapped_column(Numeric(3, 2), default=Decimal("1.00"), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    merchant: Mapped["Merchant"] = relationship("Merchant", back_populates="customers")
    subscriptions: Mapped[List["Subscription"]] = relationship("Subscription", back_populates="customer", cascade="all, delete-orphan")

    __table_args__ = (
        UniqueConstraint("merchant_id", "razorpay_customer_id", name="uq_customer_merchant_rzp_id"),
        CheckConstraint("tenure_months >= 0", name="chk_customer_tenure"),
        CheckConstraint("historical_success_rate >= 0.0 AND historical_success_rate <= 1.0", name="chk_customer_success_rate"),
        Index("ix_customers_merchant_razorpay_id", "merchant_id", "razorpay_customer_id"),
    )


class Subscription(Base):
    __tablename__ = "subscriptions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: generate_uuid("sub"))
    merchant_id: Mapped[str] = mapped_column(String(36), ForeignKey("merchants.id", ondelete="RESTRICT"), nullable=False)
    customer_id: Mapped[str] = mapped_column(String(36), ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False)
    razorpay_subscription_id: Mapped[str] = mapped_column(String(64), nullable=False, unique=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False)
    plan_id: Mapped[str] = mapped_column(String(64), nullable=False)
    current_cycle: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)

    customer: Mapped["Customer"] = relationship("Customer", back_populates="subscriptions")
    cases: Mapped[List["RecoveryCase"]] = relationship("RecoveryCase", back_populates="subscription")

    __table_args__ = (
        CheckConstraint("current_cycle >= 1", name="chk_subscription_cycle"),
        Index("ix_subscriptions_razorpay_id", "razorpay_subscription_id"),
        Index("ix_subscriptions_status", "status"),
    )


class RecoveryCase(Base):
    __tablename__ = "recovery_cases"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: generate_uuid("case"))
    merchant_id: Mapped[str] = mapped_column(String(36), ForeignKey("merchants.id", ondelete="RESTRICT"), nullable=False)
    subscription_id: Mapped[str] = mapped_column(String(36), ForeignKey("subscriptions.id", ondelete="RESTRICT"), nullable=False)
    invoice_id: Mapped[str] = mapped_column(String(64), nullable=False)
    payment_id: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    amount_inr: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(3), default="INR", nullable=False)
    stage: Mapped[str] = mapped_column(String(32), nullable=False)  # PENDING_OBSERVATION / HALTED_RECOVERY
    state: Mapped[str] = mapped_column(String(32), nullable=False)  # DETECTED, SCHEDULED, RECOVERED, etc.
    failure_category: Mapped[Optional[str]] = mapped_column(String(32), nullable=True)
    failure_code: Mapped[Optional[str]] = mapped_column(String(64), nullable=True)
    attempt_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    contacts_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    recovered_amount_inr: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=Decimal("0.00"), nullable=False)
    version: Mapped[int] = mapped_column(Integer, default=1, nullable=False)  # Optimistic Concurrency Lock
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, onupdate=utc_now, nullable=False)
    resolved_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    merchant: Mapped["Merchant"] = relationship("Merchant", back_populates="cases")
    subscription: Mapped["Subscription"] = relationship("Subscription", back_populates="cases")
    decisions: Mapped[List["RecoveryDecision"]] = relationship("RecoveryDecision", back_populates="recovery_case", cascade="all, delete-orphan")
    actions: Mapped[List["RecoveryAction"]] = relationship("RecoveryAction", back_populates="recovery_case", cascade="all, delete-orphan")
    audit_events: Mapped[List["AuditEvent"]] = relationship("AuditEvent", back_populates="recovery_case")

    __table_args__ = (
        UniqueConstraint("merchant_id", "invoice_id", name="uq_case_merchant_invoice_id"),
        CheckConstraint("amount_inr > 0", name="chk_case_amount"),
        CheckConstraint("recovered_amount_inr >= 0", name="chk_case_recovered_amount"),
        CheckConstraint("attempt_count >= 0", name="chk_case_attempt_count"),
        CheckConstraint("contacts_count >= 0", name="chk_case_contacts_count"),
        CheckConstraint("version >= 1", name="chk_case_version"),
        Index("ix_recovery_cases_merchant_state", "merchant_id", "state"),
        Index("ix_recovery_cases_subscription", "subscription_id"),
        Index("ix_recovery_cases_created_at", "created_at"),
    )


class RecoveryDecision(Base):
    __tablename__ = "recovery_decisions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: generate_uuid("dec"))
    recovery_case_id: Mapped[str] = mapped_column(String(36), ForeignKey("recovery_cases.id", ondelete="CASCADE"), nullable=False)
    recommended_action: Mapped[str] = mapped_column(String(64), nullable=False)
    delay_hours: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    confidence: Mapped[Decimal] = mapped_column(Numeric(3, 2), nullable=False)
    reasoning: Mapped[str] = mapped_column(Text, nullable=False)
    risk_flags: Mapped[List[str]] = mapped_column(JsonType, default=list, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    recovery_case: Mapped["RecoveryCase"] = relationship("RecoveryCase", back_populates="decisions")

    __table_args__ = (
        CheckConstraint("delay_hours >= 0 AND delay_hours <= 168", name="chk_decision_delay"),
        CheckConstraint("confidence >= 0.0 AND confidence <= 1.0", name="chk_decision_confidence"),
        Index("ix_recovery_decisions_case_id", "recovery_case_id"),
    )


class RecoveryAction(Base):
    __tablename__ = "recovery_actions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: generate_uuid("act"))
    recovery_case_id: Mapped[str] = mapped_column(String(36), ForeignKey("recovery_cases.id", ondelete="CASCADE"), nullable=False)
    action_type: Mapped[str] = mapped_column(String(64), nullable=False)
    idempotency_key: Mapped[str] = mapped_column(String(128), nullable=False, unique=True)
    status: Mapped[str] = mapped_column(String(32), nullable=False)  # PENDING, EXECUTED, FAILED
    external_reference_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    executed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    recovery_case: Mapped["RecoveryCase"] = relationship("RecoveryCase", back_populates="actions")

    __table_args__ = (
        Index("ix_recovery_actions_case_id", "recovery_case_id"),
        Index("ix_recovery_actions_idempotency_key", "idempotency_key"),
    )


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: generate_uuid("aud"))
    merchant_id: Mapped[str] = mapped_column(String(36), ForeignKey("merchants.id", ondelete="RESTRICT"), nullable=False)
    recovery_case_id: Mapped[Optional[str]] = mapped_column(String(36), ForeignKey("recovery_cases.id", ondelete="SET NULL"), nullable=True)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False)
    actor: Mapped[str] = mapped_column(String(64), nullable=False)  # SYSTEM, AI_ENGINE, POLICY_GATE, MERCHANT_USER
    payload: Mapped[Dict[str, Any]] = mapped_column(JsonType, nullable=False)
    correlation_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    merchant: Mapped["Merchant"] = relationship("Merchant", back_populates="audit_events")
    recovery_case: Mapped[Optional["RecoveryCase"]] = relationship("RecoveryCase", back_populates="audit_events")

    __table_args__ = (
        Index("ix_audit_events_merchant_id", "merchant_id"),
        Index("ix_audit_events_case_id", "recovery_case_id"),
        Index("ix_audit_events_created_at", "created_at"),
    )


class EvaluationRun(Base):
    __tablename__ = "evaluation_runs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: generate_uuid("run"))
    dataset_name: Mapped[str] = mapped_column(String(128), nullable=False)
    baseline_mode: Mapped[str] = mapped_column(String(64), nullable=False)
    metrics_summary: Mapped[Dict[str, Any]] = mapped_column(JsonType, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    results: Mapped[List["EvaluationScenarioResult"]] = relationship("EvaluationScenarioResult", back_populates="run", cascade="all, delete-orphan")


class EvaluationScenarioResult(Base):
    __tablename__ = "evaluation_scenario_results"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: generate_uuid("res"))
    evaluation_run_id: Mapped[str] = mapped_column(String(36), ForeignKey("evaluation_runs.id", ondelete="CASCADE"), nullable=False)
    scenario_id: Mapped[str] = mapped_column(String(64), nullable=False)
    actual_outcome: Mapped[str] = mapped_column(String(32), nullable=False)
    simulated_outcome: Mapped[str] = mapped_column(String(32), nullable=False)
    details: Mapped[Dict[str, Any]] = mapped_column(JsonType, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now, nullable=False)

    run: Mapped["EvaluationRun"] = relationship("EvaluationRun", back_populates="results")

    __table_args__ = (
        Index("ix_eval_results_run_id", "evaluation_run_id"),
    )
