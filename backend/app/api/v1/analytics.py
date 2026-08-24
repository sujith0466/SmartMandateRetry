"""Merchant analytics and evaluation REST API blueprint."""

from flask import Blueprint, jsonify

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/overview", methods=["GET"])
def get_analytics_overview():
    """Fetch macro recovery KPIs."""
    return jsonify({
        "revenue_at_risk_inr": 0.0,
        "recovered_revenue_inr": 0.0,
        "recovery_rate_percent": 0.0,
        "recovery_uplift_percent": 0.0,
        "active_cases_count": 0,
        "escalated_cases_count": 0
    }), 200
