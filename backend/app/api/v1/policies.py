"""Merchant safety policies and governance REST API blueprint."""

from flask import Blueprint, g, jsonify, request
from app.core.auth import get_uow, require_merchant_auth
from app.core.errors import ValidationError
from app.services.policy_management_service import PolicyManagementService

policies_bp = Blueprint("policies", __name__)


def _get_service() -> PolicyManagementService:
    return PolicyManagementService(uow=get_uow())


@policies_bp.route("", methods=["GET"])
@require_merchant_auth
def get_policy():
    """Fetch active recovery policy configuration for the authenticated merchant."""
    merchant_id = g.merchant_id
    service = _get_service()
    policy_data = service.get_policy_dict(merchant_id)
    return jsonify(policy_data), 200


@policies_bp.route("", methods=["PUT", "PATCH"])
@require_merchant_auth
def update_policy():
    """Update recovery policy configuration for the authenticated merchant."""
    merchant_id = g.merchant_id
    payload = request.get_json(silent=True)
    if not payload or not isinstance(payload, dict):
        raise ValidationError("Request body must be a valid JSON object")

    correlation_id = request.headers.get("X-Correlation-ID")
    service = _get_service()
    updated_policy = service.update_policy(
        merchant_id=merchant_id,
        update_data=payload,
        actor="MERCHANT_OPERATOR",
        correlation_id=correlation_id,
    )
    return jsonify(updated_policy), 200


@policies_bp.route("/preview", methods=["POST"])
@require_merchant_auth
def preview_policy_changes():
    """Preview proposed policy changes with deterministic safety impact analysis."""
    merchant_id = g.merchant_id
    payload = request.get_json(silent=True)
    if not payload or not isinstance(payload, dict):
        raise ValidationError("Request body must be a valid JSON object")

    service = _get_service()
    preview_result = service.preview_policy_changes(merchant_id, payload)
    return jsonify(preview_result), 200


@policies_bp.route("/history", methods=["GET"])
@require_merchant_auth
def get_policy_history():
    """Fetch immutable policy governance change audit history for the authenticated merchant."""
    merchant_id = g.merchant_id
    limit = min(request.args.get("limit", 20, type=int), 100)
    service = _get_service()
    history = service.get_policy_history(merchant_id, limit=limit)
    return jsonify({"merchant_id": merchant_id, "history": history}), 200


@policies_bp.route("/simulate", methods=["POST"])
@require_merchant_auth
def simulate_policy():
    """Simulate draft policy against synthetic benchmark dataset without database mutations."""
    merchant_id = g.merchant_id
    payload = request.get_json(silent=True)
    if not payload or not isinstance(payload, dict):
        raise ValidationError("Request body must be a valid JSON object")

    split = request.args.get("split", "TEST")
    from app.services.policy_simulation_service import PolicySimulationService
    sim_service = PolicySimulationService()
    result = sim_service.simulate(policy_config=payload, split=split)
    return jsonify(result.to_dict()), 200
