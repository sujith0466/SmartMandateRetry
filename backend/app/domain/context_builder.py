"""Customer recovery context builder and quality evaluator."""

from datetime import datetime, timezone
from decimal import Decimal
from typing import Any, Dict, List, Optional

from app.core.logging import get_logger
from app.domain.context_metrics import DerivedMetricCalculator
from app.domain.context_sanitizer import ContextSanitizer
from app.domain.customer_context import (
    CaseContext, CustomerProfileContext, CustomerRecoveryContext,
    DataQualityContext, PaymentHistoryContext, RecoveryHistoryContext,
    SubscriptionContext
)
from app.domain.failure_assessment import FailureAssessment
from app.domain.history_aggregator import HistoryAggregator
from app.domain.models import Customer, RecoveryCase, Subscription
from app.infrastructure.razorpay_client import RazorpayClient

logger = get_logger("smartmandate.context_builder")

CONTEXT_VERSION = "1.0.0"


class DataQualityEvaluator:
    """Evaluates data quality and completeness for the aggregated context."""

    @staticmethod
    def evaluate(
        case: RecoveryCase,
        customer: Optional[Customer],
        subscription: Optional[Subscription],
        failure_assessment: Optional[FailureAssessment]
    ) -> DataQualityContext:
        missing_fields: List[str] = []

        if not customer:
            missing_fields.append("customer")
        if not subscription:
            missing_fields.append("subscription")
        if not failure_assessment:
            missing_fields.append("failure_assessment")
        if not case.amount_inr:
            missing_fields.append("case.amount_inr")

        # Total key diagnostic elements evaluated: 4
        total_eval_points = 4
        present_points = total_eval_points - len(missing_fields)
        completeness_score = Decimal(present_points) / Decimal(total_eval_points)

        return DataQualityContext(
            context_version=CONTEXT_VERSION,
            completeness_score=completeness_score.quantize(Decimal("0.01")),
            is_enriched_via_api=False,
            missing_fields=missing_fields,
            generated_at=datetime.now(timezone.utc),
        )


class CustomerContextBuilder:
    """
    Assembles a consolidated, sanitized, and immutable CustomerRecoveryContext.
    Operates primarily from local DB data with optional, graceful Razorpay API enrichment.
    """

    def __init__(self, razorpay_client: Optional[RazorpayClient] = None) -> None:
        self.razorpay_client = razorpay_client

    def build_context(
        self,
        case: RecoveryCase,
        customer: Customer,
        subscription: Subscription,
        all_subscription_cases: List[RecoveryCase],
        failure_assessment: FailureAssessment,
        now: Optional[datetime] = None
    ) -> CustomerRecoveryContext:
        """Construct the complete customer recovery context."""
        current_time = now or datetime.now(timezone.utc)

        # 1. Case Context
        case_ctx = CaseContext(
            case_id=case.id,
            invoice_id=case.invoice_id,
            amount_inr=case.amount_inr,
            currency=case.currency,
            stage=case.stage,
            state=case.state,
            created_at=case.created_at,
            age_hours=DerivedMetricCalculator.calculate_age_hours(case.created_at, current_time),
        )

        # 2. Subscription Context
        sub_ctx = SubscriptionContext(
            subscription_id=subscription.razorpay_subscription_id,
            status=subscription.status,
            plan_id=subscription.plan_id,
            current_cycle=subscription.current_cycle,
            created_at=subscription.created_at,
            age_days=DerivedMetricCalculator.calculate_age_days(subscription.created_at, current_time),
        )

        # 3. Customer Profile Context (Sanitized & Masked)
        cust_ctx = CustomerProfileContext(
            customer_id=customer.razorpay_customer_id,
            tenure_months=customer.tenure_months,
            historical_success_rate=customer.historical_success_rate,
            masked_email=ContextSanitizer.mask_email(customer.email),
            masked_contact=ContextSanitizer.mask_contact(customer.contact),
        )

        # 4. Payment & Recovery History Contexts
        prior_cases = [c for c in all_subscription_cases if c.id != case.id]
        pmt_history = HistoryAggregator.aggregate_payment_history(
            customer=customer,
            subscription=subscription,
            prior_cases=prior_cases,
            now=current_time,
        )
        rec_history = HistoryAggregator.aggregate_recovery_history(
            current_case_id=case.id,
            all_subscription_cases=all_subscription_cases,
        )

        # 5. Data Quality Context & Optional API Enrichment
        quality = DataQualityEvaluator.evaluate(
            case=case,
            customer=customer,
            subscription=subscription,
            failure_assessment=failure_assessment,
        )

        # Optional graceful Razorpay API enrichment
        is_enriched = False
        if self.razorpay_client:
            try:
                # Real-time enrichment attempt with safe exception trapping
                api_sub = self.razorpay_client.fetch_subscription(subscription.razorpay_subscription_id)
                if api_sub and "status" in api_sub:
                    is_enriched = True
            except Exception as e:
                logger.warning(
                    "Optional Razorpay API enrichment skipped due to gateway error",
                    subscription_id=subscription.razorpay_subscription_id,
                    error=str(e)
                )

        quality_with_api = DataQualityContext(
            context_version=quality.context_version,
            completeness_score=quality.completeness_score,
            is_enriched_via_api=is_enriched,
            missing_fields=quality.missing_fields,
            generated_at=quality.generated_at,
        )

        logger.info(
            "Customer recovery context assembled successfully",
            case_id=case.id,
            customer_id=customer.razorpay_customer_id,
            subscription_id=subscription.razorpay_subscription_id,
            completeness_score=str(quality_with_api.completeness_score),
            is_enriched_via_api=is_enriched,
        )

        return CustomerRecoveryContext(
            case=case_ctx,
            subscription=sub_ctx,
            customer=cust_ctx,
            payment_history=pmt_history,
            recovery_history=rec_history,
            failure_assessment=failure_assessment,
            quality=quality_with_api,
        )
