# SmartMandateRetry

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python: 3.11+](https://img.shields.io/badge/python-3.11+-blue.svg)](https://www.python.org/downloads/)
[![React: 18](https://img.shields.io/badge/react-18-blue.svg)](https://reactjs.org/)
[![Status: Frozen Baseline](https://img.shields.io/badge/Baseline-FROZEN%20v1.0.0-green.svg)](docs/09_Program/BASELINE_FREEZE.md)

> **SmartMandateRetry intelligently recovers revenue lost to failed recurring payments by diagnosing failure root causes, understanding payment/customer context, selecting bounded recovery strategies, enforcing deterministic merchant safety policies, executing only approved actions, verifying actual payment outcomes, and measuring recovered revenue.**

---

## 1. Project Status

> [!IMPORTANT]
> **SmartMandateRetry is currently in the Architecture & Repository Foundation Stage (Phases 0 & 1 Complete).**  
> All 33 authoritative architecture and product specifications are frozen at Version 1.0.0. Core domain models, migrations, and feature engines will be implemented in subsequent phases per the [Implementation Roadmap](docs/09_Program/IMPLEMENTATION_ROADMAP.md).

---

## 2. Core Architectural Philosophy

```
[Payment Failure Detected]
            │
            ▼
[AI PROPOSES (OpenRouter)] ──> Structured Strategy JSON (Root cause, Action, Timing, Confidence)
            │
            ▼
[DETERMINISTIC POLICY ENGINE DECIDES] ──> Fail-Closed Safety Gate (Caps, Intervals, Vetoes)
            │
      ┌─────┴─────┐
      ▼           ▼
  [APPROVED]   [DENIED/STOP]
      │           │
[ACTION EXECUTOR ACTS] ──> Bounded Mutation (Payment Link, Delayed Check, Escalate)
      │
      ▼
[OUTCOME VERIFICATION] ──> Inbound Settlement Webhook Reconciliation
      │
      ▼
[AUDIT + REVENUE ATTRIBUTION] ──> Immutable Append-Only Ledger & ROI Measurement
```

**Key Invariants:**
- **Zero Direct LLM Payment Execution:** The LLM produces recommendations; the deterministic Policy Engine has absolute veto authority.
- **Dual-Stage Recovery Model:**
  - `Stage 1 (PENDING_OBSERVATION)`: Observes Razorpay's native T+1..T+3 auto-retries and provides early non-conflicting customer guidance.
  - `Stage 2 (HALTED_RECOVERY)`: Primary recovery orchestration post-`halted` via Payment Links and scheduled re-engagement.
- **Action Distinction:** Clear separation between native retries, Payment Links (out-of-band collection), mandate updates, escalations, and stops.

---

## 3. Monorepo Structure

```
SmartMandateRetry/
├── backend/            # Python Flask 3.x REST API, Celery Workers, SQLAlchemy Models
├── frontend/           # React 18 + TypeScript + Vite + Tailwind CSS Console
├── shared/             # Shared JSON schemas and API contracts
├── docker/             # Dockerfiles and container configurations
├── docs/               # 33 Authoritative Frozen Specifications
├── scripts/            # Development, testing, and validation scripts
├── docker-compose.yml  # Multi-container orchestration topology
└── Makefile            # Standardized development workflows
```

---

## 4. Prerequisites & Quickstart

### Prerequisites
- Docker Engine 24.0+ & Docker Compose v2.20+
- Python 3.11+ (for local backend development)
- Node.js 18+ & npm 9+ (for local frontend development)

### Running with Docker Compose
```bash
# 1. Clone the repository and copy environment template
cp .env.example .env

# 2. Start all services (Postgres, Redis, Backend, Worker, Frontend)
docker compose up --build

# 3. Access the services:
# - Merchant Console UI:  http://localhost:3000
# - Backend REST API:     http://localhost:5000/api/v1/healthz
```

---

## 5. Authoritative Documentation Suite

Detailed architecture and design specifications are located in [`docs/`](docs/):
- **Product:** [`PRODUCT_VISION.md`](docs/00_Product/PRODUCT_VISION.md) | [`PRD.md`](docs/00_Product/PRD.md) | [`PPD.md`](docs/00_Product/PPD.md) | [`USER_JOURNEYS.md`](docs/00_Product/USER_JOURNEYS.md)
- **Architecture:** [`SYSTEM_ARCHITECTURE.md`](docs/01_Architecture/SYSTEM_ARCHITECTURE.md) | [`RAZORPAY_CAPABILITY_MATRIX.md`](docs/01_Architecture/RAZORPAY_CAPABILITY_MATRIX.md) | [`ARCHITECTURE_DECISIONS.md`](docs/01_Architecture/ARCHITECTURE_DECISIONS.md)
- **Domain & Safety:** [`DOMAIN_MODEL.md`](docs/02_Domain/DOMAIN_MODEL.md) | [`POLICY_ENGINE.md`](docs/02_Domain/POLICY_ENGINE.md) | [`RECOVERY_STATE_MACHINE.md`](docs/02_Domain/RECOVERY_STATE_MACHINE.md)
- **AI & OpenRouter:** [`OPENROUTER_INTEGRATION.md`](docs/05_AI/OPENROUTER_INTEGRATION.md) | [`AI_DECISION_SPEC.md`](docs/05_AI/AI_DECISION_SPEC.md) | [`EVALUATION_PLAN.md`](docs/05_AI/EVALUATION_PLAN.md)
- **Program & Governance:** [`IMPLEMENTATION_ROADMAP.md`](docs/09_Program/IMPLEMENTATION_ROADMAP.md) | [`MASTER_TRACKER.md`](docs/09_Program/MASTER_TRACKER.md) | [`BASELINE_FREEZE.md`](docs/09_Program/BASELINE_FREEZE.md)

---

## 6. License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.
