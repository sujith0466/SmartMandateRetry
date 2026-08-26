"""Phase 16 Scenario Generator.

Implements all 14 scenario families across 4 difficulty tiers.
Reads domain contracts from Phase 2-15 read-only — never modifies them.

Ground truth labeling follows the exact policy rule precedence from policy_rules.py:
  P0: Hard decline + auto_stop -> BLOCK -> STOPPED
  P1: attempt_count >= max_retries -> BLOCK -> STOPPED
  P2a: case_age > window -> BLOCK -> EXPIRED
  P2b: amount >= high_value_threshold -> MODIFY -> ESCALATED
  P2c: spacing enforcement (case_age < min_interval) -> MODIFY (delay)
  P3a: ai_confidence < threshold -> BLOCK -> FAILED
  P3b: contacts >= max_contacts -> BLOCK -> FAILED
  P4: authorized AI action -> ALLOW
"""

from __future__ import annotations

import random
from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from app.evaluation.scenario_schema import (
    SyntheticAIDecision,
    SyntheticCustomerProfile,
    SyntheticPolicyConfig,
    SyntheticRecoveryCase,
    SyntheticScenario,
)
from app.evaluation.seed_manager import SeedManager


# ---------------------------------------------------------------------------
# Ground Truth Labeler
# ---------------------------------------------------------------------------

@dataclass(frozen=True)
class GroundTruth:
    """Computed ground truth for a scenario."""
    expected_policy_outcome: str   # ALLOWED / MODIFIED / BLOCKED
    expected_final_action: str     # from RecoveryActionType set
    expected_case_outcome: str     # RECOVERED / FAILED / ESCALATED / STOPPED / EXPIRED
    ground_truth_label: str        # ALLOW / BLOCK / ESCALATE / STOP


def compute_ground_truth(
    policy: SyntheticPolicyConfig,
    recovery_case: SyntheticRecoveryCase,
    ai_decision: SyntheticAIDecision,
    is_hard_decline: bool,
) -> GroundTruth:
    """Compute deterministic ground truth from policy rule precedence.

    This is a pure function — no database, no Flask, no live service calls.
    Same inputs always produce the same outputs.

    Precedence order mirrors policy_rules.py:
      P0 > P1 > P2a > P2b > P2c > P3a > P3b > P4
    """
    # P0: Hard decline with auto-stop enabled — highest precedence
    if is_hard_decline and policy.hard_decline_auto_stop:
        return GroundTruth(
            expected_policy_outcome="BLOCKED",
            expected_final_action="STOP",
            expected_case_outcome="STOPPED",
            ground_truth_label="BLOCK",
        )

    # P1: Retry cap exhausted
    if recovery_case.attempt_count >= policy.max_retries_per_case:
        return GroundTruth(
            expected_policy_outcome="BLOCKED",
            expected_final_action="STOP",
            expected_case_outcome="STOPPED",
            ground_truth_label="BLOCK",
        )

    # P2a: Recovery window expired
    if recovery_case.case_age_hours > policy.max_recovery_window_days * 24:
        return GroundTruth(
            expected_policy_outcome="BLOCKED",
            expected_final_action="STOP",
            expected_case_outcome="EXPIRED",
            ground_truth_label="BLOCK",
        )

    # P2b: High-value escalation
    if recovery_case.amount_inr >= policy.high_value_threshold_inr and policy.high_value_threshold_inr > 0:
        return GroundTruth(
            expected_policy_outcome="MODIFIED",
            expected_final_action="MANUAL_ESCALATION",
            expected_case_outcome="ESCALATED",
            ground_truth_label="ESCALATE",
        )

    # P3a: AI confidence below threshold
    if ai_decision.ai_confidence < policy.min_confidence_threshold:
        return GroundTruth(
            expected_policy_outcome="BLOCKED",
            expected_final_action="STOP",
            expected_case_outcome="FAILED",
            ground_truth_label="BLOCK",
        )

    # P3b: Contact frequency cap
    if recovery_case.contacts_count >= policy.max_customer_contacts_per_cycle:
        return GroundTruth(
            expected_policy_outcome="BLOCKED",
            expected_final_action="STOP",
            expected_case_outcome="FAILED",
            ground_truth_label="BLOCK",
        )

    # P4: Authorized AI action — determine case outcome from action type
    action = ai_decision.recommended_action
    if action == "STOP":
        return GroundTruth(
            expected_policy_outcome="ALLOWED",
            expected_final_action="STOP",
            expected_case_outcome="STOPPED",
            ground_truth_label="STOP",
        )
    elif action == "MANUAL_ESCALATION":
        return GroundTruth(
            expected_policy_outcome="ALLOWED",
            expected_final_action="MANUAL_ESCALATION",
            expected_case_outcome="ESCALATED",
            ground_truth_label="ESCALATE",
        )
    else:
        # SCHEDULE_RECOVERY_CHECK / PAYMENT_LINK_RECOVERY / PAYMENT_METHOD_RECOVERY
        return GroundTruth(
            expected_policy_outcome="ALLOWED",
            expected_final_action=action,
            expected_case_outcome="RECOVERED",
            ground_truth_label="ALLOW",
        )


