"""Pydantic schemas for Phase 16 Synthetic Scenario Generator.

All identifiers are prefixed with 'synth_' or 'syn_' to be obviously synthetic.
No real customer / payment / merchant data is ever stored here.
"""

from __future__ import annotations

from decimal import Decimal
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator, model_validator


# ---------------------------------------------------------------------------
# Domain vocabulary constants (read-only, sourced from Phase 2-15 contracts)
# ---------------------------------------------------------------------------

VALID_FAILURE_CATEGORIES = {
    "TEMPORARY_LIQUIDITY",
    "TEMPORARY_TECHNICAL",
    "ACTION_REQUIRED_INSTRUMENT",
    "ACTION_REQUIRED_AUTH",
    "PERMANENT_HARD_DECLINE",
    "UNKNOWN_AMBIGUOUS",
}

VALID_RECOVERABILITY = {"RECOVERABLE", "CONDITIONAL", "NON_RECOVERABLE", "UNKNOWN"}
VALID_SEVERITY = {"LOW", "MEDIUM", "HIGH"}
VALID_DIFFICULTY_TIERS = {"EASY", "MEDIUM", "HARD", "EDGE"}
VALID_DATASET_SPLITS = {"TRAIN", "VALIDATION", "TEST"}
VALID_POLICY_OUTCOMES = {"ALLOWED", "MODIFIED", "BLOCKED"}
VALID_FINAL_ACTIONS = {
    "SCHEDULE_RECOVERY_CHECK",
    "PAYMENT_LINK_RECOVERY",
    "PAYMENT_METHOD_RECOVERY",
    "MANUAL_ESCALATION",
    "STOP",
}
VALID_CASE_OUTCOMES = {"RECOVERED", "FAILED", "ESCALATED", "STOPPED", "EXPIRED"}
VALID_GROUND_TRUTH_LABELS = {"ALLOW", "BLOCK", "ESCALATE", "STOP"}
VALID_AI_RECOMMENDED_ACTIONS = {
    "SCHEDULE_RECOVERY_CHECK",
    "PAYMENT_LINK_RECOVERY",
    "PAYMENT_METHOD_RECOVERY",
    "MANUAL_ESCALATION",
    "STOP",
}
VALID_FAILURE_CLASSES = {"TEMPORARY", "PERMANENT", "ACTION_REQUIRED", "RISK", "UNKNOWN"}
VALID_DATA_CONFIDENCE = {"HIGH", "LOW", "INSUFFICIENT"}
VALID_CONTACTABILITY = {"HIGH", "MEDIUM", "LOW"}
VALID_VALUE_BANDS = {"LOW", "MEDIUM", "HIGH_VALUE", "PREMIUM"}
VALID_STAGES = {"PENDING_OBSERVATION", "HALTED_RECOVERY"}

# Known failure codes from failure_rules.py exact-reason map
VALID_FAILURE_CODES = {
    "insufficient_funds",
    "limit_exceeded",
    "gateway_timeout",
    "bank_technical_error",
    "card_expired",
    "mandate_inactive",
    "token_invalidated",
    "authentication_failed",
    "customer_cancelled",
    "do_not_honour",
    "account_closed",
    "mandate_revoked",
    "fraud_suspected",
    "unknown_error",
}


class SyntheticPolicyConfig(BaseModel):
    """Synthetic merchant recovery policy configuration.

    All bounds sourced from RecoveryPolicy check constraints in models.py.
    """
    max_retries_per_case: int = Field(ge=1, le=10)
    min_retry_interval_hours: int = Field(ge=1, le=168)
    max_recovery_window_days: int = Field(ge=1, le=60)
    min_confidence_threshold: Decimal = Field(ge=Decimal("0.00"), le=Decimal("1.00"))
    high_value_threshold_inr: Decimal = Field(ge=Decimal("0"))
    max_customer_contacts_per_cycle: int = Field(ge=1, le=10)
    hard_decline_auto_stop: bool

    @field_validator("min_confidence_threshold", "high_value_threshold_inr", mode="before")
    @classmethod
    def coerce_decimal(cls, v: Any) -> Decimal:
        return Decimal(str(v))


