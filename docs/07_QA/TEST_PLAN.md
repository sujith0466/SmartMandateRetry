# SmartMandateRetry — Test Plan

> **Document ID:** DOC-QA-002  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## 1. Test Suites & Execution Matrix

| Suite ID | Focus Area | Framework | Target Scope |
|---|---|---|---|
| `TS-UNIT-POL` | Policy Engine Rules | `pytest` | 100% branch test of POL-RULE-001 through POL-RULE-007. |
| `TS-UNIT-FSM` | State Machine Transitions | `pytest` | Valid and invalid transitions, concurrent update guards. |
| `TS-INT-WH` | Webhook Ingestion & Signature | `pytest + requests` | HMAC validation, replay attacks, duplicate event rejection. |
| `TS-INT-RZP` | Razorpay Client Mock/Sandbox | `pytest` | Payment link creation, mock error payloads, rate limits. |
| `TS-E2E-J1..7` | Core User Journeys | `pytest-e2e` | End-to-end simulation of Journeys 1 through 7. |
| `TS-EVAL-RUN` | Benchmark Evaluation Run | Python script | Validation on 5,000 synthetic test benchmark scenarios. |
