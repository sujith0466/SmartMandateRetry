"""Deterministic synthetic seed data factory for SmartMandateRetry.

Seeds realistic enterprise merchant data with complete lifecycle integrity across:
- Merchants and Safety Policies
- Customers and Subscriptions
- 16+ Varied Recovery Cases (Recovered, Active, Escalated, Halted, Failed)
- Matching AI Recovery Decisions
- Execution Actions with external gateway references
- 100+ Chronological Audit Events
"""

from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import Optional

from app.core.logging import get_logger
from app.domain.models import (
    AuditEvent, Customer, Merchant, RecoveryAction,
    RecoveryCase, RecoveryDecision, RecoveryPolicy, Subscription,
    generate_uuid
)
from app.infrastructure.database import get_session
from app.infrastructure.repositories.unit_of_work import UnitOfWork

logger = get_logger("smartmandate.seed")


def seed_database(uow: Optional[UnitOfWork] = None) -> None:
    """Populate database with a realistic, internally consistent enterprise demonstration dataset."""
    if uow is None:
        uow = UnitOfWork(get_session)

    now = datetime.now(timezone.utc)

    with uow:
        # -------------------------------------------------------------
        # 1. Primary Enterprise Merchant & Legacy Alias Tenants
        # -------------------------------------------------------------
        merchants_config = [
            {
                "id": "merch_saas_metrics_01",
                "name": "SaaS Metrics Cloud Pvt Ltd",
                "razorpay_account_id": "acc_rzp_live_saasmetrics",
            },
            {
                "id": "m_demo_merchant_01",
                "name": "SaaS Metrics Cloud (Demo Workspace)",
                "razorpay_account_id": "acc_demo_rzp_01",
            },
            {
                "id": "merch_demo_0001",
                "name": "SaaS Metrics Cloud Pvt Ltd",
                "razorpay_account_id": "acc_rzp_demo_merchant_001",
            },
        ]

        merchants = []
        for m_cfg in merchants_config:
            m = uow.merchants.get_by_id(m_cfg["id"])
            if not m:
                m = Merchant(
                    id=m_cfg["id"],
                    name=m_cfg["name"],
                    razorpay_account_id=m_cfg["razorpay_account_id"],
                )
                uow.merchants.add(m)
            else:
                m.name = m_cfg["name"]
            merchants.append(m)
        uow.flush()

        # Seed data for both the primary tenant and demo aliases
        for merchant in merchants:
            m_id = merchant.id
            m_tag = m_id.replace("merch_", "").replace("m_", "")[:6]

            # -------------------------------------------------------------
            # 2. Safety Governance Policy
            # -------------------------------------------------------------
            policy = uow.policies.find_by_merchant_id(m_id)
            if not policy:
                policy = RecoveryPolicy(
                    id=f"pol_{m_tag}_{generate_uuid('p')[:8]}",
                    merchant_id=m_id,
                    max_retries_per_case=3,
                    min_retry_interval_hours=24,
                    max_recovery_window_days=14,
                    min_confidence_threshold=Decimal("0.75"),
                    high_value_threshold_inr=Decimal("10000.00"),
                    max_customer_contacts_per_cycle=3,
                    hard_decline_auto_stop=True,
                )
                uow.policies.add(policy)
            uow.flush()

            # Record initial policy audit event
            uow.audit_events.record_event(
                merchant_id=m_id,
                event_type="POLICY_CONFIG_UPDATED",
                actor="SYSTEM",
                payload={
                    "policy_id": policy.id,
                    "max_retries_per_case": policy.max_retries_per_case,
                    "min_retry_interval_hours": policy.min_retry_interval_hours,
                    "high_value_threshold_inr": float(policy.high_value_threshold_inr),
                    "action": "POLICY_INITIALIZED",
                },
                correlation_id=f"corr_pol_init_{m_tag}",
            )

            # -------------------------------------------------------------
            # 3. Realistic Customers
            # -------------------------------------------------------------
            customers_def = [
                ("cust_sm_01", "Rajesh Kumar", "rajesh.kumar@enterprise.in", "+919876543210", 24, Decimal("0.96")),
                ("cust_sm_02", "Priya Sharma", "priya.sharma@techcorp.io", "+919876543211", 14, Decimal("0.92")),
                ("cust_sm_03", "Vikram Malhotra", "vikram.m@finscale.co", "+919876543212", 8, Decimal("0.85")),
                ("cust_sm_04", "Ananya Iyer", "ananya.iyer@cloudinfra.com", "+919876543213", 18, Decimal("0.98")),
                ("cust_sm_05", "Amit Patel", "amit.patel@growthventures.in", "+919876543214", 3, Decimal("0.70")),
                ("cust_sm_06", "Neha Deshmukh", "neha.d@apexanalytics.io", "+919876543215", 36, Decimal("0.99")),
                ("cust_sm_07", "Rohan Nair", "rohan.nair@hyperstack.dev", "+919876543216", 6, Decimal("0.80")),
                ("cust_sm_08", "Sneha Reddy", "sneha.reddy@dataprism.co", "+919876543217", 12, Decimal("0.88")),
            ]

            cust_map = {}
            for rzp_cid, name, email, phone, tenure, success_rate in customers_def:
                cust = uow.customers.find_by_razorpay_id(m_id, rzp_cid)
                if not cust:
                    cust = Customer(
                        id=generate_uuid("cust"),
                        merchant_id=m_id,
                        razorpay_customer_id=rzp_cid,
                        email=email,
                        contact=phone,
                        tenure_months=tenure,
                        historical_success_rate=success_rate,
                    )
                    uow.customers.add(cust)
                cust_map[rzp_cid] = cust
            uow.flush()

            # -------------------------------------------------------------
            # 4. Subscriptions
            # -------------------------------------------------------------
            subs_def = [
                ("sub_sm_01", "cust_sm_01", "plan_pro_monthly", "active", 12),
                ("sub_sm_02", "cust_sm_02", "plan_enterprise_annual", "active", 2),
                ("sub_sm_03", "cust_sm_03", "plan_team_monthly", "active", 8),
                ("sub_sm_04", "cust_sm_04", "plan_growth_monthly", "active", 18),
                ("sub_sm_05", "cust_sm_05", "plan_starter_monthly", "halted", 3),
                ("sub_sm_06", "cust_sm_06", "plan_enterprise_quarterly", "active", 9),
                ("sub_sm_07", "cust_sm_07", "plan_pro_monthly", "pending", 6),
                ("sub_sm_08", "cust_sm_08", "plan_team_monthly", "active", 11),
            ]

            sub_map = {}
            for rzp_sid, cust_key, plan_id, status, cycle in subs_def:
                sub = uow.subscriptions.find_by_razorpay_id(rzp_sid)
                if not sub:
                    sub = Subscription(
                        id=generate_uuid("sub"),
                        merchant_id=m_id,
                        customer_id=cust_map[cust_key].id,
                        razorpay_subscription_id=rzp_sid,
                        status=status,
                        plan_id=plan_id,
                        current_cycle=cycle,
                    )
                    uow.subscriptions.add(sub)
                sub_map[rzp_sid] = sub
            uow.flush()

            # -------------------------------------------------------------
            # 5. Realistic Cases Dataset (16 Cases with Full Lifecycle)
            # -------------------------------------------------------------
            cases_specs = [
                # --- 5 RECOVERED CASES ---
                {
                    "tag": "rec_01",
                    "sub": "sub_sm_01",
                    "inv": f"inv_{m_tag}_0801",
                    "amount": Decimal("2499.00"),
                    "state": "RECOVERED",
                    "stage": "HALTED_RECOVERY",
                    "cat": "TEMPORARY",
                    "code": "insufficient_funds",
                    "attempts": 1,
                    "contacts": 1,
                    "rec_amt": Decimal("2499.00"),
                    "resolved_offset": 24,
                    "created_offset": 48,
                    "ai_action": "PAYMENT_LINK_DELIVERY",
                    "ai_confidence": Decimal("0.92"),
                    "ai_reason": "Customer has high tenure (24m) and 96% historical success rate. Temporary insufficient funds on debit card. Smart payment link via WhatsApp delivered with instant UPI payment conversion.",
                    "actions": [
                        ("PAYMENT_LINK_DELIVERY", "RECONCILED", f"pay_link_rec_{m_tag}_01", f"idemp_{m_tag}_01", 36),
                    ],
                },
                {
                    "tag": "rec_02",
                    "sub": "sub_sm_02",
                    "inv": f"inv_{m_tag}_0802",
                    "amount": Decimal("12000.00"),
                    "state": "RECOVERED",
                    "stage": "HALTED_RECOVERY",
                    "cat": "ACTION_REQUIRED",
                    "code": "card_expired",
                    "attempts": 1,
                    "contacts": 1,
                    "rec_amt": Decimal("12000.00"),
                    "resolved_offset": 12,
                    "created_offset": 36,
                    "ai_action": "PAYMENT_LINK_DELIVERY",
                    "ai_confidence": Decimal("0.89"),
                    "ai_reason": "Corporate card expiration detected. Mandate update payment link delivered. Customer updated card credentials and settled invoice.",
                    "actions": [
                        ("PAYMENT_LINK_DELIVERY", "RECONCILED", f"pay_mandate_upd_{m_tag}_02", f"idemp_{m_tag}_02", 20),
                    ],
                },
                {
                    "tag": "rec_03",
                    "sub": "sub_sm_03",
                    "inv": f"inv_{m_tag}_0803",
                    "amount": Decimal("4999.00"),
                    "state": "RECOVERED",
                    "stage": "HALTED_RECOVERY",
                    "cat": "TEMPORARY",
                    "code": "bank_downtime",
                    "attempts": 1,
                    "contacts": 0,
                    "rec_amt": Decimal("4999.00"),
                    "resolved_offset": 8,
                    "created_offset": 32,
                    "ai_action": "AUTO_RETRY",
                    "ai_confidence": Decimal("0.95"),
                    "ai_reason": "Issuing bank (HDFC) core banking network outage. Scheduled automatic retry 24 hours later. Debit succeeded without customer disruption.",
                    "actions": [
                        ("AUTO_RETRY", "RECONCILED", f"pay_retry_succ_{m_tag}_03", f"idemp_{m_tag}_03", 10),
                    ],
                },
                {
                    "tag": "rec_04",
                    "sub": "sub_sm_04",
                    "inv": f"inv_{m_tag}_0804",
                    "amount": Decimal("1499.00"),
                    "state": "RECOVERED",
                    "stage": "HALTED_RECOVERY",
                    "cat": "TEMPORARY",
                    "code": "daily_limit_exceeded",
                    "attempts": 1,
                    "contacts": 1,
                    "rec_amt": Decimal("1499.00"),
                    "resolved_offset": 18,
                    "created_offset": 40,
                    "ai_action": "PAYMENT_LINK_DELIVERY",
                    "ai_confidence": Decimal("0.94"),
                    "ai_reason": "Daily UPI limit exceeded at end of month. Automated SMS payment link allowed customer to switch to Netbanking and settle.",
                    "actions": [
                        ("PAYMENT_LINK_DELIVERY", "RECONCILED", f"pay_netbank_{m_tag}_04", f"idemp_{m_tag}_04", 22),
                    ],
                },
                {
                    "tag": "rec_05",
                    "sub": "sub_sm_06",
                    "inv": f"inv_{m_tag}_0805",
                    "amount": Decimal("8500.00"),
                    "state": "RECOVERED",
                    "stage": "HALTED_RECOVERY",
                    "cat": "TEMPORARY",
                    "code": "insufficient_funds",
                    "attempts": 2,
                    "contacts": 1,
                    "rec_amt": Decimal("8500.00"),
                    "resolved_offset": 6,
                    "created_offset": 54,
                    "ai_action": "PAYMENT_LINK_DELIVERY",
                    "ai_confidence": Decimal("0.91"),
                    "ai_reason": "Quarterly invoice payment failed initial debit. Spaced retry + payment link reminder triggered payment on salary credit date.",
                    "actions": [
                        ("AUTO_RETRY", "FAILED", None, f"idemp_{m_tag}_05a", 48),
                        ("PAYMENT_LINK_DELIVERY", "RECONCILED", f"pay_upi_succ_{m_tag}_05", f"idemp_{m_tag}_05b", 12),
                    ],
                },

                # --- 3 ACTIVE / SCHEDULED PIPELINE CASES ---
                {
                    "tag": "act_01",
                    "sub": "sub_sm_01",
                    "inv": f"inv_{m_tag}_0806",
                    "amount": Decimal("2499.00"),
                    "state": "SCHEDULED",
                    "stage": "PENDING_OBSERVATION",
                    "cat": "TEMPORARY",
                    "code": "insufficient_funds",
                    "attempts": 1,
                    "contacts": 0,
                    "rec_amt": Decimal("0.00"),
                    "resolved_offset": None,
                    "created_offset": 12,
                    "ai_action": "AUTO_RETRY",
                    "ai_confidence": Decimal("0.88"),
                    "ai_reason": "Transient low balance. Spaced retry scheduled for optimal morning debit window (06:00 IST tomorrow).",
                    "actions": [
                        ("AUTO_RETRY", "SCHEDULED", None, f"idemp_{m_tag}_06", 2),
                    ],
                },
                {
                    "tag": "act_02",
                    "sub": "sub_sm_03",
                    "inv": f"inv_{m_tag}_0807",
                    "amount": Decimal("4999.00"),
                    "state": "SCHEDULED",
                    "stage": "PENDING_OBSERVATION",
                    "cat": "TEMPORARY",
                    "code": "network_timeout",
                    "attempts": 0,
                    "contacts": 0,
                    "rec_amt": Decimal("0.00"),
                    "resolved_offset": None,
                    "created_offset": 4,
                    "ai_action": "AUTO_RETRY",
                    "ai_confidence": Decimal("0.93"),
                    "ai_reason": "Gateway handshake timeout. Immediate retry blocked by MIN_RETRY_INTERVAL rule; auto-retry scheduled in 24 hours.",
                    "actions": [
                        ("AUTO_RETRY", "SCHEDULED", None, f"idemp_{m_tag}_07", 1),
                    ],
                },
                {
                    "tag": "act_03",
                    "sub": "sub_sm_07",
                    "inv": f"inv_{m_tag}_0808",
                    "amount": Decimal("999.00"),
                    "state": "ACTION_PENDING",
                    "stage": "PENDING_OBSERVATION",
                    "cat": "ACTION_REQUIRED",
                    "code": "card_authentication_failed",
                    "attempts": 1,
                    "contacts": 1,
                    "rec_amt": Decimal("0.00"),
                    "resolved_offset": None,
                    "created_offset": 8,
                    "ai_action": "PAYMENT_LINK_DELIVERY",
                    "ai_confidence": Decimal("0.84"),
                    "ai_reason": "3D Secure step-up authentication failed. Smart payment link dispatched to customer email/SMS.",
                    "actions": [
                        ("PAYMENT_LINK_DELIVERY", "EXECUTED", f"plink_act_{m_tag}_08", f"idemp_{m_tag}_08", 4),
                    ],
                },

                # --- 3 ESCALATED / HUMAN INTERVENTION CASES ---
                {
                    "tag": "esc_01",
                    "sub": "sub_sm_02",
                    "inv": f"inv_{m_tag}_0809",
                    "amount": Decimal("35000.00"),
                    "state": "ESCALATED",
                    "stage": "HALTED_RECOVERY",
                    "cat": "ACTION_REQUIRED",
                    "code": "high_value_transaction",
                    "attempts": 0,
                    "contacts": 0,
                    "rec_amt": Decimal("0.00"),
                    "resolved_offset": None,
                    "created_offset": 6,
                    "ai_action": "MANUAL_ESCALATION",
                    "ai_confidence": Decimal("0.96"),
                    "ai_reason": "Invoice amount (₹35,000) exceeds merchant high-value threshold (₹10,000). HIGH_VALUE_ESCALATION rule enforced to prevent automated retries. Requires Account Executive review.",
                    "actions": [],
                },
                {
                    "tag": "esc_02",
                    "sub": "sub_sm_06",
                    "inv": f"inv_{m_tag}_0810",
                    "amount": Decimal("18500.00"),
                    "state": "ESCALATED",
                    "stage": "HALTED_RECOVERY",
                    "cat": "TEMPORARY",
                    "code": "corporate_card_declined",
                    "attempts": 1,
                    "contacts": 1,
                    "rec_amt": Decimal("0.00"),
                    "resolved_offset": None,
                    "created_offset": 14,
                    "ai_action": "MANUAL_ESCALATION",
                    "ai_confidence": Decimal("0.90"),
                    "ai_reason": "High-value B2B quarterly renewal declined by issuing corporate desk. Escalated for direct CSM outreach.",
                    "actions": [
                        ("PAYMENT_LINK_DELIVERY", "EXECUTED", f"plink_esc_{m_tag}_10", f"idemp_{m_tag}_10", 10),
                    ],
                },
                {
                    "tag": "esc_03",
                    "sub": "sub_sm_05",
                    "inv": f"inv_{m_tag}_0811",
                    "amount": Decimal("6499.00"),
                    "state": "ESCALATED",
                    "stage": "HALTED_RECOVERY",
                    "cat": "RISK_FLAGGED",
                    "code": "abnormal_decline_pattern",
                    "attempts": 1,
                    "contacts": 1,
                    "rec_amt": Decimal("0.00"),
                    "resolved_offset": None,
                    "created_offset": 18,
                    "ai_action": "MANUAL_ESCALATION",
                    "ai_confidence": Decimal("0.72"),
                    "ai_reason": "AI confidence score (0.72) is below policy safety gate (0.75). LOW_CONFIDENCE_VETO gate triggered to route to merchant operations team.",
                    "actions": [],
                },

                # --- 2 HALTED / STOPPED CASES ---
                {
                    "tag": "hlt_01",
                    "sub": "sub_sm_05",
                    "inv": f"inv_{m_tag}_0812",
                    "amount": Decimal("2499.00"),
                    "state": "HALTED",
                    "stage": "HALTED_RECOVERY",
                    "cat": "PERMANENT",
                    "code": "account_closed",
                    "attempts": 0,
                    "contacts": 0,
                    "rec_amt": Decimal("0.00"),
                    "resolved_offset": 20,
                    "created_offset": 24,
                    "ai_action": "STOP_RECOVERY",
                    "ai_confidence": Decimal("0.99"),
                    "ai_reason": "Hard decline: Bank account permanently closed. HARD_DECLINE_VETO safety rule enforced immediately. All retries stopped to avoid gateway bounce penalties.",
                    "actions": [],
                },
                {
                    "tag": "hlt_02",
                    "sub": "sub_sm_07",
                    "inv": f"inv_{m_tag}_0813",
                    "amount": Decimal("4999.00"),
                    "state": "HALTED",
                    "stage": "HALTED_RECOVERY",
                    "cat": "PERMANENT",
                    "code": "card_stolen_lost",
                    "attempts": 0,
                    "contacts": 0,
                    "rec_amt": Decimal("0.00"),
                    "resolved_offset": 16,
                    "created_offset": 20,
                    "ai_action": "STOP_RECOVERY",
                    "ai_confidence": Decimal("0.99"),
                    "ai_reason": "Card reported lost or stolen. Terminal fraud prevention gate triggered. Mandate marked invalid.",
                    "actions": [],
                },

                # --- 2 FAILED / EXHAUSTED CASES ---
                {
                    "tag": "fld_01",
                    "sub": "sub_sm_05",
                    "inv": f"inv_{m_tag}_0814",
                    "amount": Decimal("1999.00"),
                    "state": "FAILED",
                    "stage": "HALTED_RECOVERY",
                    "cat": "TEMPORARY",
                    "code": "insufficient_funds",
                    "attempts": 3,
                    "contacts": 3,
                    "rec_amt": Decimal("0.00"),
                    "resolved_offset": 2,
                    "created_offset": 168,
                    "ai_action": "STOP_RECOVERY",
                    "ai_confidence": Decimal("0.85"),
                    "ai_reason": "Maximum retries limit (3/3) reached across 7 days with no successful debit. MAX_RETRIES_CAP rule stopped recovery cycle.",
                    "actions": [
                        ("AUTO_RETRY", "FAILED", None, f"idemp_{m_tag}_14a", 140),
                        ("AUTO_RETRY", "FAILED", None, f"idemp_{m_tag}_14b", 90),
                        ("PAYMENT_LINK_DELIVERY", "FAILED", None, f"idemp_{m_tag}_14c", 30),
                    ],
                },
                {
                    "tag": "fld_02",
                    "sub": "sub_sm_08",
                    "inv": f"inv_{m_tag}_0815",
                    "amount": Decimal("3499.00"),
                    "state": "FAILED",
                    "stage": "HALTED_RECOVERY",
                    "cat": "ACTION_REQUIRED",
                    "code": "mandate_revoked_by_customer",
                    "attempts": 2,
                    "contacts": 2,
                    "rec_amt": Decimal("0.00"),
                    "resolved_offset": 1,
                    "created_offset": 200,
                    "ai_action": "STOP_RECOVERY",
                    "ai_confidence": Decimal("0.90"),
                    "ai_reason": "Customer cancelled recurring mandate via netbanking portal. Recovery window expired after 14 days without customer resolution.",
                    "actions": [
                        ("PAYMENT_LINK_DELIVERY", "FAILED", None, f"idemp_{m_tag}_15a", 150),
                        ("PAYMENT_LINK_DELIVERY", "FAILED", None, f"idemp_{m_tag}_15b", 50),
                    ],
                },

                # --- 1 FRESH DETECTED CASE ---
                {
                    "tag": "det_01",
                    "sub": "sub_sm_04",
                    "inv": f"inv_{m_tag}_0816",
                    "amount": Decimal("2499.00"),
                    "state": "DETECTED",
                    "stage": "PENDING_OBSERVATION",
                    "cat": "TEMPORARY",
                    "code": "insufficient_funds",
                    "attempts": 0,
                    "contacts": 0,
                    "rec_amt": Decimal("0.00"),
                    "resolved_offset": None,
                    "created_offset": 1,
                    "ai_action": "AUTO_RETRY",
                    "ai_confidence": Decimal("0.91"),
                    "ai_reason": "Fresh payment failure webhook ingested. Customer context aggregated and ready for autonomous intervention.",
                    "actions": [],
                },
            ]

            for spec in cases_specs:
                case = uow.cases.find_by_invoice_id(m_id, spec["inv"])
                c_created = now - timedelta(hours=spec["created_offset"])
                c_resolved = (now - timedelta(hours=spec["resolved_offset"])) if spec["resolved_offset"] is not None else None

                if not case:
                    case = RecoveryCase(
                        id=generate_uuid("case"),
                        merchant_id=m_id,
                        subscription_id=sub_map[spec["sub"]].id,
                        invoice_id=spec["inv"],
                        payment_id=f"pay_init_{spec['inv']}",
                        amount_inr=spec["amount"],
                        currency="INR",
                        stage=spec["stage"],
                        state=spec["state"],
                        failure_category=spec["cat"],
                        failure_code=spec["code"],
                        attempt_count=spec["attempts"],
                        contacts_count=spec["contacts"],
                        recovered_amount_inr=spec["rec_amt"],
                        version=1,
                        created_at=c_created,
                        updated_at=c_resolved or c_created,
                        resolved_at=c_resolved,
                    )
                    uow.cases.add(case)
                else:
                    # Update fields to ensure fresh seed consistency
                    case.state = spec["state"]
                    case.stage = spec["stage"]
                    case.failure_category = spec["cat"]
                    case.failure_code = spec["code"]
                    case.attempt_count = spec["attempts"]
                    case.contacts_count = spec["contacts"]
                    case.recovered_amount_inr = spec["rec_amt"]
                    case.amount_inr = spec["amount"]
                    case.resolved_at = c_resolved
                    case.updated_at = c_resolved or c_created

                uow.flush()

                # Clean existing child decisions/actions/audits for this case to reseed cleanly
                uow.session.query(RecoveryDecision).filter(RecoveryDecision.recovery_case_id == case.id).delete()
                uow.session.query(RecoveryAction).filter(RecoveryAction.recovery_case_id == case.id).delete()
                uow.session.query(AuditEvent).filter(AuditEvent.recovery_case_id == case.id).delete()
                uow.flush()

                # A. Create Decision record
                dec = RecoveryDecision(
                    id=generate_uuid("dec"),
                    recovery_case_id=case.id,
                    recommended_action=spec["ai_action"],
                    delay_hours=24 if spec["ai_action"] == "AUTO_RETRY" else 0,
                    confidence=spec["ai_confidence"],
                    reasoning=spec["ai_reason"],
                    risk_flags=["HIGH_VALUE"] if spec["amount"] >= Decimal("10000.00") else [],
                    created_at=c_created + timedelta(minutes=2),
                )
                uow.session.add(dec)

                # B. Create Action records
                for act_type, act_status, ext_ref, idemp, act_offset_hrs in spec["actions"]:
                    act_executed = now - timedelta(hours=act_offset_hrs)
                    act = RecoveryAction(
                        id=generate_uuid("act"),
                        recovery_case_id=case.id,
                        action_type=act_type,
                        idempotency_key=f"{idemp}_{generate_uuid('k')[:6]}",
                        status=act_status,
                        external_reference_id=ext_ref,
                        executed_at=act_executed,
                    )
                    uow.session.add(act)

                # C. Record Chronological Audit Events for Case
                # 1. Classification
                uow.audit_events.record_event(
                    merchant_id=m_id,
                    recovery_case_id=case.id,
                    event_type="PAYMENT_FAILURE_CLASSIFIED",
                    actor="FAILURE_INTELLIGENCE_SERVICE",
                    payload={
                        "invoice_id": case.invoice_id,
                        "failure_code": case.failure_code,
                        "failure_category": case.failure_category,
                        "amount_inr": float(case.amount_inr),
                    },
                    correlation_id=f"corr_cls_{case.id[:8]}",
                )

                # 2. AI Decision
                uow.audit_events.record_event(
                    merchant_id=m_id,
                    recovery_case_id=case.id,
                    event_type="AI_DECISION_PRODUCED",
                    actor="AI_DECISION_ENGINE",
                    payload={
                        "recommended_action": spec["ai_action"],
                        "confidence": float(spec["ai_confidence"]),
                        "reasoning": spec["ai_reason"],
                    },
                    correlation_id=f"corr_dec_{case.id[:8]}",
                )

                # 3. Policy Evaluation
                uow.audit_events.record_event(
                    merchant_id=m_id,
                    recovery_case_id=case.id,
                    event_type="POLICY_DECISION_EVALUATED",
                    actor="POLICY_ENGINE",
                    payload={
                        "authorized_action": spec["ai_action"] if spec["state"] != "ESCALATED" else "MANUAL_ESCALATION",
                        "policy_gate": "PASSED" if spec["state"] != "ESCALATED" and spec["state"] != "HALTED" else "VETOED",
                        "rules_evaluated": ["HARD_DECLINE_VETO", "MAX_RETRIES_CAP", "HIGH_VALUE_ESCALATION", "LOW_CONFIDENCE_VETO"],
                    },
                    correlation_id=f"corr_pol_{case.id[:8]}",
                )

                # 4. Action / Outcome if RECOVERED
                if spec["state"] == "RECOVERED":
                    uow.audit_events.record_event(
                        merchant_id=m_id,
                        recovery_case_id=case.id,
                        event_type="RECOVERY_ACTION_EXECUTED",
                        actor="RECOVERY_EXECUTION_SERVICE",
                        payload={
                            "action_type": spec["ai_action"],
                            "status": "EXECUTED",
                            "dispatched_at": (c_resolved - timedelta(hours=1)).isoformat() if c_resolved else None,
                        },
                        correlation_id=f"corr_act_{case.id[:8]}",
                    )
                    uow.audit_events.record_event(
                        merchant_id=m_id,
                        recovery_case_id=case.id,
                        event_type="PAYMENT_OUTCOME_RECONCILED",
                        actor="RECONCILIATION_SERVICE",
                        payload={
                            "recovered_amount_inr": float(spec["rec_amt"]),
                            "currency": "INR",
                            "settled_at": c_resolved.isoformat() if c_resolved else None,
                            "reconciliation_status": "MATCHED_AND_SETTLED",
                        },
                        correlation_id=f"corr_rec_{case.id[:8]}",
                    )
                elif spec["state"] == "ESCALATED":
                    uow.audit_events.record_event(
                        merchant_id=m_id,
                        recovery_case_id=case.id,
                        event_type="RECOVERY_STATE_TRANSITIONED",
                        actor="POLICY_ENGINE",
                        payload={
                            "previous_state": "DETECTED",
                            "new_state": "ESCALATED",
                            "reason": spec["ai_reason"],
                        },
                        correlation_id=f"corr_esc_{case.id[:8]}",
                    )

        uow.commit()
        logger.info("Comprehensive database seeding completed successfully.")


if __name__ == "__main__":
    seed_database()
    print("Comprehensive database seeding completed successfully!")
