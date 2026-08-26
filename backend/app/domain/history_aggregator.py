"""Aggregators for payment performance and recovery history."""

from datetime import datetime, timezone, timedelta
from decimal import Decimal
from typing import List, Optional

from app.domain.context_metrics import DerivedMetricCalculator
from app.domain.customer_context import PaymentHistoryContext, RecoveryHistoryContext
from app.domain.models import Customer, RecoveryCase, Subscription


class HistoryAggregator:
    """Aggregates payment performance and recovery history from domain models."""

    @staticmethod
    def aggregate_payment_history(
        customer: Customer,
        subscription: Subscription,
        prior_cases: List[RecoveryCase],
        now: Optional[datetime] = None
    ) -> PaymentHistoryContext:
        """
        Derive payment history metrics from customer profile and prior cases.
        """
        current_time = now or datetime.now(timezone.utc)
        thirty_days_ago = current_time - timedelta(days=30)

        # Baseline count from subscription cycles (defaults to 1 if None)
        cycle = subscription.current_cycle if subscription.current_cycle is not None else 1
        completed_cycles = max(0, cycle - 1)
        total_prior_failures = len(prior_cases)

        # Total payment attempts is at least completed cycles + current failure
        total_attempts = completed_cycles + 1
        failed_payments = total_prior_failures + 1  # prior failures + current active failure
        successful_payments = max(0, total_attempts - failed_payments)

        # Failures in last 30 days
        recent_failures_30d = sum(
            1 for c in prior_cases
            if c.created_at and c.created_at >= thirty_days_ago
        ) + 1  # Include current case

        # Consecutive failure count (consecutive active/failed prior cases without intervening recovery)
        consecutive_failures = 1
        for c in sorted(prior_cases, key=lambda x: x.created_at or current_time, reverse=True):
            if c.state in ("DETECTED", "SCHEDULED", "IN_RECOVERY", "FAILED", "ABANDONED"):
                consecutive_failures += 1
            else:
                break

        sample_size = total_attempts
        confidence_tier = DerivedMetricCalculator.evaluate_confidence_tier(sample_size)

        return PaymentHistoryContext(
            total_attempts=total_attempts,
            successful_payments=successful_payments,
            failed_payments=failed_payments,
            consecutive_failures=consecutive_failures,
            recent_failures_30d=recent_failures_30d,
            sample_size=sample_size,
            data_confidence=confidence_tier,
        )

    @staticmethod
    def aggregate_recovery_history(
        current_case_id: str,
        all_subscription_cases: List[RecoveryCase]
    ) -> RecoveryHistoryContext:
        """
        Derive recovery history metrics excluding the current active case.
        """
        prior_cases = [c for c in all_subscription_cases if c.id != current_case_id]
        total_prior = len(prior_cases)

        successful_recoveries = sum(1 for c in prior_cases if c.state == "RECOVERED")
        failed_recoveries = sum(1 for c in prior_cases if c.state in ("FAILED", "ABANDONED"))

        recovery_rate = DerivedMetricCalculator.calculate_recovery_rate(successful_recoveries, total_prior)

        # Find latest prior case and strategy
        last_case = None
        last_strategy = None
        last_recovery_at = None

        if prior_cases:
            sorted_cases = sorted(prior_cases, key=lambda x: x.created_at or datetime.min.replace(tzinfo=timezone.utc), reverse=True)
            last_case = sorted_cases[0]
            last_recovery_at = last_case.resolved_at or last_case.updated_at
            if last_case.decisions:
                last_strategy = last_case.decisions[-1].recommended_action

        return RecoveryHistoryContext(
            prior_recovery_cases=total_prior,
            prior_successful_recoveries=successful_recoveries,
            prior_failed_recoveries=failed_recoveries,
            recovery_success_rate=recovery_rate,
            last_recovery_strategy=last_strategy,
            last_recovery_at=last_recovery_at,
        )