class SyntheticCustomerProfile(BaseModel):
    """Synthetic customer profile — no real PII.

    All fields are fully synthetic and seed-derived.
    """
    tenure_months: int = Field(ge=1, le=60)
    historical_success_rate: Decimal = Field(ge=Decimal("0.00"), le=Decimal("1.00"))
    consecutive_failures: int = Field(ge=0, le=5)
    prior_recovery_cases: int = Field(ge=0, le=10)
    prior_successful_recoveries: int = Field(ge=0)
    data_confidence: str
    contactability: str

    @field_validator("historical_success_rate", mode="before")
    @classmethod
    def coerce_decimal(cls, v: Any) -> Decimal:
        return Decimal(str(v))

    @field_validator("data_confidence")
    @classmethod
    def validate_data_confidence(cls, v: str) -> str:
        if v not in VALID_DATA_CONFIDENCE:
            raise ValueError(f"data_confidence must be one of {VALID_DATA_CONFIDENCE}")
        return v

    @field_validator("contactability")
    @classmethod
    def validate_contactability(cls, v: str) -> str:
        if v not in VALID_CONTACTABILITY:
            raise ValueError(f"contactability must be one of {VALID_CONTACTABILITY}")
        return v

    @model_validator(mode="after")
    def validate_recovery_counts(self) -> "SyntheticCustomerProfile":
        if self.prior_successful_recoveries > self.prior_recovery_cases:
            raise ValueError(
                "prior_successful_recoveries cannot exceed prior_recovery_cases"
            )
        return self


class SyntheticRecoveryCase(BaseModel):
    """Synthetic recovery case attributes."""
    amount_inr: Decimal = Field(gt=Decimal("0"))
    value_band: str
    attempt_count: int = Field(ge=0, le=10)
    contacts_count: int = Field(ge=0, le=10)
    stage: str
    case_age_hours: int = Field(ge=1, le=1440)

    @field_validator("amount_inr", mode="before")
    @classmethod
    def coerce_decimal(cls, v: Any) -> Decimal:
        return Decimal(str(v))

    @field_validator("value_band")
    @classmethod
    def validate_value_band(cls, v: str) -> str:
        if v not in VALID_VALUE_BANDS:
            raise ValueError(f"value_band must be one of {VALID_VALUE_BANDS}")
        return v

    @field_validator("stage")
    @classmethod
    def validate_stage(cls, v: str) -> str:
        if v not in VALID_STAGES:
            raise ValueError(f"stage must be one of {VALID_STAGES}")
        return v


class SyntheticAIDecision(BaseModel):
    """Synthetic AI engine decision output."""
    recommended_action: str
    ai_confidence: Decimal = Field(ge=Decimal("0.00"), le=Decimal("1.00"))
    failure_class: str

    @field_validator("ai_confidence", mode="before")
    @classmethod
    def coerce_decimal(cls, v: Any) -> Decimal:
        return Decimal(str(v))

    @field_validator("recommended_action")
    @classmethod
    def validate_recommended_action(cls, v: str) -> str:
        if v not in VALID_AI_RECOMMENDED_ACTIONS:
            raise ValueError(
                f"recommended_action must be one of {VALID_AI_RECOMMENDED_ACTIONS}"
            )
        return v

    @field_validator("failure_class")
    @classmethod
    def validate_failure_class(cls, v: str) -> str:
        if v not in VALID_FAILURE_CLASSES:
            raise ValueError(f"failure_class must be one of {VALID_FAILURE_CLASSES}")
        return v


