# SmartMandateRetry — Workflow & Lifecycle Architecture

> **Document ID:** DOC-ARCH-003  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## 1. Dual-Stage Recovery Architecture

SmartMandateRetry operates in two complementary stages across the Razorpay subscription failure lifecycle:

```
                                [Subscription Charge Attempt]
                                              │
                                              ▼
                                           [FAILS]
                                              │
                       ┌──────────────────────┴──────────────────────┐
                       ▼                                             ▼
          Stage 1: PENDING_OBSERVATION                   Stage 2: HALTED_RECOVERY
     (During Razorpay Native T+1..T+3)                (After Native Retries Exhaust)
                       │                                             │
      ┌────────────────┴────────────────┐             ┌──────────────┴──────────────┐
      │ Razorpay native auto-retry runs │             │ Razorpay stops auto-charges │
      │ SmartMandateRetry monitors &    │             │ SmartMandateRetry takes     │
      │ executes early non-conflicting  │             │ primary recovery control:   │
      │ actions (e.g., card update      │             │ - Dynamic Payment Links     │
      │ prompts on expired cards,       │             │ - Contextual delays         │
      │ immediate stop on hard declines)│             │ - Human escalation          │
      └────────────────┬────────────────┘             └──────────────┬──────────────┘
                       │                                             │
                       ▼                                             ▼
                 [SETTLED / RECOVERED] ◄─────────────────────────────┘
```

---

## 2. Core End-to-End Workflow Pipeline

```
  1. Ingestion Layer
     Webhook Received ──> HMAC-SHA256 Check ──> Deduplication ──> Save `webhook_events`
                                                                         │
  2. Triage & Context                                                    ▼
     Extract Error Metadata ──> Map Failure Reason ──> Retrieve Customer Profile
                                                                         │
  3. AI Proposal Engine                                                  ▼
     Build Prompt Payload ──> Call LLM Provider ──> Validate JSON Schema Output
                                                                         │
  4. Policy Gate (Deterministic)                                         ▼
     Evaluate 7 Merchant Rules ──> Decision: APPROVED / DENIED / ESCALATE
                                                                         │
  5. Action Execution                                                    ▼
     APPROVED: Dispatch Task (Payment Link / Schedule) ──> Emit Audit Record
     DENIED/STOP: Halt Automation ──> Emit Safety Veto Audit Record
                                                                         │
  6. Outcome Verification                                                ▼
     Listen for Inbound Settlement Webhook ──> Mark RECOVERED & Attribute Net Revenue
```
