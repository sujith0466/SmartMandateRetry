# SmartMandateRetry — Product Vision

> **Document ID:** DOC-PROD-001  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  
> **Target Track:** Razorpay AI Buildathon — Track 03: AI Revenue Recovery  

---

## 1. Executive Summary

Subscription and recurring-revenue businesses face significant revenue leakage and involuntary churn triggered by recurring payment failures. In India's recurring payments ecosystem (mandates on cards, UPI Autopay, and netbanking e-mandates), payment failures stem from highly heterogeneous root causes:
- **Temporary Liquidity Shortages (Insufficient Funds):** Fixed 24-hour retries often fail repeatedly if executed before a customer's salary cycle or during off-peak liquidity windows.
- **Mandate & Payment Method Invalidation (Card Expired / Mandate Revoked):** Repeated automatic charging against an expired card token wastes gateway quotas and delays recovery.
- **Issuer Bank Downtimes:** Immediate retries during transient bank outages compound decline counters.
- **Hard Declines:** Repeated automated charges against permanently closed or flagged accounts create negative customer experiences and risk regulatory scrutiny.

While Razorpay provides a native automated retry mechanism during the `subscription.pending` state (typically retrying once a day for 3 days), once retries exhaust the subscription moves to `subscription.halted` and automated charges stop completely.

**SmartMandateRetry** is a bounded, AI-assisted revenue recovery decision and orchestration platform. It observes, diagnoses, and contextually orchestrates the recovery of failed recurring payments across two distinct operational stages:
1. **Stage 1 (`PENDING_OBSERVATION`):** Observing Razorpay's native retry cycle while providing early non-conflicting customer guidance when deterministic failure reasons (such as card expiration) guarantee that native retries will fail.
2. **Stage 2 (`HALTED_RECOVERY`):** Primary recovery orchestration once native retries have exhausted, utilizing out-of-band Payment Links, delayed re-engagement schedules, and compliant human escalations.

---

## 2. Product North Star

> **"SmartMandateRetry intelligently recovers revenue lost to failed recurring payments by diagnosing failure causes, understanding payment/customer context, selecting bounded recovery strategies, enforcing deterministic merchant safety policies, executing only approved actions, verifying actual payment outcomes, and measuring recovered revenue."**

---

## 3. Core Architectural & Operational Principles

1. **AI Proposes, Deterministic Policy Decides, Action Executor Acts:**  
   Under no circumstances does an LLM issue raw API requests to financial rails. The AI acts as a reasoning engine producing structured recommendations. The deterministic Policy Engine evaluates the proposal against hard merchant safety rules in a fail-closed manner.
2. **Outcome-Driven Revenue Accounting:**  
   Success is strictly measured when funds settle and are verified via incoming payment/subscription webhook events, not upon successful dispatch of an API call.
3. **No Phantom Retries:**  
   SmartMandateRetry clearly distinguishes between an automated mandate recharge attempt, an out-of-band Payment Link collection, and a mandate update request. It never pretends a Payment Link is a mandate retry.
4. **Fail-Closed by Design:**  
   Any ambiguous failure, low-confidence decision, or policy conflict defaults to human escalation or safe halt.

---

## 4. What SmartMandateRetry is NOT

- NOT a payment gateway or payment processor
- NOT a billing or subscription engine
- NOT a generic conversational chatbot
- NOT a generic autonomous AI agent with unrestricted financial access
- NOT a CRM or marketing automation tool
- NOT a fraud detection platform
- NOT an accounting or tax management system
