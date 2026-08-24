# SmartMandateRetry — AI Architecture Specification

> **Document ID:** DOC-ARCH-002  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## 1. Role of AI & Architectural Boundaries

### 1.1 Why AI Exists in SmartMandateRetry
1. **Ambiguous Error Interpretation:** Payment gateways return non-standardized bank error messages. The AI parses unstructured reject descriptions to classify failure categories when deterministic mappings do not match.
2. **Contextual Recovery Optimization:** Suggesting optimal intervention timing (e.g. 24h vs 48h vs payday alignment) and strategy (Payment Link vs Mandate Update) based on customer history, subscription tier, and past recovery success patterns.
3. **Structured Strategy Formulation:** Generating human-readable reasoning and risk flags that assist operations teams during manual review.

### 1.2 Why AI Does NOT Exist Elsewhere
1. **No Direct Financial Rail Access:** The LLM cannot call Razorpay APIs or issue payment mandates.
2. **No Policy Gate Ownership:** Hard limits (caps, intervals, hard decline vetoes) are written in deterministic Python code. The LLM is untrusted regarding safety enforcement.
3. **No Database State Mutation:** AI outputs are structured recommendations consumed by domain handlers.

---

## 2. LLM Provider Abstraction Layer (OpenRouter Integration)

SmartMandateRetry utilizes an abstract provider interface with **OpenRouter** as the default AI gateway for the MVP:

```
                        ┌───────────────────────────────┐
                        │   LLMProvider (Abstract Base) │
                        │  - generate_recovery_plan()   │
                        │  - classify_ambiguous_error() │
                        └───────────────┬───────────────┘
                                        │
                ┌───────────────────────┴───────────────────────┐
                ▼                                               ▼
┌───────────────────────────────┐               ┌───────────────────────────────┐
│ OpenRouterProvider (Default)  │               │ Mock / Test Provider          │
│ - Base: OpenRouter API Gateway│               │ - In-memory deterministic     │
│ - Model: $OPENROUTER_MODEL    │               │   test mock for CI/CD         │
│   (e.g., google/gemini-2.0-   │               │ - Zero network calls          │
│    flash-001 or gpt-4o-mini)  │               │ - Used in unit/E2E test suites│
│ - JSON Mode + Response Healing│               │                               │
└───────────────────────────────┘               └───────────────────────────────┘
```

The system dynamically instantiates the provider based on environment variables (`LLM_PROVIDER=openrouter`, `OPENROUTER_MODEL=google/gemini-2.0-flash-001`, `OPENROUTER_API_KEY=...`).

---

## 3. Structured Input & Output Contracts

### 3.1 AI Prompt Input Context
```json
{
  "failure_metadata": {
    "gateway_error_code": "BAD_REQUEST_ERROR",
    "gateway_reason": "insufficient_funds",
    "raw_description": "The card has insufficient funds for recurring debit",
    "error_source": "customer"
  },
  "customer_profile": {
    "tenure_months": 14,
    "historical_success_rate": 0.94,
    "lifetime_value_inr": 21000,
    "recent_failure_count": 1
  },
  "recovery_context": {
    "stage": "HALTED_RECOVERY",
    "attempt_number": 1,
    "days_since_initial_failure": 3,
    "contacts_in_cycle": 0,
    "invoice_amount_inr": 1499
  }
}
```

### 3.2 Structured Output JSON Schema
```json
{
  "failure_class": "TEMPORARY | PERMANENT | ACTION_REQUIRED | RISK | UNKNOWN",
  "recommended_action": "SCHEDULE_RECOVERY_CHECK | PAYMENT_LINK_RECOVERY | PAYMENT_METHOD_RECOVERY | MANUAL_ESCALATION | STOP",
  "delay_hours": 48,
  "confidence": 0.92,
  "reasoning": "Long-tenure customer with 94% success rate. Insufficient funds failure represents transient liquidity. Recommend out-of-band payment link with 48h delay post-halt.",
  "risk_flags": []
}
```

---

## 4. Separation of Concerns & Safety Guarantee

```
       AI Engine (OpenRouter)                Deterministic Policy Engine
┌─────────────────────────────────┐       ┌─────────────────────────────────┐
│ Generates proposal with:        │       │ Independent Python validation:  │
│ - failure_class                 │──────►│ - Check max retries cap         │
│ - recommended_action            │       │ - Check minimum interval (24h)  │
│ - delay_hours                   │       │ - Check hard decline rules      │
│ - confidence score              │       │ - Check high value approval cap │
│ - natural language reasoning    │       │ - Check confidence >= threshold │
└─────────────────────────────────┘       └────────────────┬────────────────┘
                                                           │
                                                           ▼
                                                [APPROVED] or [DENIED/STOP]
```
