"""Merchant audit events REST API blueprint."""

from flask import Blueprint, g, jsonify, request
from sqlalchemy import desc

from app.core.auth import get_uow, require_merchant_auth
from app.core.sanitizer import sanitize_data
from app.domain.models import AuditEvent

audit_bp = Blueprint("audit", __name__)


@audit_bp.route("", methods=["GET"])
@require_merchant_auth
def list_audit_events():
    """
    List merchant-scoped append-only audit events with pagination and filtering.
    """
    merchant_id = g.merchant_id
    page = max(1, int(request.args.get("page", 1)))
    limit = min(100, max(1, int(request.args.get("limit", 20))))
    offset = (page - 1) * limit

    case_id = request.args.get("case_id")
    event_type = request.args.get("event_type")
    correlation_id = request.args.get("correlation_id")

    uow = get_uow()
    with uow:
        query = uow.session.query(AuditEvent).filter(AuditEvent.merchant_id == merchant_id)

        if case_id:
            query = query.filter(AuditEvent.recovery_case_id == case_id)
        if event_type:
            query = query.filter(AuditEvent.event_type == event_type)
        if correlation_id:
            query = query.filter(AuditEvent.correlation_id == correlation_id)

        total = query.count()
        events = query.order_by(desc(AuditEvent.created_at)).offset(offset).limit(limit).all()

        data = []
        for ev in events:
            data.append({
                "id": ev.id,
                "recovery_case_id": ev.recovery_case_id,
                "event_type": ev.event_type,
                "actor": ev.actor,
                "correlation_id": ev.correlation_id,
                "created_at": ev.created_at.isoformat() if ev.created_at else None,
                "payload": sanitize_data(ev.payload),
            })

    return jsonify({
        "data": data,
        "pagination": {
            "page": page,
            "limit": limit,
            "total": total,
            "pages": (total + limit - 1) // limit if limit > 0 else 1,
        }
    }), 200
