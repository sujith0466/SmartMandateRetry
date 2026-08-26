"""Strongly typed contracts and constants for observability, logging, metrics, and audit trails."""

from enum import Enum


class LogLevel(str, Enum):
    """Standardized log severity levels."""
    DEBUG = "DEBUG"
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"


class AuditEventType(str, Enum):
    """Authoritative lifecycle event types across all system phases."""
    # Phase 4
    PAYMENT_FAILURE_CLASSIFIED = "PAYMENT_FAILURE_CLASSIFIED"
    # Phase 5
    CUSTOMER_CONTEXT_AGGREGATED = "CUSTOMER_CONTEXT_AGGREGATED"
    # Phase 6
    AI_DECISION_PRODUCED = "AI_DECISION_PRODUCED"
    # Phase 7
    POLICY_DECISION_EVALUATED = "POLICY_DECISION_EVALUATED"
    # Phase 8
    RECOVERY_ACTION_EXECUTED = "RECOVERY_ACTION_EXECUTED"
    RECOVERY_ACTION_SCHEDULED = "RECOVERY_ACTION_SCHEDULED"
    RECOVERY_ACTION_BLOCKED = "RECOVERY_ACTION_BLOCKED"
    RECOVERY_ACTION_FAILED = "RECOVERY_ACTION_FAILED"
    # Phase 9
    PAYMENT_OUTCOME_RECONCILED = "PAYMENT_OUTCOME_RECONCILED"
    PAYMENT_OUTCOME_FAILED = "PAYMENT_OUTCOME_FAILED"
    PAYMENT_OUTCOME_MISMATCH = "PAYMENT_OUTCOME_MISMATCH"
    PAYMENT_OUTCOME_UNKNOWN = "PAYMENT_OUTCOME_UNKNOWN"
    # Phase 10
    RECOVERY_STATE_TRANSITIONED = "RECOVERY_STATE_TRANSITIONED"


class MetricName(str, Enum):
    """Standardized operational and domain metric names."""
    # Pipeline & Lifecycle
    CASES_DETECTED_TOTAL = "cases_detected_total"
    CASES_ANALYZED_TOTAL = "cases_analyzed_total"
    STATE_TRANSITIONS_TOTAL = "state_transitions_total"
    OCC_CONFLICTS_TOTAL = "occ_conflicts_total"
    TERMINAL_VIOLATIONS_TOTAL = "terminal_violations_total"

    # AI & Decision Engine
    AI_DECISIONS_TOTAL = "ai_decisions_total"
    AI_FALLBACKS_TOTAL = "ai_fallbacks_total"
    AI_LATENCY_MS = "ai_latency_ms"
    AI_CONFIDENCE = "ai_confidence"
    AI_PROVIDER_ERRORS_TOTAL = "ai_provider_errors_total"
    AI_FREE_MODEL_FAILOVERS_TOTAL = "ai_free_model_failovers_total"

    # Policy Engine
    POLICY_EVALUATIONS_TOTAL = "policy_evaluations_total"
    POLICY_BLOCKED_TOTAL = "policy_blocked_total"
    POLICY_MODIFIED_TOTAL = "policy_modified_total"
    POLICY_HARD_DECLINES_TOTAL = "policy_hard_declines_total"

    # Recovery Execution
    ACTIONS_EXECUTED_TOTAL = "actions_executed_total"
    ACTIONS_SCHEDULED_TOTAL = "actions_scheduled_total"
    ACTIONS_BLOCKED_TOTAL = "actions_blocked_total"
    ACTIONS_FAILED_TOTAL = "actions_failed_total"
    ACTIONS_IDEMPOTENCY_HITS_TOTAL = "actions_idempotency_hits_total"

    # Reconciliation & Revenue
    PAYMENTS_RECONCILED_TOTAL = "payments_reconciled_total"
    PAYMENTS_FAILED_TOTAL = "payments_failed_total"
    RECONCILIATION_MISMATCHES_TOTAL = "reconciliation_mismatches_total"
    RECONCILIATION_DUPLICATES_TOTAL = "reconciliation_duplicates_total"
    RECOVERED_REVENUE_INR_TOTAL = "recovered_revenue_inr_total"
