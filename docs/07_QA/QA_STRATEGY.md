# SmartMandateRetry — Quality Assurance Strategy

> **Document ID:** DOC-QA-001  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## 1. Testing Pyramid & Targets

```
             / \
            /   \     E2E Lifecycle Tests (15%)
           / E2E \    - Full Webhook -> Diagnosis -> Action -> Settlement
          /-------\
         / Integr- \  Integration & API Tests (35%)
        /   ation   \ - Razorpay Mock, Celery Tasks, Webhook Signatures
       /-------------\
      /   Unit Tests  \ Unit Tests (50%)
     /     (Pytest)    \- Policy Engine (100% branch), Error Mapper, State Machine
    /-------------------\
```

### Coverage Minimums
- **Policy Engine:** 100% Branch Coverage (Zero un-evaluated paths).
- **Domain State Machine:** 100% Transition Coverage (All valid and invalid transitions tested).
- **Overall Backend Codebase:** >= 85% Line Coverage.
