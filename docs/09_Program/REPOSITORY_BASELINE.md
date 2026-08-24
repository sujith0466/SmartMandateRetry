# SmartMandateRetry — Repository Baseline Specification

> **Document ID:** DOC-PROG-007  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## 1. Monorepo Structural Baseline

The SmartMandateRetry repository is organized as a production-grade monorepo containing backend services, frontend dashboard, shared contracts, container definitions, and documentation:

```
SmartMandateRetry/
├── backend/
│   ├── app/
│   │   ├── api/
│   │   │   ├── v1/
│   │   │   │   ├── __init__.py
│   │   │   │   ├── cases.py
│   │   │   │   ├── policies.py
│   │   │   │   ├── webhooks.py
│   │   │   │   └── analytics.py
│   │   │   ├── __init__.py
│   │   │   └── health.py
│   │   ├── core/
│   │   │   ├── __init__.py
│   │   │   ├── config.py
│   │   │   ├── logging.py
│   │   │   ├── errors.py
│   │   │   └── security.py
│   │   ├── domain/
│   │   │   ├── __init__.py
│   │   │   ├── models.py
│   │   │   ├── state_machine.py
│   │   │   └── policy_engine.py
│   │   ├── infrastructure/
│   │   │   ├── __init__.py
│   │   │   ├── database.py
│   │   │   ├── redis.py
│   │   │   ├── openrouter.py
│   │   │   └── razorpay_client.py
│   │   ├── services/
│   │   │   ├── __init__.py
│   │   │   ├── triage_service.py
│   │   │   ├── decision_service.py
│   │   │   └── audit_service.py
│   │   ├── workers/
│   │   │   ├── __init__.py
│   │   │   ├── celery_app.py
│   │   │   └── tasks.py
│   │   ├── __init__.py
│   │   └── main.py
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_health.py
│   │   ├── test_config.py
│   │   └── test_policy_engine_stub.py
│   ├── migrations/
│   ├── requirements/
│   │   ├── base.txt
│   │   ├── dev.txt
│   │   └── prod.txt
│   ├── pyproject.toml
│   └── README.md
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── App.tsx
│   │   │   ├── routes.tsx
│   │   │   └── store.ts
│   │   ├── components/
│   │   │   ├── ui/
│   │   │   ├── Layout.tsx
│   │   │   └── ErrorBoundary.tsx
│   │   ├── features/
│   │   │   ├── dashboard/
│   │   │   ├── cases/
│   │   │   ├── policies/
│   │   │   ├── audit/
│   │   │   └── evaluation/
│   │   ├── services/
│   │   │   └── api.ts
│   │   ├── types/
│   │   │   └── index.ts
│   │   ├── main.tsx
│   │   └── index.css
│   ├── public/
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   └── README.md
│
├── shared/
│   ├── schemas/
│   ├── contracts/
│   └── README.md
│
├── docker/
│   ├── Dockerfile.backend
│   └── Dockerfile.frontend
│
├── docs/
│   └── (Authoritative specifications)
│
├── .env.example
├── .gitignore
├── docker-compose.yml
├── docker-compose.dev.yml
├── Makefile
├── README.md
├── CONTRIBUTING.md
├── DEVELOPMENT.md
└── LICENSE
```
