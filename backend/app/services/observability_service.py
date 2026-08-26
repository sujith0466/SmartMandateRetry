"""Operational aggregation service providing system telemetry, audit summaries, and metrics."""

from decimal import Decimal
from typing import Any, Dict, Optional
from sqlalchemy import func

from app.core.metrics import metrics
from app.domain.models import AuditEvent, RecoveryAction, RecoveryCase
from app.infrastructure.database import get_session
from app.infrastructure.repositories.unit_of_work import UnitOfWork


class ObservabilityService:
    """
    Read-only operational analytics and diagnostic service.
    Aggregates database metrics with in-memory telemetry snapshots.
    """

    def __init__(self, uow: Optional[UnitOfWork] = None) -> None:
        self.uow = uow or UnitOfWork(get_session)

    def get_operational_summary(self, merchant_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Produce a high-level operational health and recovery metrics summary.
        """
        with self.uow:
            # Case state aggregations
            case_query = self.uow.session.query(
                RecoveryCase.state,
                func.count(RecoveryCase.id).label("count"),
                func.coalesce(func.sum(RecoveryCase.recovered_amount_inr), 0).label("recovered_amount")
            )
            if merchant_id:
                case_query = case_query.filter(RecoveryCase.merchant_id == merchant_id)
            case_stats = case_query.group_by(RecoveryCase.state).all()

            by_state: Dict[str, int] = {}
            total_cases = 0
            total_recovered_amount = Decimal("0.00")

            for state, count, rec_amt in case_stats:
                by_state[state] = count
                total_cases += count
                if state == "RECOVERED":
                    total_recovered_amount = Decimal(str(rec_amt))

            # Action status aggregations
            action_query = self.uow.session.query(
                RecoveryAction.status,
                func.count(RecoveryAction.id)
            )
            if merchant_id:
                action_query = action_query.join(RecoveryCase).filter(RecoveryCase.merchant_id == merchant_id)
            action_stats = dict(action_query.group_by(RecoveryAction.status).all())

            # Audit events count
            audit_query = self.uow.session.query(func.count(AuditEvent.id))
            if merchant_id:
                audit_query = audit_query.filter(AuditEvent.merchant_id == merchant_id)
            total_audit_events = audit_query.scalar() or 0

        # Merge with in-memory telemetry
        telemetry_snapshot = metrics.get_snapshot()

        return {
            "recovery_pipeline": {
                "total_cases": total_cases,
                "cases_by_state": by_state,
                "total_recovered_inr": float(total_recovered_amount),
                "actions_by_status": action_stats,
                "total_audit_events": total_audit_events,
            },
            "telemetry": telemetry_snapshot,
        }
