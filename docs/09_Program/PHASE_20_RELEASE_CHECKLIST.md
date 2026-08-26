# Phase 20 — Production Release Checklist

**Document ID:** DOC-CHK-020  
**Phase ID:** TSK-029-10  
**Status:** APPROVED & ACTIVE  
**Date:** 2026-08-26  

---

## 1. Pre-Deployment Verification Gate

- [ ] **Git Baseline:** Working tree is clean on origin/main at certified commit.
- [ ] **Dependencies:** Python dependencies (
equirements.txt) and Node dependencies (package.json) locked.
- [ ] **Secrets & Security:** python scripts/security_scan.py executed (0 findings).
- [ ] **Environment Configuration:**
  - [ ] APP_ENV=production set.
  - [ ] APP_DEBUG=false verified.
  - [ ] APP_SECRET_KEY set with high-entropy 64-char key.
  - [ ] DATABASE_URL configured for production PostgreSQL cluster with TLS.
  - [ ] REDIS_URL configured for production Redis instance with auth.
  - [ ] OPENROUTER_API_KEY set (free model routing active).
  - [ ] RAZORPAY_KEY_ID, RAZORPAY_KEY_SECRET, RAZORPAY_WEBHOOK_SECRET securely injected via secret manager.
- [ ] **Database Readiness:**
  - [ ] PostgreSQL cluster healthy and reachable.
  - [ ] DB schema verified and all tables/constraints active.
  - [ ] Initial backup snapshot completed before migration.
- [ ] **Container Topology:** docker compose config validated.

---

## 2. Deployment Sequence

1. **Phase 1: Pre-flight Health Check**
   - Verify health endpoints: GET /api/v1/healthz, GET /api/v1/readyz, GET /api/v1/livez.
2. **Phase 2: Database Initialization & Verification**
   - Apply schema updates via migration scripts or table verification.
3. **Phase 3: Service Startup**
   - Start PostgreSQL and Redis backing stores.
   - Start backend API instances (gunicorn -w 4 app.main:create_app()).
   - Start Celery asynchronous worker pool (celery -A app.workers.celery_app worker).
   - Start Nginx / Frontend static asset distribution.
4. **Phase 4: Smoke Test Execution**
   - Test authenticated merchant health endpoint: GET /api/v1/healthz with X-Merchant-ID.
   - Test read access on policies: GET /api/v1/policies.
   - Test evaluation summary: GET /api/v1/evaluation/summary.

---

## 3. Post-Deployment Verification Gate

- [ ] **API Availability:** Backend responds < 50ms on /api/v1/healthz.
- [ ] **Worker Health:** Celery ping succeeds and worker queue is consuming.
- [ ] **Observability:** Centralized logs show structured JSON format with correlation IDs.
- [ ] **Audit Trail:** Ingestion and policy audit events written to udit_events table.
- [ ] **Sign-off:** Release Engineer and QA Lead formal approval.
