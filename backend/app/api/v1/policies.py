"""Merchant safety policies REST API blueprint."""

from flask import Blueprint, jsonify
from app.core.config import get_settings

policies_bp = Blueprint("policies", __name__)


@policies_bp.route("", methods=["GET"])
def get_policy():
    """Fetch active recovery policy configuration."""
    settings = get_settings()
    return jsonify({
        "max_retries_per_case": settings.POLICY_MAX_RETRIES,
        "min_retry_interval_hours": settings.POLICY_MIN_INTERVAL_HOURS,
        "max_recovery_window_days": settings.POLICY_MAX_WINDOW_DAYS,
        "min_confidence_threshold": settings.POLICY_MIN_CONFIDENCE,
        "high_value_threshold_inr": settings.POLICY_HIGH_VALUE_INR,
        "max_customer_contacts_per_cycle": settings.POLICY_MAX_CONTACTS,
        "hard_decline_auto_stop": True
    }), 200
