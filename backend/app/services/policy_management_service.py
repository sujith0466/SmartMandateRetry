"""Service layer for merchant policy management, validation, preview, and governance audit."""

from decimal import Decimal
from typing import Any, Dict, List, Optional, Tuple

from app.core.errors import ValidationError
from app.core.logging import get_logger
from app.core.observability_schemas import AuditEventType
from app.domain.models import AuditEvent, RecoveryPolicy
from app.infrastructure.database import get_session
from app.infrastructure.repositories.unit_of_work import UnitOfWork

logger = get_logger("smartmandate.policy_management_service")


class PolicyManagementService:
    """Service handling policy configuration updates, previews, and governance audits."""

    def __init__(self, uow: Optional[UnitOfWork] = None) -> None:
        self.uow = uow or UnitOfWork(get_session)

    def get_policy_dict(self, merchant_id: str) -> Dict[str, Any]:
        """Fetch active policy dictionary for merchant."""
        with self.uow:
            policy = self.uow.policies.find_by_merchant_id(merchant_id)
            if policy:
                return {
                    "id": policy.id,
                    "merchant_id": policy.merchant_id,
                    "max_retries_per_case": policy.max_retries_per_case,
                    "min_retry_interval_hours": policy.min_retry_interval_hours,
                    "max_recovery_window_days": policy.max_recovery_window_days,
                    "min_confidence_threshold": float(policy.min_confidence_threshold),
                    "high_value_threshold_inr": float(policy.high_value_threshold_inr),
                    "max_customer_contacts_per_cycle": policy.max_customer_contacts_per_cycle,
                    "hard_decline_auto_stop": policy.hard_decline_auto_stop,
                    "updated_at": policy.updated_at.isoformat() if policy.updated_at else None,
                }

        # Return default policy config if none configured in database
        return {
            "id": f"pol_default_{merchant_id}",
            "merchant_id": merchant_id,
            "max_retries_per_case": 3,
            "min_retry_interval_hours": 24,
            "max_recovery_window_days": 14,
            "min_confidence_threshold": 0.75,
            "high_value_threshold_inr": 10000.0,
            "max_customer_contacts_per_cycle": 3,
            "hard_decline_auto_stop": True,
            "updated_at": None,
        }

    def validate_policy_payload(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Strict server-side validation against database check constraints."""
        clean: Dict[str, Any] = {}

        if "max_retries_per_case" in data:
            val = data["max_retries_per_case"]
            if not isinstance(val, int) or val < 1 or val > 10:
                raise ValidationError("max_retries_per_case must be an integer between 1 and 10")
            clean["max_retries_per_case"] = val

        if "min_retry_interval_hours" in data:
            val = data["min_retry_interval_hours"]
            if not isinstance(val, int) or val < 1 or val > 168:
                raise ValidationError("min_retry_interval_hours must be an integer between 1 and 168 (7 days)")
            clean["min_retry_interval_hours"] = val

        if "max_recovery_window_days" in data:
            val = data["max_recovery_window_days"]
            if not isinstance(val, int) or val < 1 or val > 60:
                raise ValidationError("max_recovery_window_days must be an integer between 1 and 60 days")
            clean["max_recovery_window_days"] = val

        if "min_confidence_threshold" in data:
            try:
                conf = float(data["min_confidence_threshold"])
            except (ValueError, TypeError):
                raise ValidationError("min_confidence_threshold must be a valid float number")
            if conf < 0.0 or conf > 1.0:
                raise ValidationError("min_confidence_threshold must be between 0.0 and 1.0")
            clean["min_confidence_threshold"] = round(conf, 2)

        if "high_value_threshold_inr" in data:
            try:
                hv = float(data["high_value_threshold_inr"])
            except (ValueError, TypeError):
                raise ValidationError("high_value_threshold_inr must be a valid number")
            if hv < 0.0:
                raise ValidationError("high_value_threshold_inr must be non-negative")
            clean["high_value_threshold_inr"] = round(hv, 2)

        if "max_customer_contacts_per_cycle" in data:
            val = data["max_customer_contacts_per_cycle"]
            if not isinstance(val, int) or val < 1 or val > 10:
                raise ValidationError("max_customer_contacts_per_cycle must be an integer between 1 and 10")
            clean["max_customer_contacts_per_cycle"] = val

        if "hard_decline_auto_stop" in data:
            val = data["hard_decline_auto_stop"]
            if not isinstance(val, bool):
                raise ValidationError("hard_decline_auto_stop must be a boolean")
            clean["hard_decline_auto_stop"] = val

        return clean

    def preview_policy_changes(
        self, merchant_id: str, proposed_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Compute deterministic change diff and safety impact analysis."""
        clean_proposed = self.validate_policy_payload(proposed_data)
        current = self.get_policy_dict(merchant_id)

        diffs: List[Dict[str, Any]] = []
        impact_notes: List[str] = []

        field_labels = {
            "max_retries_per_case": "Maximum Retries Cap",
            "min_retry_interval_hours": "Minimum Retry Spacing Interval",
            "max_recovery_window_days": "Maximum Recovery Window",
            "min_confidence_threshold": "Minimum AI Confidence Gate",
            "high_value_threshold_inr": "High-Value Human Escalation Threshold",
            "max_customer_contacts_per_cycle": "Max Customer Communications Per Cycle",
            "hard_decline_auto_stop": "Hard Decline Immediate Stop",
        }

        for key, proposed_val in clean_proposed.items():
            current_val = current.get(key)
            if current_val != proposed_val:
                diffs.append({
                    "field": key,
                    "label": field_labels.get(key, key),
                    "current": current_val,
                    "proposed": proposed_val,
                })

                # Deterministic safety impact analysis
                if key == "max_retries_per_case":
                    if proposed_val > current_val:
                        impact_notes.append(f"Increasing retries to {proposed_val} increases recovery chances but increases gateway fee exposure.")
                    else:
                        impact_notes.append(f"Decreasing retries to {proposed_val} reduces unnecessary gateway load and stops hopeless cases earlier.")
                elif key == "min_retry_interval_hours":
                    if proposed_val < current_val:
                        impact_notes.append(f"Lowering retry spacing to {proposed_val}h attempts recoveries faster after transient outages.")
                    else:
                        impact_notes.append(f"Increasing spacing to {proposed_val}h gives customers more time to fund accounts between attempts.")
                elif key == "min_confidence_threshold":
                    if proposed_val < current_val:
                        impact_notes.append(f"Lowering confidence threshold to {int(proposed_val * 100)}% permits lower-confidence AI recovery paths.")
                    else:
                        impact_notes.append(f"Raising confidence threshold to {int(proposed_val * 100)}% increases deterministic policy safety overrides.")
                elif key == "high_value_threshold_inr":
                    if proposed_val < current_val:
                        impact_notes.append(f"Lowering high-value threshold to ₹{proposed_val:,.2f} routes more cases to manual merchant review.")
                    else:
                        impact_notes.append(f"Raising threshold to ₹{proposed_val:,.2f} permits automated smart retries for larger invoice amounts.")
                elif key == "max_customer_contacts_per_cycle":
                    if proposed_val > current_val:
                        impact_notes.append(f"Increasing communication cap to {proposed_val} sends more payment link reminders.")
                    else:
                        impact_notes.append(f"Reducing communication cap to {proposed_val} reduces customer outreach frequency.")
                elif key == "hard_decline_auto_stop" and not proposed_val:
                    impact_notes.append("WARNING: Disabling hard decline auto-stop may result in futile attempts on cancelled mandates.")

        if not diffs:
            impact_notes.append("No parameter changes detected.")

        return {
            "merchant_id": merchant_id,
            "has_changes": len(diffs) > 0,
            "diffs": diffs,
            "impact_notes": impact_notes,
            "proposed_policy": {**current, **clean_proposed},
        }

    def update_policy(
        self,
        merchant_id: str,
        update_data: Dict[str, Any],
        actor: str = "MERCHANT_OPERATOR",
        correlation_id: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Atomically update merchant policy and record append-only AuditEvent."""
        clean_data = self.validate_policy_payload(update_data)
        if not clean_data:
            raise ValidationError("No valid policy fields provided for update")

        current_dict = self.get_policy_dict(merchant_id)

        with self.uow:
            policy = self.uow.policies.find_by_merchant_id(merchant_id)
            if not policy:
                policy = RecoveryPolicy(
                    merchant_id=merchant_id,
                    max_retries_per_case=clean_data.get("max_retries_per_case", 3),
                    min_retry_interval_hours=clean_data.get("min_retry_interval_hours", 24),
                    max_recovery_window_days=clean_data.get("max_recovery_window_days", 14),
                    min_confidence_threshold=Decimal(str(clean_data.get("min_confidence_threshold", 0.75))),
                    high_value_threshold_inr=Decimal(str(clean_data.get("high_value_threshold_inr", 10000.0))),
                    max_customer_contacts_per_cycle=clean_data.get("max_customer_contacts_per_cycle", 3),
                    hard_decline_auto_stop=clean_data.get("hard_decline_auto_stop", True),
                )
                self.uow.session.add(policy)
            else:
                if "max_retries_per_case" in clean_data:
                    policy.max_retries_per_case = clean_data["max_retries_per_case"]
                if "min_retry_interval_hours" in clean_data:
                    policy.min_retry_interval_hours = clean_data["min_retry_interval_hours"]
                if "max_recovery_window_days" in clean_data:
                    policy.max_recovery_window_days = clean_data["max_recovery_window_days"]
                if "min_confidence_threshold" in clean_data:
                    policy.min_confidence_threshold = Decimal(str(clean_data["min_confidence_threshold"]))
                if "high_value_threshold_inr" in clean_data:
                    policy.high_value_threshold_inr = Decimal(str(clean_data["high_value_threshold_inr"]))
                if "max_customer_contacts_per_cycle" in clean_data:
                    policy.max_customer_contacts_per_cycle = clean_data["max_customer_contacts_per_cycle"]
                if "hard_decline_auto_stop" in clean_data:
                    policy.hard_decline_auto_stop = clean_data["hard_decline_auto_stop"]

            self.uow.session.flush()

            # Record append-only governance AuditEvent
            audit_payload = {
                "policy_id": policy.id,
                "changed_fields": list(clean_data.keys()),
                "previous_state": {k: current_dict.get(k) for k in clean_data.keys()},
                "new_state": clean_data,
            }

            self.uow.audit_events.record_event(
                merchant_id=merchant_id,
                event_type=AuditEventType.POLICY_CONFIGURATION_UPDATED.value,
                actor=actor,
                payload=audit_payload,
                correlation_id=correlation_id,
            )

            self.uow.commit()

            updated_dict = {
                "id": policy.id,
                "merchant_id": policy.merchant_id,
                "max_retries_per_case": policy.max_retries_per_case,
                "min_retry_interval_hours": policy.min_retry_interval_hours,
                "max_recovery_window_days": policy.max_recovery_window_days,
                "min_confidence_threshold": float(policy.min_confidence_threshold),
                "high_value_threshold_inr": float(policy.high_value_threshold_inr),
                "max_customer_contacts_per_cycle": policy.max_customer_contacts_per_cycle,
                "hard_decline_auto_stop": policy.hard_decline_auto_stop,
                "updated_at": policy.updated_at.isoformat() if policy.updated_at else None,
            }

        logger.info(
            "Merchant recovery policy updated",
            merchant_id=merchant_id,
            changed_fields=list(clean_data.keys()),
            actor=actor,
            correlation_id=correlation_id,
        )

        return updated_dict

    def get_policy_history(self, merchant_id: str, limit: int = 20) -> List[Dict[str, Any]]:
        """Fetch immutable policy governance change events for merchant."""
        with self.uow:
            events = (
                self.uow.session.query(AuditEvent)
                .filter(
                    AuditEvent.merchant_id == merchant_id,
                    AuditEvent.event_type == AuditEventType.POLICY_CONFIGURATION_UPDATED.value,
                )
                .order_by(AuditEvent.created_at.desc())
                .limit(limit)
                .all()
            )

            return [
                {
                    "id": ev.id,
                    "event_type": ev.event_type,
                    "actor": ev.actor,
                    "payload": ev.payload,
                    "correlation_id": ev.correlation_id,
                    "created_at": ev.created_at.isoformat(),
                }
                for ev in events
            ]