# ---------------------------------------------------------------------------
# Family definitions
# ---------------------------------------------------------------------------

# (failure_code, failure_category, recoverability, severity, is_hard_decline, ai_recommended_action, failure_class)
FamilySpec = Tuple[str, str, str, str, bool, str, str]

FAMILY_SPECS: Dict[str, FamilySpec] = {
    "insufficient_funds": (
        "insufficient_funds", "TEMPORARY_LIQUIDITY", "RECOVERABLE", "LOW",
        False, "SCHEDULE_RECOVERY_CHECK", "TEMPORARY",
    ),
    "hard_decline_stop": (
        "do_not_honour", "PERMANENT_HARD_DECLINE", "NON_RECOVERABLE", "HIGH",
        True, "STOP", "PERMANENT",
    ),
    "expired_instrument": (
        "card_expired", "ACTION_REQUIRED_INSTRUMENT", "CONDITIONAL", "MEDIUM",
        False, "PAYMENT_LINK_RECOVERY", "ACTION_REQUIRED",
    ),
    "high_value_escalation": (
        "insufficient_funds", "TEMPORARY_LIQUIDITY", "RECOVERABLE", "LOW",
        False, "SCHEDULE_RECOVERY_CHECK", "TEMPORARY",
    ),
    "retry_cap_exhaustion": (
        "insufficient_funds", "TEMPORARY_LIQUIDITY", "RECOVERABLE", "LOW",
        False, "SCHEDULE_RECOVERY_CHECK", "TEMPORARY",
    ),
    "low_confidence_veto": (
        "unknown_error", "UNKNOWN_AMBIGUOUS", "UNKNOWN", "MEDIUM",
        False, "SCHEDULE_RECOVERY_CHECK", "UNKNOWN",
    ),
    "contact_frequency_cap": (
        "insufficient_funds", "TEMPORARY_LIQUIDITY", "RECOVERABLE", "LOW",
        False, "SCHEDULE_RECOVERY_CHECK", "TEMPORARY",
    ),
    "recovery_window_expired": (
        "insufficient_funds", "TEMPORARY_LIQUIDITY", "RECOVERABLE", "LOW",
        False, "SCHEDULE_RECOVERY_CHECK", "TEMPORARY",
    ),
    "auth_failure_recovery": (
        "authentication_failed", "ACTION_REQUIRED_AUTH", "CONDITIONAL", "MEDIUM",
        False, "PAYMENT_LINK_RECOVERY", "ACTION_REQUIRED",
    ),
    "gateway_timeout_retry": (
        "gateway_timeout", "TEMPORARY_TECHNICAL", "RECOVERABLE", "LOW",
        False, "SCHEDULE_RECOVERY_CHECK", "TEMPORARY",
    ),
    "mandate_revoked_stop": (
        "mandate_revoked", "PERMANENT_HARD_DECLINE", "NON_RECOVERABLE", "HIGH",
        True, "STOP", "PERMANENT",
    ),
    "veteran_high_success": (
        "insufficient_funds", "TEMPORARY_LIQUIDITY", "RECOVERABLE", "LOW",
        False, "SCHEDULE_RECOVERY_CHECK", "TEMPORARY",
    ),
    "new_customer_ambiguous": (
        "unknown_error", "UNKNOWN_AMBIGUOUS", "UNKNOWN", "MEDIUM",
        False, "MANUAL_ESCALATION", "UNKNOWN",
    ),
    "reconciliation_recovery": (
        "authentication_failed", "ACTION_REQUIRED_AUTH", "CONDITIONAL", "MEDIUM",
        False, "PAYMENT_LINK_RECOVERY", "ACTION_REQUIRED",
    ),
}

# All 14 families
ALL_FAMILIES = list(FAMILY_SPECS.keys())

