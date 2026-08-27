"""Recovery cases REST API blueprint with strict merchant-tenant isolation."""

import csv
import io
from datetime import datetime, timezone
from decimal import Decimal
from flask import Blueprint, g, jsonify, request, Response
from sqlalchemy import desc, or_

from app.core.auth import get_uow, require_merchant_auth
from app.core.sanitizer import mask_email, mask_phone
from app.domain.models import Customer, PromiseToPay, RecoveryAction, RecoveryCase, RecoveryDecision, Subscription

cases_bp = Blueprint("cases", __name__)


@cases_bp.route("", methods=["GET"])
@require_merchant_auth
def list_cases():
    """List merchant recovery cases with bounded pagination, multi-field filtering, and search."""
    merchant_id = g.merchant_id
    page = max(1, int(request.args.get("page", 1)))
    limit = min(100, max(1, int(request.args.get("limit", 20))))
    offset = (page - 1) * limit

    state = request.args.get("state")
    stage = request.args.get("stage")
    failure_category = request.args.get("failure_category")
    search = request.args.get("search")
    min_amount = request.args.get("min_amount", type=float)
    max_amount = request.args.get("max_amount", type=float)

    uow = get_uow()
    with uow:
        query = uow.session.query(RecoveryCase).filter(RecoveryCase.merchant_id == merchant_id)

        if state:
            query = query.filter(RecoveryCase.state == state.upper())
        if stage:
            query = query.filter(RecoveryCase.stage == stage.upper())
        if failure_category:
            query = query.filter(RecoveryCase.failure_category == failure_category.upper())
        if min_amount is not None:
            query = query.filter(RecoveryCase.amount_inr >= Decimal(str(min_amount)))
        if max_amount is not None:
            query = query.filter(RecoveryCase.amount_inr <= Decimal(str(max_amount)))

        if search:
            search_pattern = f"%{search}%"
            query = query.outerjoin(Subscription).outerjoin(Customer).filter(
                or_(
                    RecoveryCase.id.ilike(search_pattern),
                    RecoveryCase.invoice_id.ilike(search_pattern),
                    RecoveryCase.payment_id.ilike(search_pattern),
                    RecoveryCase.failure_code.ilike(search_pattern),
                    Customer.email.ilike(search_pattern),
                    Customer.contact.ilike(search_pattern),
                )
            )

        total = query.count()
        cases = query.order_by(desc(RecoveryCase.created_at)).offset(offset).limit(limit).all()

        data = []
        for c in cases:
            # Look up customer email if available for listing
            customer_email = None
            if c.subscription and c.subscription.customer:
                customer_email = mask_email(c.subscription.customer.email)

            data.append({
                "id": c.id,
                "subscription_id": c.subscription_id,
                "customer_email": customer_email,
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


@cases_bp.route("/export", methods=["GET"])
@require_merchant_auth
def export_cases_csv():
    """Export filtered merchant recovery cases as sanitized CSV."""
    merchant_id = g.merchant_id
    state = request.args.get("state")
    stage = request.args.get("stage")

    uow = get_uow()
    with uow:
        query = uow.session.query(RecoveryCase).filter(RecoveryCase.merchant_id == merchant_id)
        if state:
            query = query.filter(RecoveryCase.state == state.upper())
        if stage:
            query = query.filter(RecoveryCase.stage == stage.upper())

        cases = query.order_by(desc(RecoveryCase.created_at)).all()

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow([
            "Case ID", "Invoice ID", "State", "Stage", "Failure Category",
            "Failure Code", "Amount (INR)", "Recovered Amount (INR)", "Attempts",
            "Contacts", "Customer Email", "Created At", "Resolved At"
        ])

        for c in cases:
            cust_email = mask_email(c.subscription.customer.email) if c.subscription and c.subscription.customer else ""
            writer.writerow([
                c.id,
                c.invoice_id,
                c.state,
                c.stage,
                c.failure_category or "",
                c.failure_code or "",
                f"{c.amount_inr:.2f}",
                f"{c.recovered_amount_inr:.2f}",
                c.attempt_count,
                c.contacts_count,
                cust_email,
                c.created_at.strftime("%Y-%m-%d %H:%M:%S") if c.created_at else "",
                c.resolved_at.strftime("%Y-%m-%d %H:%M:%S") if c.resolved_at else "",
            ])

    csv_data = output.getvalue()
    filename = f"recovery_cases_{datetime.now(timezone.utc).strftime('%Y%m%d_%H%M%S')}.csv"
    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


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
                "tenure_months": customer.tenure_months,
                "historical_success_rate": float(customer.historical_success_rate) if customer.historical_success_rate is not None else 0.95,
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
            "promises": [
                {
                    "id": p.id,
                    "status": p.status,
                    "promised_at": p.promised_at.isoformat() if p.promised_at else None,
                    "promise_due_at": p.promise_due_at.isoformat() if p.promise_due_at else None,
                    "source": p.source,
                    "notes": p.notes,
                    "created_at": p.created_at.isoformat() if p.created_at else None,
                }
                for p in getattr(case, "promises", [])
            ],
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


@cases_bp.route("/<case_id>/explainability", methods=["GET"])
@require_merchant_auth
def get_case_explainability(case_id: str):
    """Fetch structured decision explainability and feature factor attribution dynamically from persisted case data."""
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

        policy = uow.policies.find_by_merchant_id(merchant_id)
        max_retries = policy.max_retries_per_case if policy else 3
        high_val_threshold = float(policy.high_value_threshold_inr) if policy else 10000.0
        min_conf_threshold = float(policy.min_confidence_threshold) if policy else 0.75

        # Query actual persisted decision if available
        decisions = uow.decisions.list_by_case_id(case.id) if hasattr(uow.decisions, "list_by_case_id") else []
        if not decisions:
            decisions = uow.session.query(RecoveryDecision).filter(RecoveryDecision.recovery_case_id == case.id).all()
        decision = decisions[0] if decisions else None

        # Query customer history for real recovery count
        prior_recoveries = 1
        if case.subscription and case.subscription.customer:
            cust_id = case.subscription.customer_id
            prior_recoveries = uow.session.query(RecoveryCase).join(Subscription).filter(
                Subscription.customer_id == cust_id,
                RecoveryCase.state == "RECOVERED",
                RecoveryCase.id != case.id
            ).count()

        is_hard = case.failure_category == "PERMANENT"

        if decision:
            ai_action = decision.recommended_action
            ai_confidence = float(decision.confidence)
        else:
            ai_action = "STOP_RECOVERY" if is_hard else "PAYMENT_LINK_DELIVERY"
            ai_confidence = 0.99 if is_hard else 0.88

        # Derive policy status and rules dynamically
        policy_rules = []
        policy_reasons = []

        if is_hard:
            policy_status = "BLOCKED"
            final_action = "STOP_RECOVERY"
            policy_rules.append("HARD_DECLINE_SAFETY_RULE")
            policy_reasons.append("Terminal non-recoverable decline code reported by issuing bank")
        elif case.state == "ESCALATED":
            policy_status = "BLOCKED"
            final_action = "MANUAL_ESCALATION"
            if float(case.amount_inr) >= high_val_threshold:
                policy_rules.append("HIGH_VALUE_ESCALATION")
                policy_reasons.append(f"Invoice amount (₹{float(case.amount_inr):,.0f}) exceeds merchant threshold (₹{high_val_threshold:,.0f})")
            if ai_confidence < min_conf_threshold:
                policy_rules.append("LOW_CONFIDENCE_VETO")
                policy_reasons.append(f"AI confidence ({ai_confidence*100:.0f}%) is below minimum threshold ({min_conf_threshold*100:.0f}%)")
        elif case.attempt_count >= max_retries:
            policy_status = "BLOCKED"
            final_action = "STOP_RECOVERY"
            policy_rules.append("MAX_RETRIES_CAP")
            policy_reasons.append(f"Attempt budget exhausted ({case.attempt_count}/{max_retries})")
        else:
            policy_status = "ALLOWED"
            final_action = ai_action

        from app.domain.decision_explainability import DecisionExplainabilityBuilder
        attribution = DecisionExplainabilityBuilder.build_attribution(
            case_id=case.id,
            ai_action=ai_action,
            ai_confidence=ai_confidence,
            policy_status=policy_status,
            final_action=final_action,
            policy_reasons=policy_reasons,
            policy_rules_applied=policy_rules,
            amount_inr=float(case.amount_inr) if case.amount_inr is not None else 0.0,
            attempt_count=case.attempt_count,
            max_retries=max_retries,
            is_hard_decline=is_hard,
            prior_successful_recoveries=prior_recoveries,
        )

        return jsonify(attribution.to_dict()), 200


@cases_bp.route("/<case_id>/escalate", methods=["POST"])
@require_merchant_auth
def escalate_case(case_id: str):
    """Mark a recovery case for manual human review and record an immutable audit event."""
    merchant_id = g.merchant_id
    payload = request.get_json() or {}
    reason = payload.get("reason", "Manual escalation by merchant operator")
    notes = payload.get("notes", "")

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

        prev_state = case.state
        case.state = "ESCALATED"
        case.stage = "HALTED_RECOVERY"
        case.updated_at = datetime.now(timezone.utc)

        # Record audit event
        uow.audit_events.record_event(
            merchant_id=merchant_id,
            recovery_case_id=case.id,
            event_type="RECOVERY_STATE_TRANSITIONED",
            actor="MERCHANT_OPERATOR",
            payload={
                "previous_state": prev_state,
                "new_state": "ESCALATED",
                "escalation_reason": reason,
                "operator_notes": notes,
            },
            correlation_id=f"corr_man_esc_{case.id[:8]}",
        )

        uow.commit()

    return jsonify({
        "status": "success",
        "case_id": case_id,
        "state": "ESCALATED",
        "message": "Case successfully routed to escalation queue"
    }), 200


@cases_bp.route("/<case_id>/resolve", methods=["POST"])
@require_merchant_auth
def resolve_escalated_case(case_id: str):
    """Execute merchant human intervention on an escalated case (e.g. approve retry, dispatch link, dismiss)."""
    merchant_id = g.merchant_id
    payload = request.get_json() or {}
    action = payload.get("action", "SEND_PAYMENT_LINK").upper()
    notes = payload.get("notes", "Operator intervention approved")

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

        now = datetime.now(timezone.utc)

        if action == "APPROVE_RETRY":
            case.state = "SCHEDULED"
            case.stage = "PENDING_OBSERVATION"
            case.attempt_count += 1
            act = RecoveryAction(
                id=f"act_op_retry_{case.id[:8]}_{int(now.timestamp())}",
                recovery_case_id=case.id,
                action_type="AUTO_RETRY",
                idempotency_key=f"idemp_op_retry_{case.id[:8]}_{int(now.timestamp())}",
                status="SCHEDULED",
                executed_at=now,
            )
            uow.session.add(act)
        elif action == "SEND_PAYMENT_LINK":
            case.state = "ACTION_PENDING"
            case.stage = "PENDING_OBSERVATION"
            case.contacts_count += 1
            act = RecoveryAction(
                id=f"act_op_plink_{case.id[:8]}_{int(now.timestamp())}",
                recovery_case_id=case.id,
                action_type="PAYMENT_LINK_DELIVERY",
                idempotency_key=f"idemp_op_plink_{case.id[:8]}_{int(now.timestamp())}",
                status="EXECUTED",
                external_reference_id=f"plink_rzp_manual_{case.id[:8]}",
                executed_at=now,
            )
            uow.session.add(act)
        elif action == "DISMISS":
            case.state = "FAILED"
            case.stage = "HALTED_RECOVERY"
            case.resolved_at = now
        else:
            return jsonify({
                "error": {
                    "code": "BAD_REQUEST",
                    "message": f"Invalid action '{action}'. Allowed: APPROVE_RETRY, SEND_PAYMENT_LINK, DISMISS",
                    "path": request.path
                }
            }), 400

        case.updated_at = now

        # Record audit event
        uow.audit_events.record_event(
            merchant_id=merchant_id,
            recovery_case_id=case.id,
            event_type="CASE_HUMAN_INTERVENTION_RESOLVED",
            actor="MERCHANT_OPERATOR",
            payload={
                "intervention_action": action,
                "new_state": case.state,
                "notes": notes,
            },
            correlation_id=f"corr_op_res_{case.id[:8]}",
        )

        final_state = case.state
        uow.commit()

    return jsonify({
        "status": "success",
        "case_id": case_id,
        "new_state": final_state,
        "action_executed": action,
        "message": f"Human intervention '{action}' applied successfully"
    }), 200


@cases_bp.route("/<case_id>/promises", methods=["GET"])
@require_merchant_auth
def list_case_promises(case_id: str):
    """List all Promise-to-Pay records for a recovery case."""
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

        promises = uow.session.query(PromiseToPay).filter(
            PromiseToPay.recovery_case_id == case.id,
            PromiseToPay.merchant_id == merchant_id
        ).order_by(desc(PromiseToPay.created_at)).all()

        data = [
            {
                "id": p.id,
                "case_id": p.recovery_case_id,
                "customer_id": p.customer_id,
                "promised_at": p.promised_at.isoformat() if p.promised_at else None,
                "promise_due_at": p.promise_due_at.isoformat() if p.promise_due_at else None,
                "status": p.status,
                "source": p.source,
                "notes": p.notes,
                "created_at": p.created_at.isoformat() if p.created_at else None,
                "resolved_at": p.resolved_at.isoformat() if p.resolved_at else None,
            }
            for p in promises
        ]

    return jsonify({"promises": data}), 200


@cases_bp.route("/<case_id>/promises", methods=["POST"])
@require_merchant_auth
def create_case_promise(case_id: str):
    """Create a new Promise-to-Pay for a customer recovery case."""
    merchant_id = g.merchant_id
    payload = request.get_json() or {}

    due_at_str = payload.get("promise_due_at")
    notes = payload.get("notes", "")
    source = payload.get("source", "OPERATOR_INPUT")

    if not due_at_str:
        return jsonify({
            "error": {
                "code": "BAD_REQUEST",
                "message": "Field 'promise_due_at' (ISO timestamp) is required",
                "path": request.path
            }
        }), 400

    try:
        due_at = datetime.fromisoformat(due_at_str.replace("Z", "+00:00"))
    except ValueError:
        return jsonify({
            "error": {
                "code": "BAD_REQUEST",
                "message": "Invalid ISO timestamp for 'promise_due_at'",
                "path": request.path
            }
        }), 400

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

        now = datetime.now(timezone.utc)
        promise = PromiseToPay(
            recovery_case_id=case.id,
            merchant_id=merchant_id,
            customer_id=case.subscription.customer.id if (case.subscription and case.subscription.customer) else None,
            promised_at=now,
            promise_due_at=due_at,
            status="ACTIVE",
            source=source,
            notes=notes,
            created_at=now,
        )
        uow.session.add(promise)

        # Record audit event
        uow.audit_events.record_event(
            merchant_id=merchant_id,
            recovery_case_id=case.id,
            event_type="PROMISE_TO_PAY_CREATED",
            actor="MERCHANT_OPERATOR",
            payload={
                "promise_id": promise.id,
                "promise_due_at": due_at.isoformat(),
                "source": source,
                "notes": notes,
                "contact_suppression_active": True,
            },
            correlation_id=f"corr_prom_{case.id[:8]}",
        )

        uow.commit()

        res_data = {
            "id": promise.id,
            "case_id": promise.recovery_case_id,
            "customer_id": promise.customer_id,
            "promised_at": promise.promised_at.isoformat(),
            "promise_due_at": promise.promise_due_at.isoformat(),
            "status": promise.status,
            "source": promise.source,
            "notes": promise.notes,
            "created_at": promise.created_at.isoformat(),
        }

    return jsonify({"status": "success", "promise": res_data}), 201
