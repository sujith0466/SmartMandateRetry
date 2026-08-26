# Phase 20 — Production Operational Runbooks

**Document ID:** DOC-OPS-020  
**Phase ID:** TSK-029-11  
**Status:** APPROVED & ACTIVE  
**Date:** 2026-08-26  

---

## Runbook 1: Application Startup Failure
- **Detection:** Backend container in CrashLoopBackOff or /api/v1/healthz unreachable.
- **Diagnosis:** Check environment variables (APP_SECRET_KEY, DATABASE_URL, REDIS_URL) and DB connectivity.
- **Remediation:** Inspect docker logs smartmandate-backend. Correct missing environment configurations and restart.
- **Verification:** curl -f http://localhost:5000/api/v1/healthz returns 200 OK.

---

## Runbook 2: Database Connectivity Failure
- **Detection:** Health check reports db: degraded or SQLAlchemy OperationalError in logs.
- **Diagnosis:** Check PostgreSQL container health: docker exec smartmandate-postgres pg_isready. Verify connection pool capacity.
- **Remediation:** Restart PostgreSQL if stalled, or scale pool size (DB_POOL_SIZE) in backend configuration.
- **Verification:** Execute unit of work test query or verify health endpoint.

---

## Runbook 3: Recovery Processing Failure
- **Detection:** Case stuck in IN_PROGRESS without dispatched RecoveryAction.
- **Diagnosis:** Check Celery worker task logs for process_recovery_case task errors.
- **Remediation:** Ensure worker has active connection to Redis. Restart Celery worker (docker compose restart celery_worker).
- **Verification:** Query 
ecovery_actions table to confirm new action record in EXECUTED state.

---

## Runbook 4: Reconciliation Failure
- **Detection:** Payment webhook received but RecoveryCase remains IN_PROGRESS instead of transitioning to RECOVERED.
- **Diagnosis:** Check correlation ID in udit_events for RECONCILIATION_FAILED or RECONCILIATION_UNMATCHED.
- **Remediation:** Replay the webhook event payload using ReconciliationService.reconcile_normalized_event.
- **Verification:** Case state transitions to RECOVERED with 
ecovered_amount_inr populated.

---

## Runbook 5: Duplicate Webhook / Event
- **Detection:** Webhook received with already-processed event_id.
- **Diagnosis:** Verify WebhookEventRepository.get_by_event_id(event_id).
- **Remediation:** Idempotency layer automatically suppresses re-processing and returns cached 200 OK with idempotent_replay: true.
- **Verification:** Verify no duplicate RecoveryCase or RecoveryAction created.

---

## Runbook 6: Policy Violation Alert
- **Detection:** AuditEvent logged with status: BLOCKED or rule HARD_DECLINE_VETO.
- **Diagnosis:** Inspect policy_reasons and 
ules_applied in udit_events.payload.
- **Remediation:** Confirm safety engine behaved correctly. If AI made an invalid proposal, verify policy engine forced STOP or MANUAL_ESCALATION.
- **Verification:** Case state is HALTED / TERMINATED and no external retry executed.

---

## Runbook 7: Evaluation Benchmark Failure
- **Detection:** Benchmark CLI returns non-zero code or evaluation API returns 500.
- **Diagnosis:** Verify dataset manifest path and schema integrity. Check SeedManager deterministic generation.
- **Remediation:** Re-generate synthetic evaluation dataset (python scripts/generate_eval_dataset.py --seed 42 --size 5000).
- **Verification:** Run python scripts/run_eval_benchmark.py --split TEST --compare.

---

## Runbook 8: Security Incident / Unauthorized Access
- **Detection:** HTTP 401/403 spikes or UNAUTHORIZED_MERCHANT_ACCESS audit event.
- **Diagnosis:** Inspect request headers for invalid X-Merchant-ID or tampering.
- **Remediation:** Block offending IP at reverse proxy/WAF. Rotate compromised API keys if necessary.
- **Verification:** Security scan python scripts/security_scan.py returns 0 findings.

---

## Runbook 9: Data Integrity Concern
- **Detection:** Check constraint failure in PostgreSQL or mismatch between 
ecovery_cases.amount_inr and invoice amount.
- **Diagnosis:** Query database constraints on 
ecovery_cases, 
ecovery_actions, and udit_events.
- **Remediation:** Run DB consistency check. Ensure all mutations execute within atomic UnitOfWork transactions.
- **Verification:** Run test suite python -m pytest tests/test_database/.

---

## Runbook 10: Emergency Rollback
- **Detection:** Critical production outage or severe bug detected in active release.
- **Diagnosis:** Review PHASE_20_ROLLBACK_RUNBOOK.md triggers.
- **Remediation:** Execute Docker image revert to previous stable tag and re-route traffic.
- **Verification:** Smoke test all core endpoints (/healthz, /cases, /policies, /evaluation/summary).
