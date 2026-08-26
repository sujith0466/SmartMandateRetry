"""Risk evaluation and flag computation for AI decisions."""

from decimal import Decimal
from typing import List

from app.domain.ai_decision_schemas import AIDecisionOutput
from app.domain.customer_context import CustomerRecoveryContext

MIN_AI_CONFIDENCE_THRESHOLD = Decimal("0.75")
HIGH_VALUE_AMOUNT_THRESHOLD = Decimal("10000.00")


class AIRiskEvaluator:
    """Evaluates contextual risk indicators and enhances risk flags on AI decisions."""

    @staticmethod
    def evaluate_risks(output: AIDecisionOutput, context: CustomerRecoveryContext) -> List[str]:
        """Compute consolidated list of unique risk flags."""
        flags = list(output.risk_flags or [])

        # 1. Low Confidence Risk
        if output.confidence < MIN_AI_CONFIDENCE_THRESHOLD:
            if "LOW_CONFIDENCE" not in flags:
                flags.append("LOW_CONFIDENCE")

        # 2. High Value Exposure Risk
        if context.case.amount_inr >= HIGH_VALUE_AMOUNT_THRESHOLD:
            if "HIGH_VALUE_EXPOSURE" not in flags:
                flags.append("HIGH_VALUE_EXPOSURE")

        # 3. High Consecutive Failure Streak
        if context.payment_history.consecutive_failures >= 3:
            if "CONSECUTIVE_FAILURES_HIGH" not in flags:
                flags.append("CONSECUTIVE_FAILURES_HIGH")

        # 4. Permanent Hard Decline Risk Flag
        if context.failure_assessment.is_hard_decline:
            if "HARD_DECLINE_SUSPECTED" not in flags:
                flags.append("HARD_DECLINE_SUSPECTED")

        # 5. Incomplete Context Data
        if context.quality.completeness_score < Decimal("1.00"):
            if "DATA_DEFICIENT" not in flags:
                flags.append("DATA_DEFICIENT")

        return flags