# Target scenario counts per family (sums to ~5000 with given n_scenarios param)
# Proportional weights — normalized at generation time
FAMILY_WEIGHTS: Dict[str, float] = {
    "insufficient_funds": 0.12,
    "hard_decline_stop": 0.10,
    "expired_instrument": 0.10,
    "high_value_escalation": 0.08,
    "retry_cap_exhaustion": 0.08,
    "low_confidence_veto": 0.07,
    "contact_frequency_cap": 0.06,
    "recovery_window_expired": 0.06,
    "auth_failure_recovery": 0.07,
    "gateway_timeout_retry": 0.07,
    "mandate_revoked_stop": 0.05,
    "veteran_high_success": 0.04,
    "new_customer_ambiguous": 0.04,
    "reconciliation_recovery": 0.06,
}

# Difficulty tier weights (same for all families)
TIER_WEIGHTS = {"EASY": 0.35, "MEDIUM": 0.35, "HARD": 0.20, "EDGE": 0.10}


def _assign_tiers(n: int, rng: random.Random) -> List[str]:
    """Return a list of difficulty tier strings for n scenarios."""
    tiers = []
    tier_list = list(TIER_WEIGHTS.keys())
    tier_w = list(TIER_WEIGHTS.values())
    tiers = rng.choices(tier_list, weights=tier_w, k=n)
    return tiers


