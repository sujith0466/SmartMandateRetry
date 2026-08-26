"""Merchant analytics and evaluation REST API blueprint."""

from flask import Blueprint, g, jsonify
from app.core.auth import get_uow, require_merchant_auth
from app.services.observability_service import ObservabilityService

analytics_bp = Blueprint("analytics", __name__)


@analytics_bp.route("/overview", methods=["GET"])
@require_merchant_auth
def get_analytics_overview():
    """Fetch macro recovery KPIs for the authenticated merchant."""
    merchant_id = g.merchant_id
    uow = get_uow()
    obs_service = ObservabilityService(uow=uow)
    summary = obs_service.get_operational_summary(merchant_id=merchant_id)

    pipeline = summary["recovery_pipeline"]
    total_cases = pipeline["total_cases"]
    cases_by_state = pipeline["cases_by_state"]

    recovered_count = cases_by_state.get("RECOVERED", 0)
    escalated_count = cases_by_state.get("ESCALATED", 0)
    active_count = sum(cases_by_state.get(s, 0) for s in ("DETECTED", "ANALYZING", "DECISION_PENDING", "POLICY_REVIEW", "SCHEDULED", "ACTION_PENDING", "IN_PROGRESS", "WAITING_FOR_OUTCOME"))

    recovery_rate = (recovered_count / total_cases * 100.0) if total_cases > 0 else 0.0

    return jsonify({
        "merchant_id": merchant_id,
        "total_cases_count": total_cases,
        "active_cases_count": active_count,
        "recovered_cases_count": recovered_count,
        "escalated_cases_count": escalated_count,
        "recovered_revenue_inr": pipeline["total_recovered_inr"],
        "recovery_rate_percent": round(recovery_rate, 2),
        "total_audit_events": pipeline["total_audit_events"],
    }), 200
