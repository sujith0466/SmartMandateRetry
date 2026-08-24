"""Recovery cases REST API blueprint."""

from flask import Blueprint, jsonify, request

cases_bp = Blueprint("cases", __name__)


@cases_bp.route("", methods=["GET"])
def list_cases():
    """List recovery cases with filtering and pagination."""
    # Foundation stub — business implementation in Phase 12
    return jsonify({
        "data": [],
        "pagination": {
            "page": int(request.args.get("page", 1)),
            "limit": int(request.args.get("limit", 20)),
            "total": 0
        }
    }), 200


@cases_bp.route("/<case_id>", methods=["GET"])
def get_case(case_id: str):
    """Fetch individual case details and event timeline."""
    return jsonify({
        "error": {
            "code": "NOT_FOUND",
            "message": f"Recovery case {case_id} not found"
        }
    }), 404
