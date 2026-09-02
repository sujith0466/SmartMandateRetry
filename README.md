# SmartMandateRetry

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python: 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![React: 18](https://img.shields.io/badge/react-18-blue.svg)](https://reactjs.org/)
[![Status: Certified](https://img.shields.io/badge/Phase%20G-SHORTLIST%20READY-brightgreen.svg)](docs/09_Program/PHASE_G_RUBRIC_SELF_SCORE.md)
[![Benchmark: TEST Split](https://img.shields.io/badge/Net%20Uplift-%2B17.1%20pp-blueviolet.svg)](docs/09_Program/EVALUATION_LAB_PERFORMANCE_CERTIFICATION.md)

> **SmartMandateRetry is an autonomous, policy-governed subscription recovery engine built for the Razorpay Buildathon (Track 03). It eliminates involuntary subscriber churn by diagnosing recurring payment failures, selecting optimal recovery actions across payment rails, enforcing strict merchant safety rules, and reconciling settlements with full cryptographic auditability.**

---

## Demo Video

[Watch the 5-Minute Demo Video](https://drive.google.com/file/d/1wpsiNYDunIC4PNB53sW2HcXrESMIu89E/view?usp=sharing)

---

## 1. The Core Problem: Involuntary Subscription Churn

In India's recurring payments ecosystem (e-mandates on Cards, UPI AutoPay, NetBanking SI), **over 60% of subscriber churn is involuntary** — caused by transient bank outages, temporary insufficient balances, expired cards, or mandate synchronization gaps rather than intentional customer cancellations.

Standard payment retries rely on naive static delays (e.g., retry blindly 24 hours later), which often fail because:
* They re-attempt during known bank downtime windows.
* They trigger merchant chargeback risks and card network penalty fees.
* They lack out-of-band alternative recovery rails when an underlying mandate is permanently broken.

---

## 2. Core Architecture & 5-Stage Recovery Pipeline

SmartMandateRetry operates as a dual-brain system: an **AI Intelligence Engine** diagnoses the failure and proposes a strategy, while a **Deterministic Policy Engine** holds absolute veto authority to guarantee safety and regulatory compliance.

```text
[Inbound Razorpay Webhook] ──> HMAC-SHA256 Verification & Idempotent Ingestion
            │
            ▼
[Failure Classification] ──> 14 Failure Families & 4 Difficulty Tiers
            │
            ▼
[AI Recommendation] ──> Proposes Action, Channel, Timing & Confidence Score
            │
            ▼
[Deterministic Policy Engine] ──> Fail-Closed Safety Gate (Vetoes / Approves)
            │
      ┌─────┴─────┐
      ▼           ▼
  [APPROVED]   [BLOCKED/STOP]
      │           │
[Action Dispatcher] ──> Razorpay Payment Links / Timed Countdown Checks / Escalation
      │
      ▼
[Reconciliation & Settlement] ──> Inbound Webhook Reconciliation & Realized INR Recovery
      │
      ▼
[Immutable Audit Trail] ──> Append-Only Ledger with Correlation IDs
```

### Key Architectural Invariants
1. **Zero Direct LLM Mutation:** The LLM produces recommendations only; the deterministic Policy Engine has absolute fail-closed veto authority.
2. **Two-Stage Lifecycle Separation:**
   * `Stage 1 (PENDING_OBSERVATION)`: Observes Razorpay's native retries without interference.
   * `Stage 2 (HALTED_RECOVERY)`: Primary autonomous recovery post-`subscription.halted` using alternative payment rails.
3. **Strict RBI Card-Token Compliance:** Complies with RBI recurring mandate mandates without storing raw PANs or bypassing 2FA requirements.

---

## 3. Certified Benchmark Evidence (Held-Out TEST Split)

All evaluation metrics are computed on a deterministic, held-out dataset generated from **Seed 42** (802 TEST scenarios across 14 failure families):

| Metric | Razorpay Native Baseline | Static Rule-Based | Unguarded AI | SmartMandateRetry (Ours) |
| :--- | :---: | :---: | :---: | :---: |
| **Recovery Rate** | 29.2% | 27.6% | 83.2% | **46.3%** |
| **Net Recovery Uplift** | Baseline | -1.6 pp | +54.0 pp | **+17.1 pp** |
| **Policy Violations** | 58 | 0 | 114 | **0 (100% Compliant)** |
| **Label Accuracy** | 53.4% | 44.6% | 58.9% | **100.0%** |
| **Intervention Efficiency** | 41.2% | 38.0% | 48.7% | **89.4%** |

*Evaluation evidence is fully reproducible live in the [Evaluation Lab](#4-the-evaluation-lab).*

---

## 4. The Evaluation Lab (`/evaluation`)

The **Evaluation Lab** provides a scientific proof engine for merchants and evaluators to stress-test the system across 5,000 synthetic failure scenarios:
* **4-Way Comparative Benchmark:** Instant side-by-side shootout between SmartMandateRetry, Razorpay Native, Static Rules, and Unguarded AI.
* **Safety & Policy Guardrails Audit:** Verifies zero-tolerance enforcement for hard declines, retry caps, and contact frequency limits.
* **Recovery & Financial ROI Analytics:** Rupee-denominated recovery yield and avoided involuntary churn calculations.
* **14 Failure Families Breakdown:** Granular performance breakdowns across UPI mandate failures, expired cards, and bank timeouts.
* **Scenario Results Explorer:** Granular row-by-row inspection with full decision attribution and policy execution audit logs.

---

## 5. Integration Boundaries & Operational Reality

| Capability / Subsystem | Integration Status | Architecture & Implementation |
| :--- | :---: | :--- |
| **Razorpay Payment Links** | **REAL API** | Live `POST /v1/payment_links` client with idempotency keys and dynamic expiry. |
| **Razorpay Webhook Ingestion** | **REAL API** | `POST /api/v1/webhooks/razorpay` with HMAC-SHA256 cryptographic verification. |
| **PostgreSQL Database** | **REAL DB** | SQLAlchemy 2.0 repository layer with optimistic concurrency locking and migrations. |
| **Redis Cache & Broker** | **REAL REDIS** | Redis 7 container for caching, rate limiting, and background task scheduling. |
| **SMS / WhatsApp Messaging** | **SANDBOX / SIMULATED** | Dispatch simulation logging to audit trail (ready for Twilio / Gupshup credentials). |
| **Bank Mandate Updates** | **POLICY-BOUND** | Governed by RBI recurring guidelines (guides customer to re-authenticate mandate). |

---

## 6. Multi-Container Docker Architecture

SmartMandateRetry is containerized with multi-stage Docker builds connecting to PostgreSQL and Redis:

```text
                     Docker Network: smartmandateretry_default
                                         │
           ┌─────────────────────────────┴─────────────────────────────┐
           │                                                           │
           ▼                                                           ▼
smartmandate-frontend                                       smartmandate-backend
   (Port 3000:80)                                              (Port 5000:5000)
[Nginx Reverse Proxy / SPA]                                [Gunicorn WSGI + Flask 3.1.3]
           │                                                           │
           └────────────── Proxy Pass: /api/ ──────────────────────────┤
                                                                       │
                                         ┌─────────────────────────────┴─────────────────────────────┐
                                         │                                                           │
                                         ▼                                                           ▼
                               smartmandate-postgres                                       smartmandate-redis
                                  (Port 5432:5432)                                            (Port 6379:6379)
                            [PostgreSQL 16 Database]                                    [Redis 7 Broker & Cache]
```

---

## 7. Quickstart & Local Execution

### Prerequisites
* Docker & Docker Compose
* Python 3.11+ (for local backend development)
* Node.js 20+ & npm 9+ (for local frontend development)

### Running via Docker Compose
```bash
# 1. Clone the repository and configure environment variables
cp .env.example .env

# 2. Build and launch all multi-container services
docker compose up -d --build

# 3. Access the services:
# - Merchant Console UI:     http://localhost:3000
# - Backend REST API Health: http://localhost:5000/api/v1/healthz
# - Evaluation Lab:          http://localhost:3000/evaluation
```

### Running Verification Test Suites
```bash
# Run full backend test suite (394 tests)
python -m pytest --tb=short -q

# Run frontend production build (TypeScript + Vite)
cd frontend && npm run build && cd ..

# Run interactive manual browser QA (Playwright)
python scripts/manual_browser_qa.py
```

---

## 8. Environment & Secrets Configuration

All sensitive credentials must be supplied via runtime environment variables or a `.env` file (never committed to Git):

```env
# Application Settings
APP_ENV=development
APP_SECRET_KEY=your_secret_key_here

# PostgreSQL Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/smartmandate_db

# Redis
REDIS_URL=redis://localhost:6379/0

# Razorpay API Credentials (Test Mode)
RAZORPAY_KEY_ID=rzp_test_placeholder_key_id
RAZORPAY_KEY_SECRET=rzp_test_placeholder_key_secret
RAZORPAY_WEBHOOK_SECRET=whsec_placeholder_webhook_secret

# AI Gateway (OpenRouter)
OPENROUTER_API_KEY=sk-or-v1-placeholder_key
```

---

## 9. Authoritative Documentation Suite

* **Phase G Presentation & Rubric:**
  * [`docs/09_Program/PHASE_G_RUBRIC_SELF_SCORE.md`](docs/09_Program/PHASE_G_RUBRIC_SELF_SCORE.md) — 9.62/10 Evaluator Rubric Self-Score.
  * [`docs/09_Program/PHASE_G_QA_CRIB_SHEET.md`](docs/09_Program/PHASE_G_QA_CRIB_SHEET.md) — Verbatim spoken answers for 14 hard evaluator questions.
  * [`docs/09_Program/PHASE_G_DEMO_SCRIPT.md`](docs/09_Program/PHASE_G_DEMO_SCRIPT.md) — Timed 5-minute live demo script and contingency plan.
* **Architecture & Domain Specifications:**
  * [`docs/01_Architecture/SYSTEM_ARCHITECTURE.md`](docs/01_Architecture/SYSTEM_ARCHITECTURE.md) — High-level system architecture.
  * [`docs/02_Domain/POLICY_ENGINE.md`](docs/02_Domain/POLICY_ENGINE.md) — Deterministic policy rules and safety bounds.
  * [`docs/02_Domain/RECOVERY_STATE_MACHINE.md`](docs/02_Domain/RECOVERY_STATE_MACHINE.md) — Recovery case finite state machine.
* **Certifications:**
  * [`docs/09_Program/DOCKERIZATION_CERTIFICATION_REPORT.md`](docs/09_Program/DOCKERIZATION_CERTIFICATION_REPORT.md) — Dockerization verification.
  * [`docs/09_Program/EVALUATION_LAB_PERFORMANCE_CERTIFICATION.md`](docs/09_Program/EVALUATION_LAB_PERFORMANCE_CERTIFICATION.md) — Performance optimization certification.

---

## 10. License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
