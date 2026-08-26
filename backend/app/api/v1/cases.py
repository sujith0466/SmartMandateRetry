"""Recovery cases REST API blueprint with strict merchant-tenant isolation."""

from flask import Blueprint, g, jsonify, request
from sqlalchemy import desc

from app.core.auth import get_uow, require_merchant_auth
from app.core.sanitizer import mask_email, mask_phone
from app.domain.models import Customer, RecoveryAction, RecoveryCase, Subscription

cases_bp = Blueprint("cases", __name__)


@cases_bp.route("", methods=["GET"])
@require_merchant_auth
def list_cases():
    """List merchant recovery cases with bounded pagination and filtering."""
    merchant_id = g.merchant_id
    page = max(1, int(request.args.get("page", 1)))
    limit = min(100, max(1, int(request.args.get("limit", 20))))
    offset = (page - 1) * limit

    state = request.args.get("state")
    stage = request.args.get("stage")

    uow = get_uow()
    with uow:
        query = uow.session.query(RecoveryCase).filter(RecoveryCase.merchant_id == merchant_id)

        if state:
            query = query.filter(RecoveryCase.state == state.upper())
        if stage:
            query = query.filter(RecoveryCase.stage == stage.upper())

        total = query.count()
        cases = query.order_by(desc(RecoveryCase.created_at)).offset(offset).limit(limit).all()

        data = []
        for c in cases:
            data.append({
                "id": c.id,
                "subscription_id": c.subscription_id,
                "invoice_id": c.invoice_id,
                "payment_id": c.payment_id,
                "amount_inr": float(c.amount_inr) if c.amount_inr is not None else 0.0,
                "recovered_amount_inr": float(c.recovered_amount_inr) if c.recovered_amount_inr is not None else 0.0,
                "currency": c.currency,
                "stage": c.stage,
                "state": c.state,
                "failure_category": c.failure_category,
                "failure_code": c.failure_code,
                "attempt_count": c.attempt_count,
                "contacts_count": c.contacts_count,
                "version": c.version,
                "created_at": c.created_at.isoformat() if c.created_at else None,
                "updated_at": c.updated_at.isoformat() if c.updated_at else None,
                "resolved_at": c.resolved_at.isoformat() if c.resolved_at else None,
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


@cases_bp.route("/<case_id>", methods=["GET"])
@require_merchant_auth
def get_case(case_id: str):
    """Fetch individual recovery case details with customer and subscription context."""
    merchant_id = g.merchant_id
    uow = get_uow()
    with uow:
        case = uow.session.query(RecoveryCase).filter(
            RecoveryCase.id == case_id,
            RecoveryCase.merchant_id == merchant_id
        ).first()

        if not case:
            return jsonify({
                "error": {
                    "code": "NOT_FOUND",
                    "message": f"RecoveryCase '{case_id}' not found",
                    "path": request.path
                }
            }), 404

        # Fetch associated subscription & customer if present
        subscription = uow.subscriptions.get_by_id(case.subscription_id) if case.subscription_id else None
        customer = uow.customers.get_by_id(subscription.customer_id) if subscription and subscription.customer_id else None

        customer_info = None
        if customer:
            customer_info = {
                "id": customer.id,
                "email": mask_email(customer.email) if customer.email else None,
                "contact": mask_phone(customer.contact) if customer.contact else None,
                "created_at": customer.created_at.isoformat() if customer.created_at else None,
            }

        subscription_info = None
        if subscription:
            subscription_info = {
                "id": subscription.id,
                "plan_id": subscription.plan_id,
                "status": subscription.status,
                "current_cycle": subscription.current_cycle,
                "created_at": subscription.created_at.isoformat() if subscription.created_at else None,
                "updated_at": subscription.updated_at.isoformat() if subscription.updated_at else None,
            }

        return jsonify({
            "case": {
                "id": case.id,
                "subscription_id": case.subscription_id,
                "invoice_id": case.invoice_id,
                "payment_id": case.payment_id,
                "amount_inr": float(case.amount_inr) if case.amount_inr is not None else 0.0,
                "recovered_amount_inr": float(case.recovered_amount_inr) if case.recovered_amount_inr is not None else 0.0,
                "currency": case.currency,
                "stage": case.stage,
                "state": case.state,
                "failure_category": case.failure_category,
                "failure_code": case.failure_code,
                "attempt_count": case.attempt_count,
                "contacts_count": case.contacts_count,
                "version": case.version,
                "created_at": case.created_at.isoformat() if case.created_at else None,
                "updated_at": case.updated_at.isoformat() if case.updated_at else None,
                "resolved_at": case.resolved_at.isoformat() if case.resolved_at else None,
            },
            "customer": customer_info,
            "subscription": subscription_info,
        }), 200


@cases_bp.route("/<case_id>/actions", methods=["GET"])
@require_merchant_auth
def list_case_actions(case_id: str):
    """List execution actions for a specific merchant recovery case."""
    merchant_id = g.merchant_id
    uow = get_uow()
    with uow:
        case = uow.session.query(RecoveryCase).filter(
            RecoveryCase.id == case_id,
            RecoveryCase.merchant_id == merchant_id
        ).first()

        if not case:
            return jsonify({
                "error": {
                    "code": "NOT_FOUND",
                    "message": f"RecoveryCase '{case_id}' not found",
                    "path": request.path
                }
            }), 404

        actions = uow.actions.list_by_case_id(case.id)
        data = []
        for a in actions:
            data.append({
                "id": a.id,
                "recovery_case_id": a.recovery_case_id,
                "action_type": a.action_type,
                "status": a.status,
                "external_reference_id": a.external_reference_id,
                "executed_at": a.executed_at.isoformat() if a.executed_at else None,
            })

    return jsonify({"actions": data}), 200


@cases_bp.route("/<case_id>/reconciliation", methods=["GET"])
@require_merchant_auth
def get_case_reconciliation(case_id: str):
    """Fetch authoritative settlement reconciliation status for a merchant case."""
    merchant_id = g.merchant_id
    uow = get_uow()
    with uow:
        case = uow.session.query(RecoveryCase).filter(
            RecoveryCase.id == case_id,
            RecoveryCase.merchant_id == merchant_id
        ).first()

        if not case:
            return jsonify({
                "error": {
                    "code": "NOT_FOUND",
                    "message": f"RecoveryCase '{case_id}' not found",
                    "path": request.path
                }
            }), 404

        actions = uow.actions.list_by_case_id(case.id)
        reconciled_action = next((a for a in actions if a.status == "RECONCILED"), None)

        return jsonify({
            "case_id": case.id,
            "state": case.state,
            "is_settled": case.state == "RECOVERED",
            "recovered_amount_inr": float(case.recovered_amount_inr) if case.recovered_amount_inr is not None else 0.0,
            "currency": case.currency,
            "resolved_at": case.resolved_at.isoformat() if case.resolved_at else None,
            "reconciled_action_id": reconciled_action.id if reconciled_action else None,
            "external_reference_id": reconciled_action.external_reference_id if reconciled_action else None,
        }), 200
