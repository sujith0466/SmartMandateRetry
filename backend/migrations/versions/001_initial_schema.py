"""Initial database schema baseline.

Revision ID: 001_initial_schema
Revises: 
Create Date: 2026-08-24 16:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = "001_initial_schema"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. merchants
    op.create_table(
        "merchants",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("razorpay_account_id", sa.String(length=64), nullable=False, unique=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_merchants_razorpay_account_id", "merchants", ["razorpay_account_id"])

    # 2. recovery_policies
    op.create_table(
        "recovery_policies",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("merchant_id", sa.String(length=36), sa.ForeignKey("merchants.id", ondelete="RESTRICT"), nullable=False, unique=True),
        sa.Column("max_retries_per_case", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("min_retry_interval_hours", sa.Integer(), nullable=False, server_default="24"),
        sa.Column("max_recovery_window_days", sa.Integer(), nullable=False, server_default="14"),
        sa.Column("min_confidence_threshold", sa.Numeric(precision=3, scale=2), nullable=False, server_default="0.75"),
        sa.Column("high_value_threshold_inr", sa.Numeric(precision=12, scale=2), nullable=False, server_default="10000.00"),
        sa.Column("max_customer_contacts_per_cycle", sa.Integer(), nullable=False, server_default="3"),
        sa.Column("hard_decline_auto_stop", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("max_retries_per_case >= 1 AND max_retries_per_case <= 10", name="chk_pol_max_retries"),
        sa.CheckConstraint("min_retry_interval_hours >= 1 AND min_retry_interval_hours <= 168", name="chk_pol_min_interval"),
        sa.CheckConstraint("max_recovery_window_days >= 1 AND max_recovery_window_days <= 60", name="chk_pol_recovery_window"),
        sa.CheckConstraint("min_confidence_threshold >= 0.0 AND min_confidence_threshold <= 1.0", name="chk_pol_confidence"),
        sa.CheckConstraint("high_value_threshold_inr >= 0", name="chk_pol_high_value"),
        sa.CheckConstraint("max_customer_contacts_per_cycle >= 1 AND max_customer_contacts_per_cycle <= 10", name="chk_pol_max_contacts"),
    )
    op.create_index("ix_recovery_policies_merchant_id", "recovery_policies", ["merchant_id"])

    # 3. webhook_events
    op.create_table(
        "webhook_events",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("event_id", sa.String(length=128), nullable=False, unique=True),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("signature_verified", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("processed", sa.Boolean(), nullable=False, server_default="false"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_webhook_events_event_id", "webhook_events", ["event_id"])
    op.create_index("ix_webhook_events_event_type", "webhook_events", ["event_type"])
    op.create_index("ix_webhook_events_processed", "webhook_events", ["processed"])

    # 4. customers
    op.create_table(
        "customers",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("merchant_id", sa.String(length=36), sa.ForeignKey("merchants.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("razorpay_customer_id", sa.String(length=64), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=True),
        sa.Column("contact", sa.String(length=32), nullable=True),
        sa.Column("tenure_months", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("historical_success_rate", sa.Numeric(precision=3, scale=2), nullable=False, server_default="1.00"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.UniqueConstraint("merchant_id", "razorpay_customer_id", name="uq_customer_merchant_rzp_id"),
        sa.CheckConstraint("tenure_months >= 0", name="chk_customer_tenure"),
        sa.CheckConstraint("historical_success_rate >= 0.0 AND historical_success_rate <= 1.0", name="chk_customer_success_rate"),
    )
    op.create_index("ix_customers_merchant_razorpay_id", "customers", ["merchant_id", "razorpay_customer_id"])

    # 5. subscriptions
    op.create_table(
        "subscriptions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("merchant_id", sa.String(length=36), sa.ForeignKey("merchants.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("customer_id", sa.String(length=36), sa.ForeignKey("customers.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("razorpay_subscription_id", sa.String(length=64), nullable=False, unique=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("plan_id", sa.String(length=64), nullable=False),
        sa.Column("current_cycle", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("current_cycle >= 1", name="chk_subscription_cycle"),
    )
    op.create_index("ix_subscriptions_razorpay_id", "subscriptions", ["razorpay_subscription_id"])
    op.create_index("ix_subscriptions_status", "subscriptions", ["status"])

    # 6. recovery_cases
    op.create_table(
        "recovery_cases",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("merchant_id", sa.String(length=36), sa.ForeignKey("merchants.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("subscription_id", sa.String(length=36), sa.ForeignKey("subscriptions.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("invoice_id", sa.String(length=64), nullable=False),
        sa.Column("payment_id", sa.String(length=64), nullable=True),
        sa.Column("amount_inr", sa.Numeric(precision=12, scale=2), nullable=False),
        sa.Column("currency", sa.String(length=3), nullable=False, server_default="INR"),
        sa.Column("stage", sa.String(length=32), nullable=False),
        sa.Column("state", sa.String(length=32), nullable=False),
        sa.Column("failure_category", sa.String(length=32), nullable=True),
        sa.Column("failure_code", sa.String(length=64), nullable=True),
        sa.Column("attempt_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("contacts_count", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("recovered_amount_inr", sa.Numeric(precision=12, scale=2), nullable=False, server_default="0.00"),
        sa.Column("version", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.Column("resolved_at", sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint("merchant_id", "invoice_id", name="uq_case_merchant_invoice_id"),
        sa.CheckConstraint("amount_inr > 0", name="chk_case_amount"),
        sa.CheckConstraint("recovered_amount_inr >= 0", name="chk_case_recovered_amount"),
        sa.CheckConstraint("attempt_count >= 0", name="chk_case_attempt_count"),
        sa.CheckConstraint("contacts_count >= 0", name="chk_case_contacts_count"),
        sa.CheckConstraint("version >= 1", name="chk_case_version"),
    )
    op.create_index("ix_recovery_cases_merchant_state", "recovery_cases", ["merchant_id", "state"])
    op.create_index("ix_recovery_cases_subscription", "recovery_cases", ["subscription_id"])
    op.create_index("ix_recovery_cases_created_at", "recovery_cases", ["created_at"])

    # 7. recovery_decisions
    op.create_table(
        "recovery_decisions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("recovery_case_id", sa.String(length=36), sa.ForeignKey("recovery_cases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("recommended_action", sa.String(length=64), nullable=False),
        sa.Column("delay_hours", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("confidence", sa.Numeric(precision=3, scale=2), nullable=False),
        sa.Column("reasoning", sa.Text(), nullable=False),
        sa.Column("risk_flags", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default="[]"),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.CheckConstraint("delay_hours >= 0 AND delay_hours <= 168", name="chk_decision_delay"),
        sa.CheckConstraint("confidence >= 0.0 AND confidence <= 1.0", name="chk_decision_confidence"),
    )
    op.create_index("ix_recovery_decisions_case_id", "recovery_decisions", ["recovery_case_id"])

    # 8. recovery_actions
    op.create_table(
        "recovery_actions",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("recovery_case_id", sa.String(length=36), sa.ForeignKey("recovery_cases.id", ondelete="CASCADE"), nullable=False),
        sa.Column("action_type", sa.String(length=64), nullable=False),
        sa.Column("idempotency_key", sa.String(length=128), nullable=False, unique=True),
        sa.Column("status", sa.String(length=32), nullable=False),
        sa.Column("external_reference_id", sa.String(length=128), nullable=True),
        sa.Column("executed_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_recovery_actions_case_id", "recovery_actions", ["recovery_case_id"])
    op.create_index("ix_recovery_actions_idempotency_key", "recovery_actions", ["idempotency_key"])

    # 9. audit_events
    op.create_table(
        "audit_events",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("merchant_id", sa.String(length=36), sa.ForeignKey("merchants.id", ondelete="RESTRICT"), nullable=False),
        sa.Column("recovery_case_id", sa.String(length=36), sa.ForeignKey("recovery_cases.id", ondelete="SET NULL"), nullable=True),
        sa.Column("event_type", sa.String(length=64), nullable=False),
        sa.Column("actor", sa.String(length=64), nullable=False),
        sa.Column("payload", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("correlation_id", sa.String(length=128), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_audit_events_merchant_id", "audit_events", ["merchant_id"])
    op.create_index("ix_audit_events_case_id", "audit_events", ["recovery_case_id"])
    op.create_index("ix_audit_events_created_at", "audit_events", ["created_at"])

    # 10. evaluation_runs
    op.create_table(
        "evaluation_runs",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("dataset_name", sa.String(length=128), nullable=False),
        sa.Column("baseline_mode", sa.String(length=64), nullable=False),
        sa.Column("metrics_summary", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )

    # 11. evaluation_scenario_results
    op.create_table(
        "evaluation_scenario_results",
        sa.Column("id", sa.String(length=36), primary_key=True),
        sa.Column("evaluation_run_id", sa.String(length=36), sa.ForeignKey("evaluation_runs.id", ondelete="CASCADE"), nullable=False),
        sa.Column("scenario_id", sa.String(length=64), nullable=False),
        sa.Column("actual_outcome", sa.String(length=32), nullable=False),
        sa.Column("simulated_outcome", sa.String(length=32), nullable=False),
        sa.Column("details", postgresql.JSONB(astext_type=sa.Text()), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
    )
    op.create_index("ix_eval_results_run_id", "evaluation_scenario_results", ["evaluation_run_id"])


def downgrade() -> None:
    op.drop_table("evaluation_scenario_results")
    op.drop_table("evaluation_runs")
    op.drop_table("audit_events")
    op.drop_table("recovery_actions")
    op.drop_table("recovery_decisions")
    op.drop_table("recovery_cases")
    op.drop_table("subscriptions")
    op.drop_table("customers")
    op.drop_table("webhook_events")
    op.drop_table("recovery_policies")
    op.drop_table("merchants")
