"""Core failure classification engine."""

from datetime import datetime, timezone
from decimal import Decimal
import uuid

from app.core.logging import get_logger
from app.domain.failure_assessment import FailureAssessment
from app.domain.failure_extractor import ExtractedFailureEvidence, FailureEvidenceExtractor
from app.domain.failure_rules import FailureRuleRegistry, RuleMatchResult
from app.domain.normalized_event import NormalizedWebhookEvent

logger = get_logger("smartmandate.failure_classifier")

CLASSIFIER_VERSION = "1.0.0"


class FailureClassificationEngine:
    """
    Transforms normalized payment failure events into explainable FailureAssessments.
    Deterministic, reproducible, and zero-LLM dependent.
    """

    def __init__(self, version: str = CLASSIFIER_VERSION) -> None:
        self.version = version

    def classify(self, event: NormalizedWebhookEvent) -> FailureAssessment:
        """Classify a normalized payment.failed webhook event."""
        evidence: ExtractedFailureEvidence = FailureEvidenceExtractor.extract(event)
        match: RuleMatchResult = FailureRuleRegistry.evaluate(evidence)

        assessment_id = f"ass_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc)

        # Assemble comprehensive explainability dictionary
        evidence_dict = {
            "error_reason": evidence.error_reason,
            "error_code": evidence.error_code,
            "error_description": evidence.error_description,
            "error_source": evidence.error_source,
            "error_step": evidence.error_step,
            "payment_method": evidence.payment_method,
            "matched_rule": match.matched_rule,
            "match_strategy": match.match_strategy,
            "raw_payload_snippet": evidence.raw_payload_snippet,
        }

        assessment = FailureAssessment(
            assessment_id=assessment_id,
            provider=event.provider,
            payment_id=evidence.payment_id,
            subscription_id=evidence.subscription_id,
            invoice_id=evidence.invoice_id,
            failure_category=match.failure_category,
            failure_code=match.failure_code,
            raw_error_reason=evidence.error_reason,
            raw_error_code=evidence.error_code,
            recoverability=match.recoverability,
            severity=match.severity,
            confidence=match.confidence,
            evidence=evidence_dict,
            is_hard_decline=match.is_hard_decline,
            classifier_version=self.version,
            classified_at=now,
        )

        logger.info(
            "Payment failure classified successfully",
            assessment_id=assessment.assessment_id,
            payment_id=assessment.payment_id,
            failure_category=assessment.failure_category.value,
            failure_code=assessment.failure_code,
            recoverability=assessment.recoverability.value,
            confidence=str(assessment.confidence),
            matched_rule=match.matched_rule,
            is_hard_decline=assessment.is_hard_decline,
        )

        return assessment
