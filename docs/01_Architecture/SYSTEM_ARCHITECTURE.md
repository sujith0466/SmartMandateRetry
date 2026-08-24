# SmartMandateRetry — System Architecture

> **Document ID:** DOC-ARCH-001  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## 1. High-Level Context & C4 Container Diagram

SmartMandateRetry sits as an intelligent orchestration and decision layer above Razorpay's recurring payment infrastructure.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           RAZORPAY GATEWAY                                  │
│             (Subscriptions, Invoices, Payments, Payment Links)               │
│   Webhooks: payment.failed, subscription.pending, subscription.halted, ...  │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │ HTTPS Webhook (X-Razorpay-Signature)
                                       ▼
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SMARTMANDATERETRY PLATFORM                        │
│                                                                             │
│  ┌──────────────────────┐   ┌──────────────────────┐  ┌──────────────────┐ │
│  │ Webhook Ingestion API│   │ Merchant REST API    │  │ Background Tasks │ │
│  │ (Flask / Blueprint)  │   │ (Flask / Blueprint)  │  │ (Celery Worker)  │ │
│  └──────────┬───────────┘   └──────────┬───────────┘  └────────┬─────────┘ │
│             │                          │                       │           │
│  ┌──────────▼──────────────────────────▼───────────────────────▼──────────┐ │
│  │                            CORE DOMAIN ENGINE                          │ │
│  │                                                                        │ │
│  │  1. Ingestion & Signature Verification (HMAC-SHA256)                   │ │
│  │  2. Payment Failure Intelligence (Deterministic + Ambiguity AI)        │ │
│  │  3. Customer Context Engine (Razorpay API / DB Lookup)                 │ │
│  │  4. AI Recovery Decision Engine (Provider Abstraction: OpenRouter)     │ │
│  │  5. Deterministic Policy & Safety Engine (HARD FAIL-CLOSED GATE)       │ │
│  │  6. Bounded Action Executor (Payment Links, Scheduled Checks, Stop)    │ │
│  │  7. Outcome Verification & Revenue Attribution Engine                  │ │
│  │  8. Append-Only Audit Trail Service                                    │ │
│  └─────────────────────────────────────┬──────────────────────────────────┘ │
│                                        │                                    │
│             ┌──────────────────────────┴────────────────────────┐           │
│             ▼                                                   ▼           │
│   ┌─────────────────────┐                            ┌─────────────────────┐│
│   │ PostgreSQL 16 (DB)  │                            │ Redis 7 (Queue)     ││
│   │ - webhook_events    │                            │ - Task Queues       ││
│   │ - recovery_cases    │                            │ - Scheduled Delays  ││
│   │ - audit_events      │                            │ - Idempotency Locks ││
│   │ - evaluation_runs   │                            │                     ││
│   └─────────────────────┘                            └─────────────────────┘│
└──────────────────────────────────────▲──────────────────────────────────────┘
                                       │ JSON REST API
┌──────────────────────────────────────┴──────────────────────────────────────┐
│                    REACT VITE FRONTEND (Tailwind CSS)                       │
│    Dashboard | Cases Inbox | Case Detail | Policies | Audit | Evaluation     │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Component Layer Responsibilities

| Layer / Component | Technology | Primary Responsibility |
|---|---|---|
| **Webhook Ingestion** | Flask API | Fast acknowledgment (<250ms), HMAC-SHA256 signature verification, raw payload persistence, Celery task dispatch. |
| **Failure Intelligence** | Python Domain Module | Deterministic mapping of gateway failure codes with fallback to AI classifier for unrecognized error text. |
| **Context Engine** | Python Service | Fetches customer subscription tenure, payment success rate, recent retry count, and notification history. |
| **AI Decision Engine** | OpenRouter Client | Formulates structured recovery proposals via LLM with strict JSON schema validation. |
| **Policy Engine** | Pure Deterministic Python | Absolute safety authority. Enforces retry limits, intervals, hard decline vetoes, and high-value approvals. Zero LLM dependencies. |
| **Action Executor** | Celery Worker Service | Invokes external APIs (e.g. Razorpay `POST /v1/payment_links`), registers delayed jobs, updates case state. |
| **Outcome Verifier** | Python Domain Service | Reconciles incoming settlement webhooks, attributes recovered revenue, and closes the recovery loop. |
| **Audit Logger** | SQLAlchemy Service | Appends immutable records of all events, AI proposals, policy checks, and financial actions. |
| **Merchant Console** | React, Vite, Tailwind | Provides operational oversight, case triage, policy tuning, and benchmark evaluation lab. |

---

## 3. Asynchronous Execution Architecture

```
Webhook Request ──> Ingest & Verify ──> Insert `webhook_events` ──> Celery `process_webhook_task` (Async)
                                                                             │
                                                                             ▼
                                                                     Triage & Create/Update
                                                                         `RecoveryCase`
                                                                             │
                                                                             ▼
                                                                     Assemble Context &
                                                                   Call AI (OpenRouter)
                                                                             │
                                                                             ▼
                                                                   Evaluate Policy Gate
                                                                    (APPROVED / DENIED)
                                                                             │
                                              ┌──────────────────────────────┴──────────────────────────────┐
                                              ▼                                                             ▼
                                         [APPROVED]                                                   [DENIED/STOP]
                                              │                                                             │
                                   Dispatch Action Executor                                      Halt automated actions
                                 (e.g., Generate Payment Link)                                   Log safety veto in audit
```
