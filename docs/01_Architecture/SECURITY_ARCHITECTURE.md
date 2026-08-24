# SmartMandateRetry — Security Architecture

> **Document ID:** DOC-ARCH-005  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## 1. Threat Model & STRIDE Analysis

| Threat (STRIDE) | Attack Vector | SmartMandateRetry Mitigation |
|---|---|---|
| **Spoofing** | Forged webhook requests claiming payment failure | Strict HMAC-SHA256 signature verification on all inbound webhooks using shared secret. |
| **Tampering** | Modifying recovery decision in transit | All decisions persisted in ACID-compliant PostgreSQL database; audit log is append-only. |
| **Repudiation** | Operator denying policy modification | Immutable audit log records actor, IP address, previous value, new value, and timestamp. |
| **Information Disclosure** | Leakage of customer financial credentials | **Zero credential storage:** No PAN, CVV, or bank credentials stored. Only tokenized references. |
| **Denial of Service** | Webhook flooding / Retry storms | Redis rate limiting; Celery async queuing; fast 200 acknowledgment with deferred processing. |
| **Elevation of Privilege** | Prompt injection inducing LLM to execute unauthorized charges | **Zero direct LLM API access.** All actions must pass deterministic fail-closed policy validation. |

---

## 2. Security Requirements (SEC-xxx)

- **SEC-001:** Cryptographic API keys and webhook secrets must be managed exclusively via environment variables and never logged or committed to version control.
- **SEC-002:** The Policy Engine must execute in a zero-trust posture relative to the LLM. If the LLM produces a recommendation outside permitted action bounds, the Policy Engine MUST veto and escalate.
- **SEC-003:** All outgoing API communications to Razorpay must use TLS 1.3 with Basic Auth over HTTPS.
