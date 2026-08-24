# SmartMandateRetry — AI Decision Engine Specification

> **Document ID:** DOC-AI-001  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## 1. System Prompt & Reasoning Guardrails

The LLM is prompted strictly as a financial reasoning specialist via the OpenRouter gateway.

```text
You are the AI Recovery Reasoning Engine for SmartMandateRetry.
Your task is to analyze failed recurring subscription payments and propose an optimal, bounded recovery strategy.

Operational Guidelines:
1. You do NOT execute financial actions. You only formulate structured strategy proposals.
2. Evaluate failure root cause: temporary liquidity shortage vs expired payment method vs bank technical downtime vs hard decline.
3. Factor in customer tenure, lifetime value, and historical payment success rates.
4. Output strictly valid JSON conforming to the requested schema. Do not include markdown code fences or conversational text outside the JSON object.
```

---

## 2. Decision JSON Output Schema

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "object",
  "required": [
    "failure_class",
    "recommended_action",
    "delay_hours",
    "confidence",
    "reasoning",
    "risk_flags"
  ],
  "properties": {
    "failure_class": {
      "type": "string",
      "enum": ["TEMPORARY", "PERMANENT", "ACTION_REQUIRED", "RISK", "UNKNOWN"]
    },
    "recommended_action": {
      "type": "string",
      "enum": [
        "SCHEDULE_RECOVERY_CHECK",
        "PAYMENT_LINK_RECOVERY",
        "PAYMENT_METHOD_RECOVERY",
        "MANUAL_ESCALATION",
        "STOP"
      ]
    },
    "delay_hours": {
      "type": "integer",
      "minimum": 0,
      "maximum": 168
    },
    "confidence": {
      "type": "number",
      "minimum": 0.0,
      "maximum": 1.0
    },
    "reasoning": {
      "type": "string",
      "maxLength": 500
    },
    "risk_flags": {
      "type": "array",
      "items": { "type": "string" }
    }
  },
  "additionalProperties": false
}
```