class SyntheticScenario(BaseModel):
    """Complete synthetic evaluation scenario with deterministic ground truth.

    scenario_id format: syn_{seed}_{family}_{index:06d}
    synthetic_customer_id format: synth_cust_{seed}_{idx:05d}
    synthetic_merchant_id format: synth_merch_{seed}_{idx:04d}
    """
    scenario_id: str
    scenario_family: str
    difficulty_tier: str
    dataset_split: str
    synthetic_customer_id: str
    synthetic_merchant_id: str
    failure_code: str
    failure_category: str
    recoverability: str
    severity: str
    is_hard_decline: bool
    customer_profile: SyntheticCustomerProfile
    recovery_case: SyntheticRecoveryCase
    policy_config: SyntheticPolicyConfig
    ai_decision: SyntheticAIDecision
    expected_policy_outcome: str
    expected_final_action: str
    expected_case_outcome: str
    ground_truth_label: str
    generation_seed: int
    generation_timestamp_utc: str   # ISO 8601, stable from seed, NOT system time

    @field_validator("difficulty_tier")
    @classmethod
    def validate_difficulty_tier(cls, v: str) -> str:
        if v not in VALID_DIFFICULTY_TIERS:
            raise ValueError(f"difficulty_tier must be one of {VALID_DIFFICULTY_TIERS}")
        return v

    @field_validator("dataset_split")
    @classmethod
    def validate_dataset_split(cls, v: str) -> str:
        if v not in VALID_DATASET_SPLITS:
            raise ValueError(f"dataset_split must be one of {VALID_DATASET_SPLITS}")
        return v

    @field_validator("failure_category")
    @classmethod
    def validate_failure_category(cls, v: str) -> str:
        if v not in VALID_FAILURE_CATEGORIES:
            raise ValueError(
                f"failure_category must be one of {VALID_FAILURE_CATEGORIES}"
            )
        return v

    @field_validator("recoverability")
    @classmethod
    def validate_recoverability(cls, v: str) -> str:
        if v not in VALID_RECOVERABILITY:
            raise ValueError(f"recoverability must be one of {VALID_RECOVERABILITY}")
        return v

    @field_validator("severity")
    @classmethod
    def validate_severity(cls, v: str) -> str:
        if v not in VALID_SEVERITY:
            raise ValueError(f"severity must be one of {VALID_SEVERITY}")
        return v

    @field_validator("expected_policy_outcome")
    @classmethod
    def validate_expected_policy_outcome(cls, v: str) -> str:
        if v not in VALID_POLICY_OUTCOMES:
            raise ValueError(
                f"expected_policy_outcome must be one of {VALID_POLICY_OUTCOMES}"
            )
        return v

    @field_validator("expected_final_action")
    @classmethod
    def validate_expected_final_action(cls, v: str) -> str:
        if v not in VALID_FINAL_ACTIONS:
            raise ValueError(
                f"expected_final_action must be one of {VALID_FINAL_ACTIONS}"
            )
        return v

    @field_validator("expected_case_outcome")
    @classmethod
    def validate_expected_case_outcome(cls, v: str) -> str:
        if v not in VALID_CASE_OUTCOMES:
            raise ValueError(
                f"expected_case_outcome must be one of {VALID_CASE_OUTCOMES}"
            )
        return v

    @field_validator("ground_truth_label")
    @classmethod
    def validate_ground_truth_label(cls, v: str) -> str:
        if v not in VALID_GROUND_TRUTH_LABELS:
            raise ValueError(
                f"ground_truth_label must be one of {VALID_GROUND_TRUTH_LABELS}"
            )
        return v

    @field_validator("scenario_id")
    @classmethod
    def validate_scenario_id(cls, v: str) -> str:
        if not v.startswith("syn_"):
            raise ValueError("scenario_id must start with 'syn_' prefix")
        return v

    @field_validator("synthetic_customer_id")
    @classmethod
    def validate_customer_id(cls, v: str) -> str:
        if not v.startswith("synth_cust_"):
            raise ValueError("synthetic_customer_id must start with 'synth_cust_'")
        return v

    @field_validator("synthetic_merchant_id")
    @classmethod
    def validate_merchant_id(cls, v: str) -> str:
        if not v.startswith("synth_merch_"):
            raise ValueError("synthetic_merchant_id must start with 'synth_merch_'")
        return v

    def to_dict(self) -> Dict[str, Any]:
        """Serialize scenario to JSON-safe dictionary."""
        data = self.model_dump()
        # Convert Decimals to strings for JSON serialization
        def _convert(obj: Any) -> Any:
            if isinstance(obj, Decimal):
                return str(obj)
            if isinstance(obj, dict):
                return {k: _convert(v) for k, v in obj.items()}
            if isinstance(obj, list):
                return [_convert(i) for i in obj]
            return obj
        return _convert(data)


class DatasetManifest(BaseModel):
    """Top-level dataset manifest produced by Phase 16 generator."""
    manifest_version: str = "1.0"
    phase_16_version: str = "1.0.0"
    generation_seed: int
    total_scenarios: int
    split_counts: Dict[str, int]
    family_distribution: Dict[str, int]
    tier_distribution: Dict[str, int]
    outcome_distribution: Dict[str, int]
    generation_config: Dict[str, Any]
    scenarios: List[SyntheticScenario]

    def to_dict(self) -> Dict[str, Any]:
        """Serialize manifest to JSON-safe dictionary."""
        return {
            "manifest_version": self.manifest_version,
            "phase_16_version": self.phase_16_version,
            "generation_seed": self.generation_seed,
            "total_scenarios": self.total_scenarios,
            "split_counts": self.split_counts,
            "family_distribution": self.family_distribution,
            "tier_distribution": self.tier_distribution,
            "outcome_distribution": self.outcome_distribution,
            "generation_config": self.generation_config,
            "scenarios": [s.to_dict() for s in self.scenarios],
        }