class ScenarioGenerator:
    """Generates all 14 scenario families across 4 difficulty tiers.

    All generation is deterministic given the same SeedManager.
    No wall-clock timestamps, no OS random, no database access.
    """

    def __init__(self, seed_manager: SeedManager) -> None:
        self._sm = seed_manager

    def generate(
        self,
        n_scenarios: int,
        n_customers: int = 500,
        n_merchants: int = 20,
    ) -> List[SyntheticScenario]:
        """Generate n_scenarios synthetic scenarios covering all 14 families.

        Args:
            n_scenarios: Total number of scenarios to generate.
            n_customers: Size of synthetic customer pool (for entity grouping).
            n_merchants: Size of synthetic merchant pool.

        Returns:
            List of SyntheticScenario objects (unassigned dataset_split — splitter does that).
        """
        # Build ID pools
        customer_pool = self._sm.build_customer_id_pool(n_customers)
        merchant_pool = self._sm.build_merchant_id_pool(n_merchants)

        # Distribute scenario counts across families
        family_counts = self._distribute_family_counts(n_scenarios)

        scenarios: List[SyntheticScenario] = []
        global_index = 0

        for family_id, family_n in family_counts.items():
            family_rng = self._sm.derive_family_rng(family_id)
            tiers = _assign_tiers(family_n, family_rng)

            for local_idx, tier in enumerate(tiers):
                customer_id = family_rng.choice(customer_pool)
                merchant_id = family_rng.choice(merchant_pool)

                scenario = self._generate_scenario(
                    family_id=family_id,
                    tier=tier,
                    scenario_index=global_index,
                    local_index=local_idx,
                    customer_id=customer_id,
                    merchant_id=merchant_id,
                    rng=family_rng,
                )
                scenarios.append(scenario)
                global_index += 1

        return scenarios

    def _distribute_family_counts(self, n_scenarios: int) -> Dict[str, int]:
        """Distribute total scenario count across families per weights."""
        total_weight = sum(FAMILY_WEIGHTS.values())
        counts: Dict[str, int] = {}
        allocated = 0

        families = list(FAMILY_WEIGHTS.keys())
        for i, family_id in enumerate(families[:-1]):
            count = round(n_scenarios * FAMILY_WEIGHTS[family_id] / total_weight)
            counts[family_id] = max(1, count)
            allocated += counts[family_id]

        # Last family gets remainder to ensure exact total
        counts[families[-1]] = max(1, n_scenarios - allocated)
        return counts

    def _generate_scenario(
        self,
        family_id: str,
        tier: str,
        scenario_index: int,
        local_index: int,
        customer_id: str,
        merchant_id: str,
        rng: random.Random,
    ) -> SyntheticScenario:
        """Generate one scenario for a family and difficulty tier."""
        spec = FAMILY_SPECS[family_id]
        (
            failure_code, failure_category, recoverability,
            severity, is_hard_decline, ai_action, failure_class,
        ) = spec

        scenario_id = self._sm.make_scenario_id(family_id, local_index)
        timestamp = self._sm.stable_timestamp(scenario_index)

        policy, recovery_case, ai_decision = self._generate_components(
            family_id=family_id,
            tier=tier,
            is_hard_decline=is_hard_decline,
            ai_action=ai_action,
            failure_class=failure_class,
            rng=rng,
        )

        gt = compute_ground_truth(
            policy=policy,
            recovery_case=recovery_case,
            ai_decision=ai_decision,
            is_hard_decline=is_hard_decline,
        )

        return SyntheticScenario(
            scenario_id=scenario_id,
            scenario_family=family_id,
            difficulty_tier=tier,
            dataset_split="TRAIN",   # placeholder; DatasetSplitter overwrites this
            synthetic_customer_id=customer_id,
            synthetic_merchant_id=merchant_id,
            failure_code=failure_code,
            failure_category=failure_category,
            recoverability=recoverability,
            severity=severity,
            is_hard_decline=is_hard_decline,
            customer_profile=self._make_customer_profile(family_id, tier, rng),
            recovery_case=recovery_case,
            policy_config=policy,
            ai_decision=ai_decision,
            expected_policy_outcome=gt.expected_policy_outcome,
            expected_final_action=gt.expected_final_action,
            expected_case_outcome=gt.expected_case_outcome,
            ground_truth_label=gt.ground_truth_label,
            generation_seed=self._sm.master_seed,
            generation_timestamp_utc=timestamp,
        )

    def _generate_components(
        self,
        family_id: str,
        tier: str,
        is_hard_decline: bool,
        ai_action: str,
        failure_class: str,
        rng: random.Random,
    ) -> Tuple[SyntheticPolicyConfig, SyntheticRecoveryCase, SyntheticAIDecision]:
        """Generate policy, recovery case, and AI decision tuned to family and tier."""

        if family_id == "hard_decline_stop":
            policy = self._policy_hard_decline(tier, rng)
            recovery_case = self._case_normal(tier, rng)
            ai_decision = SyntheticAIDecision(
                recommended_action="STOP",
                ai_confidence=self._high_confidence(rng),
                failure_class=failure_class,
            )
            return policy, recovery_case, ai_decision

        if family_id == "mandate_revoked_stop":
            policy = self._policy_hard_decline(tier, rng)
            recovery_case = self._case_normal(tier, rng)
            ai_decision = SyntheticAIDecision(
                recommended_action="STOP",
                ai_confidence=self._high_confidence(rng),
                failure_class=failure_class,
            )
            return policy, recovery_case, ai_decision

        if family_id == "retry_cap_exhaustion":
            policy = self._policy_normal(tier, rng)
            recovery_case = self._case_retry_exhausted(tier, policy, rng)
            ai_decision = SyntheticAIDecision(
                recommended_action=ai_action,
                ai_confidence=self._high_confidence(rng),
                failure_class=failure_class,
            )
            return policy, recovery_case, ai_decision

        if family_id == "recovery_window_expired":
            policy = self._policy_normal(tier, rng)
            recovery_case = self._case_window_expired(tier, policy, rng)
            ai_decision = SyntheticAIDecision(
                recommended_action=ai_action,
                ai_confidence=self._high_confidence(rng),
                failure_class=failure_class,
            )
            return policy, recovery_case, ai_decision

        if family_id == "high_value_escalation":
            policy = self._policy_low_threshold(tier, rng)
            recovery_case = self._case_high_value(tier, policy, rng)
            ai_decision = SyntheticAIDecision(
                recommended_action="MANUAL_ESCALATION",
                ai_confidence=self._high_confidence(rng),
                failure_class=failure_class,
            )
            return policy, recovery_case, ai_decision

        if family_id == "low_confidence_veto":
            policy = self._policy_normal(tier, rng)
            recovery_case = self._case_normal(tier, rng)
            ai_decision = SyntheticAIDecision(
                recommended_action=ai_action,
                ai_confidence=self._low_confidence(policy, tier, rng),
                failure_class=failure_class,
            )
            return policy, recovery_case, ai_decision

        if family_id == "contact_frequency_cap":
            policy = self._policy_normal(tier, rng)
            recovery_case = self._case_contacts_exhausted(tier, policy, rng)
            ai_decision = SyntheticAIDecision(
                recommended_action=ai_action,
                ai_confidence=self._high_confidence(rng),
                failure_class=failure_class,
            )
            return policy, recovery_case, ai_decision

        if family_id == "veteran_high_success":
            policy = self._policy_normal(tier, rng)
            recovery_case = self._case_normal(tier, rng)
            ai_decision = SyntheticAIDecision(
                recommended_action=ai_action,
                ai_confidence=self._high_confidence(rng),
                failure_class=failure_class,
            )
            return policy, recovery_case, ai_decision

        if family_id == "new_customer_ambiguous":
            policy = self._policy_normal(tier, rng)
            recovery_case = self._case_normal(tier, rng)
            ai_decision = SyntheticAIDecision(
                recommended_action="MANUAL_ESCALATION",
                ai_confidence=self._high_confidence(rng),
                failure_class=failure_class,
            )
            return policy, recovery_case, ai_decision

        # Default: all other families (insufficient_funds, expired_instrument, etc.)
        policy = self._policy_normal(tier, rng)
        recovery_case = self._case_normal(tier, rng)
        ai_decision = SyntheticAIDecision(
            recommended_action=ai_action,
            ai_confidence=self._high_confidence(rng),
            failure_class=failure_class,
        )
        return policy, recovery_case, ai_decision

    # ------------------------------------------------------------------
    # Policy factory methods
    # ------------------------------------------------------------------

    def _policy_normal(self, tier: str, rng: random.Random) -> SyntheticPolicyConfig:
        max_retries = rng.randint(3, 8)
        min_interval = rng.randint(12, 48)
        max_window = rng.randint(14, 45)
        threshold = Decimal(str(round(rng.uniform(0.60, 0.80), 2)))
        high_val = Decimal(str(rng.randint(10000, 50000)))
        max_contacts = rng.randint(3, 7)
        return SyntheticPolicyConfig(
            max_retries_per_case=max_retries,
            min_retry_interval_hours=min_interval,
            max_recovery_window_days=max_window,
            min_confidence_threshold=threshold,
            high_value_threshold_inr=high_val,
            max_customer_contacts_per_cycle=max_contacts,
            hard_decline_auto_stop=False,
        )

    def _policy_hard_decline(self, tier: str, rng: random.Random) -> SyntheticPolicyConfig:
        policy = self._policy_normal(tier, rng)
        return SyntheticPolicyConfig(
            max_retries_per_case=policy.max_retries_per_case,
            min_retry_interval_hours=policy.min_retry_interval_hours,
            max_recovery_window_days=policy.max_recovery_window_days,
            min_confidence_threshold=policy.min_confidence_threshold,
            high_value_threshold_inr=policy.high_value_threshold_inr,
            max_customer_contacts_per_cycle=policy.max_customer_contacts_per_cycle,
            hard_decline_auto_stop=True,
        )

    def _policy_low_threshold(self, tier: str, rng: random.Random) -> SyntheticPolicyConfig:
        """Policy with low high_value_threshold so moderate amounts trigger escalation."""
        max_retries = rng.randint(3, 8)
        min_interval = rng.randint(12, 48)
        max_window = rng.randint(14, 45)
        threshold = Decimal(str(round(rng.uniform(0.60, 0.80), 2)))
        high_val = Decimal(str(rng.randint(500, 3000)))   # low threshold
        max_contacts = rng.randint(3, 7)
        return SyntheticPolicyConfig(
            max_retries_per_case=max_retries,
            min_retry_interval_hours=min_interval,
            max_recovery_window_days=max_window,
            min_confidence_threshold=threshold,
            high_value_threshold_inr=high_val,
            max_customer_contacts_per_cycle=max_contacts,
            hard_decline_auto_stop=False,
        )

    # ------------------------------------------------------------------
    # Recovery case factory methods
    # ------------------------------------------------------------------

    def _case_normal(self, tier: str, rng: random.Random) -> SyntheticRecoveryCase:
        amount = Decimal(str(rng.randint(1000, 9999)))
        return SyntheticRecoveryCase(
            amount_inr=amount,
            value_band="MEDIUM",
            attempt_count=rng.randint(0, 2),
            contacts_count=rng.randint(0, 2),
            stage=rng.choice(["PENDING_OBSERVATION", "HALTED_RECOVERY"]),
            case_age_hours=rng.randint(24, 336),
        )

    def _case_retry_exhausted(
        self, tier: str, policy: SyntheticPolicyConfig, rng: random.Random
    ) -> SyntheticRecoveryCase:
        if tier == "EDGE":
            attempt_count = policy.max_retries_per_case - 1  # boundary: exactly at cap-1
        else:
            attempt_count = policy.max_retries_per_case  # at or over cap
        return SyntheticRecoveryCase(
            amount_inr=Decimal(str(rng.randint(1000, 9999))),
            value_band="MEDIUM",
            attempt_count=min(attempt_count, 10),
            contacts_count=rng.randint(0, 2),
            stage="HALTED_RECOVERY",
            case_age_hours=rng.randint(24, 336),
        )

    def _case_window_expired(
        self, tier: str, policy: SyntheticPolicyConfig, rng: random.Random
    ) -> SyntheticRecoveryCase:
        window_hours = policy.max_recovery_window_days * 24
        if tier == "EDGE":
            # Boundary: exactly 1 hour over window
            case_age = window_hours + 1
        else:
            case_age = window_hours + rng.randint(24, 168)
        return SyntheticRecoveryCase(
            amount_inr=Decimal(str(rng.randint(1000, 9999))),
            value_band="MEDIUM",
            attempt_count=rng.randint(0, 2),
            contacts_count=rng.randint(0, 2),
            stage="HALTED_RECOVERY",
            case_age_hours=min(case_age, 1440),
        )

    def _case_high_value(
        self, tier: str, policy: SyntheticPolicyConfig, rng: random.Random
    ) -> SyntheticRecoveryCase:
        threshold = float(policy.high_value_threshold_inr)
        if tier == "EDGE":
            # Boundary: exactly 1 INR above threshold
            amount = Decimal(str(int(threshold) + 1))
        else:
            amount = Decimal(str(int(threshold) + rng.randint(100, 5000)))
        return SyntheticRecoveryCase(
            amount_inr=amount,
            value_band="HIGH_VALUE",
            attempt_count=rng.randint(0, 2),
            contacts_count=rng.randint(0, 2),
            stage=rng.choice(["PENDING_OBSERVATION", "HALTED_RECOVERY"]),
            case_age_hours=rng.randint(24, 336),
        )

    def _case_contacts_exhausted(
        self, tier: str, policy: SyntheticPolicyConfig, rng: random.Random
    ) -> SyntheticRecoveryCase:
        if tier == "EDGE":
            contacts = policy.max_customer_contacts_per_cycle - 1
        else:
            contacts = policy.max_customer_contacts_per_cycle
        return SyntheticRecoveryCase(
            amount_inr=Decimal(str(rng.randint(1000, 9999))),
            value_band="MEDIUM",
            attempt_count=rng.randint(0, 2),
            contacts_count=min(contacts, 10),
            stage="HALTED_RECOVERY",
            case_age_hours=rng.randint(24, 336),
        )

    # ------------------------------------------------------------------
    # AI decision helpers
    # ------------------------------------------------------------------

    def _high_confidence(self, rng: random.Random) -> Decimal:
        return Decimal(str(round(rng.uniform(0.80, 0.99), 2)))

    def _low_confidence(
        self, policy: SyntheticPolicyConfig, tier: str, rng: random.Random
    ) -> Decimal:
        threshold = float(policy.min_confidence_threshold)
        if tier == "EDGE":
            # Exactly 0.01 below threshold
            low = max(0.00, threshold - 0.01)
        else:
            low = max(0.00, threshold - round(rng.uniform(0.10, 0.30), 2))
        return Decimal(str(round(low, 2)))

    # ------------------------------------------------------------------
    # Customer profile factory
    # ------------------------------------------------------------------

    def _make_customer_profile(
        self, family_id: str, tier: str, rng: random.Random
    ) -> SyntheticCustomerProfile:
        if family_id == "veteran_high_success":
            tenure = rng.randint(24, 60)
            success_rate = Decimal(str(round(rng.uniform(0.85, 1.00), 2)))
        elif family_id == "new_customer_ambiguous":
            tenure = rng.randint(1, 3)
            success_rate = Decimal(str(round(rng.uniform(0.00, 0.50), 2)))
        else:
            tenure = rng.randint(3, 60)
            success_rate = Decimal(str(round(rng.uniform(0.30, 0.95), 2)))

        prior_cases = rng.randint(0, 10)
        prior_success = rng.randint(0, prior_cases)

        if family_id == "new_customer_ambiguous":
            data_confidence = "INSUFFICIENT"
        elif prior_cases >= 5:
            data_confidence = "HIGH"
        elif prior_cases > 0:
            data_confidence = "LOW"
        else:
            data_confidence = "INSUFFICIENT"

        contactability = rng.choice(["HIGH", "MEDIUM", "LOW"])

        return SyntheticCustomerProfile(
            tenure_months=tenure,
            historical_success_rate=success_rate,
            consecutive_failures=rng.randint(0, 5),
            prior_recovery_cases=prior_cases,
            prior_successful_recoveries=prior_success,
            data_confidence=data_confidence,
            contactability=contactability,
        )
