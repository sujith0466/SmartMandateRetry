"""Decision Explainability and Attribution Layer for Phase 21.

Provides structured decision factor attribution and policy veto chains
without modifying authoritative Policy Engine decisions or executing payment actions.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, Dict, List, Optional


@dataclass(frozen=True)
class FactorWeight:
    """Relative contribution weight for a decision feature."""
    factor_name: str
    label: str
    weight: float
    impact: str  # "POSITIVE" | "NEUTRAL" | "NEGATIVE"
    description: str


@dataclass(frozen=True)
class DecisionAttribution:
    """Structured explanation and attribution for an autonomous recovery decision."""
    case_id: str
    ai_action: str
    ai_confidence: float
    policy_status: str  # "ALLOWED" | "MODIFIED" | "BLOCKED"
    final_action: str
    governing_authority: str
    factor_weights: List[FactorWeight]
    veto_chain: List[str]
    policy_override_explanation: Optional[str]
    summary: str

    def to_dict(self) -> Dict[str, Any]:
        return {
            "case_id": self.case_id,
            "ai_action": self.ai_action,
            "ai_confidence": round(self.ai_confidence, 4),
            "policy_status": self.policy_status,
            "final_action": self.final_action,
            "governing_authority": self.governing_authority,
            "factor_weights": [
                {
                    "factor_name": fw.factor_name,
                    "label": fw.label,
                    "weight": round(fw.weight, 4),
                    "impact": fw.impact,
                    "description": fw.description,
                }
                for fw in self.factor_weights
            ],
            "veto_chain": self.veto_chain,
            "policy_override_explanation": self.policy_override_explanation,
            "summary": self.summary,
        }


class DecisionExplainabilityBuilder:
    """Constructs structured attribution for AI and Policy decisions."""

    @staticmethod
    def build_attribution(
        case_id: str,
        ai_action: str,
        ai_confidence: float,
        policy_status: str,
        final_action: str,
        policy_reasons: List[str],
        policy_rules_applied: List[str],
        amount_inr: float,
        attempt_count: int,
        max_retries: int,
        is_hard_decline: bool = False,
        prior_successful_recoveries: int = 0,
    ) -> DecisionAttribution:
        factors: List[FactorWeight] = []

        # 1. Failure Recoverability Factor
        if is_hard_decline:
            factors.append(
                FactorWeight(
                    factor_name="failure_recoverability",
                    label="Failure Recoverability",
                    weight=0.35,
                    impact="NEGATIVE",
                    description="Permanent terminal decline code triggers mandatory P0 safety stop.",
                )
            )
        else:
            factors.append(
                FactorWeight(
                    factor_name="failure_recoverability",
                    label="Failure Recoverability",
                    weight=0.30,
                    impact="POSITIVE",
                    description=f"Recoverable failure category supported with {ai_confidence*100:.0f}% confidence.",
                )
            )

        # 2. Retry Attempt Budget Factor
        remaining_retries = max(0, max_retries - attempt_count)
        if remaining_retries <= 0:
            factors.append(
                FactorWeight(
                    factor_name="retry_budget",
                    label="Retry Budget Exhaustion",
                    weight=0.30,
                    impact="NEGATIVE",
                    description=f"Attempt {attempt_count}/{max_retries} exhausted retry cap.",
                )
            )
        else:
            factors.append(
                FactorWeight(
                    factor_name="retry_budget",
                    label="Retry Budget Availability",
                    weight=0.25,
                    impact="POSITIVE",
                    description=f"{remaining_retries} attempts remaining before policy cap.",
                )
            )

        # 3. Customer Tenure & History
        if prior_successful_recoveries > 0:
            factors.append(
                FactorWeight(
                    factor_name="customer_history",
                    label="Customer Track Record",
                    weight=0.20,
                    impact="POSITIVE",
                    description=f"Customer has {prior_successful_recoveries} prior successful recoveries.",
                )
            )
        else:
            factors.append(
                FactorWeight(
                    factor_name="customer_history",
                    label="Customer Track Record",
                    weight=0.15,
                    impact="NEUTRAL",
                    description="Standard recovery profile without prior dispute flags.",
                )
            )

        # 4. Invoice Amount Risk Factor
        if amount_inr >= 10000.0:
            factors.append(
                FactorWeight(
                    factor_name="amount_tier",
                    label="High-Value Risk Tier",
                    weight=0.20,
                    impact="NEUTRAL",
                    description=f"Invoice value ₹{amount_inr:,.0f} subject to merchant high-value review thresholds.",
                )
            )
        else:
            factors.append(
                FactorWeight(
                    factor_name="amount_tier",
                    label="Standard Amount Tier",
                    weight=0.20,
                    impact="POSITIVE",
                    description=f"Standard ticket size ₹{amount_inr:,.0f} suitable for autonomous retry.",
                )
            )

        # Build veto chain
        veto_chain = list(policy_rules_applied) if policy_rules_applied else []
        if policy_reasons:
            veto_chain.extend([f"REASON: {r}" for r in policy_reasons if f"REASON: {r}" not in veto_chain])

        override_exp: Optional[str] = None
        if policy_status == "BLOCKED":
            governing_authority = "POLICY_ENGINE_SAFETY_GATE (VETO)"
            override_exp = f"Policy Engine vetoed AI recommendation '{ai_action}' due to: {', '.join(policy_reasons) if policy_reasons else 'Safety rule trigger'}."
            summary = f"Action BLOCKED: Policy safety gate superseded AI proposal with {final_action}."
        elif policy_status == "MODIFIED":
            governing_authority = "POLICY_ENGINE_SAFETY_GATE (MODIFIED)"
            override_exp = f"Policy Engine modified AI recommendation from '{ai_action}' to '{final_action}'."
            summary = f"Action MODIFIED: Policy adjusted AI parameters to {final_action}."
        else:
            governing_authority = "AI_PROPOSED_POLICY_AUTHORIZED"
            summary = f"Action AUTHORIZED: AI recommendation '{ai_action}' passed all deterministic safety gates."

        return DecisionAttribution(
            case_id=case_id,
            ai_action=ai_action,
            ai_confidence=ai_confidence,
            policy_status=policy_status,
            final_action=final_action,
            governing_authority=governing_authority,
            factor_weights=factors,
            veto_chain=veto_chain,
            policy_override_explanation=override_exp,
            summary=summary,
        )
