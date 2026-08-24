# SmartMandateRetry — OpenRouter AI Gateway Integration

> **Document ID:** DOC-AI-004  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## 1. Overview & Architectural Role

SmartMandateRetry utilizes **OpenRouter** (`https://openrouter.ai/api/v1`) as its unified AI gateway for the MVP. OpenRouter provides an OpenAI-compatible API interface that allows dynamic, zero-downtime switching across high-performance LLMs (e.g. Gemini 2.0 Flash, Claude 3.5 Haiku, GPT-4o-mini, DeepSeek V3) without changing application domain code.

```
┌─────────────────────────────────────────────────────────┐
│              SmartMandateRetry Application              │
│               (AI Recovery Decision Service)            │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│               LLMProvider (Abstract Base)               │
│         generate_recovery_plan(context: dict)           │
│         classify_ambiguous_error(error_text: str)       │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│                  OpenRouterProvider                     │
│  - Endpoint: https://openrouter.ai/api/v1/chat/completions
│  - Auth: Authorization: Bearer $OPENROUTER_API_KEY      │
│  - Headers: HTTP-Referer, X-Title                       │
│  - Structured Output: response_format (json_object/schema)
│  - Response Healing Plugin: enabled                     │
│  - Timeout: 5.0s with fail-closed fallback              │
└────────────────────────────┬────────────────────────────┘
                             │ HTTPS
                             ▼
┌─────────────────────────────────────────────────────────┐
│                    OPENROUTER API                       │
│     Routes to: $OPENROUTER_MODEL (Configured via env)   │
│     (e.g., google/gemini-2.0-flash-001)                 │
└─────────────────────────────────────────────────────────┘
```

---

## 2. Configuration & Environment Contract

The OpenRouter integration is completely environment-driven. No model names or credentials are hard-coded in business logic:

| Environment Variable | Description | Default / Example Value | Required |
|---|---|---|---|
| `LLM_PROVIDER` | AI provider implementation selector | `openrouter` | Yes |
| `OPENROUTER_API_KEY` | OpenRouter secret API key | `sk-or-v1-...` | Yes (in production/live) |
| `OPENROUTER_BASE_URL` | OpenRouter base URL | `https://openrouter.ai/api/v1` | No (defaults to standard) |
| `OPENROUTER_MODEL` | Target foundation model identifier | `google/gemini-2.0-flash-001` | Yes |
| `OPENROUTER_TIMEOUT_SECONDS`| Maximum client HTTP timeout | `5.0` | No |
| `OPENROUTER_MAX_RETRIES` | Client-level transient retry count | `2` | No |

---

## 3. Request & Structured Output Specification

### 3.1 Request Payload Pattern
```json
{
  "model": "google/gemini-2.0-flash-001",
  "messages": [
    {
      "role": "system",
      "content": "You are the AI Recovery Reasoning Engine for SmartMandateRetry. Analyze the payment failure context and propose a bounded recovery plan in strict JSON format conforming to the requested schema."
    },
    {
      "role": "user",
      "content": "{\"failure_metadata\": {\"error_code\": \"BAD_REQUEST_ERROR\", \"error_reason\": \"insufficient_funds\", \"error_source\": \"customer\"}, \"customer_profile\": {\"tenure_months\": 14, \"historical_success_rate\": 0.94}, \"recovery_context\": {\"stage\": \"HALTED_RECOVERY\", \"attempt_number\": 1, \"invoice_amount_inr\": 1499}}"
    }
  ],
  "response_format": {
    "type": "json_object"
  },
  "plugins": [
    { "id": "response-healing" }
  ],
  "temperature": 0.1
}
```

### 3.2 Expected Response Structure
```json
{
  "id": "gen-1789237192",
  "choices": [
    {
      "message": {
        "role": "assistant",
        "content": "{\n  \"failure_class\": \"TEMPORARY\",\n  \"recommended_action\": \"GENERATE_PAYMENT_LINK\",\n  \"delay_hours\": 48,\n  \"confidence\": 0.92,\n  \"reasoning\": \"Customer has high historical payment reliability. Insufficient funds indicates transient liquidity. Generating a payment link with 48h delay provides an alternative settlement channel post-halt.\",\n  \"risk_flags\": []\n}"
      },
      "finish_reason": "stop"
    }
  ],
  "usage": {
    "prompt_tokens": 312,
    "completion_tokens": 88,
    "total_tokens": 400
  }
}
```

---

## 4. Error Handling & Timeout Fallback

1. **Timeout Handling:** If OpenRouter does not respond within `OPENROUTER_TIMEOUT_SECONDS` (default: 5.0s), the client raises `LLMTimeoutError`.
2. **Fail-Closed Fallback:** Upon `LLMTimeoutError` or invalid JSON syntax, the AI Decision Service falls back to deterministic rule classification with confidence score `0.0`.
3. **Policy Gate Catch:** Any fallback decision with `confidence < min_confidence_threshold` (0.75) is automatically routed by the Policy Engine to `ESCALATE` (Human Review Queue). No unverified automated financial action is executed.
