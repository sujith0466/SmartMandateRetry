# Phase 20 — Production Rollback Runbook

**Document ID:** DOC-RBK-020  
**Phase ID:** TSK-029-10  
**Status:** APPROVED & ACTIVE  
**Date:** 2026-08-26  

---

## 1. Rollback Triggers

An immediate production rollback must be initiated if any of the following conditions occur post-deployment:
1. **P0 Safety Violation:** Automated retries dispatched on Hard Decline failure codes.
2. **API Unavailability:** HTTP 5xx error rate exceeds 0.5% over a 5-minute rolling window.
3. **Database Integrity Breach:** Transaction rollback failure or data corruption detected in 
ecovery_cases or udit_events.
4. **Reconciliation Loop Failure:** Inbound payment webhooks fail signature validation or idempotency keys fail deduplication.
5. **AI Gateway Outage:** OpenRouter requests timeout consecutively and failover does not recover within 3 attempts.

---

## 2. Emergency Rollback Sequence

### Step 1: Traffic Containment
1. Switch incoming webhook ingress to standby queue / dead-letter buffer to prevent event loss.
2. Direct API gateway / load balancer traffic to the previous stable release container image.

### Step 2: Service Reversion
1. Roll back backend application containers to the previously certified Docker image tag:
   `ash
   docker compose down backend celery_worker
   docker compose up -d --no-deps backend celery_worker
   `
2. Roll back frontend static bundle to the previous release distribution.

### Step 3: Database Compatibility & State Recovery
1. Database schema in SmartMandateRetry is strictly additive and backwards-compatible.
2. If database state remediation is required:
   - Restore PostgreSQL from pre-deployment snapshot:
     `ash
     pg_restore -U postgres -d smartmandate_db /backup/pre_deploy_snapshot.dump
     `
   - Replay pending webhook events from Redis stream or dead-letter queue.

### Step 4: Verification & Sign-off
1. Verify /api/v1/healthz returns status: OK.
2. Verify existing recovery cases resume processing.
3. Post incident report and schedule root cause analysis (RCA).
