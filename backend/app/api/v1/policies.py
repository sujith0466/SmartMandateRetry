"""Merchant safety policies REST API blueprint."""

from flask import Blueprint, g, jsonify
from app.core.auth import get_uow, require_merchant_auth
from app.core.config import get_settings
from app.domain.models import RecoveryPolicy

policies_bp = Blueprint("policies", __name__)


@policies_bp.route("", methods=["GET"])
@require_merchant_auth
def get_policy():
    """Fetch active recovery policy configuration for the authenticated merchant."""
    settings = get_settings()
    merchant_id = g.merchant_id

    uow = get_uow()
    with uow:
        policy = uow.session.query(RecoveryPolicy).filter(RecoveryPolicy.merchant_id == merchant_id).first()

    if policy:
        return jsonify({
            "merchant_id": merchant_id,
            "max_retries_per_case": policy.max_retries_per_case,
            "min_retry_interval_hours": policy.min_retry_interval_hours,
            "max_recovery_window_days": policy.max_recovery_window_days,
            "min_confidence_threshold": float(policy.min_confidence_threshold),
            "high_value_threshold_inr": float(policy.high_value_threshold_inr),
            "max_customer_contacts_per_cycle": policy.max_customer_contacts_per_cycle,
            "hard_decline_auto_stop": policy.hard_decline_auto_stop,
        }), 200

    return jsonify({
        "merchant_id": merchant_id,
        "max_retries_per_case": settings.POLICY_MAX_RETRIES,
        "min_retry_interval_hours": settings.POLICY_MIN_INTERVAL_HOURS,
        "max_recovery_window_days": settings.POLICY_MAX_WINDOW_DAYS,
        "min_confidence_threshold": settings.POLICY_MIN_CONFIDENCE,
        "high_value_threshold_inr": settings.POLICY_HIGH_VALUE_INR,
        "max_customer_contacts_per_cycle": settings.POLICY_MAX_CONTACTS,
        "hard_decline_auto_stop": True
    }), 200
