# SmartMandateRetry — Product Scope Specification

> **Document ID:** DOC-PROD-004  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## 1. Scope Boundaries

| Capability | In MVP (Phase 0–21) | Post-MVP (Future Scope) |
|---|---|---|
| Gateway Support | Razorpay Test Mode & Webhooks | Stripe, Adyen, PayU, BillDesk |
| Mandates | Card Recurring, UPI Autopay, e-Mandates | International Direct Debits |
| Tenancy Model | Single-Merchant MVP with `merchant_id` schema abstraction | Dynamic multi-tenant onboarding & tenant routing middleware |
| AI Integration | Provider-abstracted LLM (Gemini Flash class default) with structured JSON enforcement | Local model fine-tuning & real-time RL policies |
| Safety Gate | Deterministic fail-closed policy engine (7 hard rules) | Merchant-defined custom Python script sandbox |
| Recovery Channels | Razorpay Payment Links API + Email/SMS via Razorpay | Direct WhatsApp Business API, IVR calls |
| Evaluation | Synthetic 5,000+ benchmark suite with train/dev/test split | Production traffic A/B testing |

---

## 2. Non-Goals & Architectural Defenses

1. **Not a Billing Engine:** SmartMandateRetry does not create subscription plans, calculate recurring prorations, or issue billing tax invoices. It operates strictly on failed payment events emitted by Razorpay.
2. **Not a Generic Chatbot:** The merchant interface does not feature conversational free-text chat with an LLM. AI is strictly embedded as a structured decision and diagnostic engine.
3. **No Direct Financial Authority:** The LLM cannot authorize refunds, modify transaction amounts, or initiate charges outside of deterministic policy validation.
