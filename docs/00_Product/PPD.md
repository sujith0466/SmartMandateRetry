# SmartMandateRetry — Product & Page Design Specification (PPD)

> **Document ID:** DOC-PROD-003  
> **Version:** 1.0.0  
> **Status:** APPROVED BASELINE  

---

## 1. Information Architecture & Navigation

```
SmartMandateRetry Merchant Console
├── Overview & Analytics
│   ├── / (Dashboard)
│   ├── /analytics (Recovery Performance & Attribution)
│   └── /evaluation (Evaluation Lab & Benchmark Comparisons)
├── Recovery Operations
│   ├── /cases (Recovery Cases Inbox)
│   └── /cases/:id (Case Deep Dive & Timeline)
├── Governance & Trust
│   ├── /policies (Safety Rules & Policy Gates)
│   └── /audit (Append-Only Audit Trail)
└── Settings & Health
    ├── /customers (Customer Context & Mandate Summary)
    └── /integrations (System Health & Gateway Status)
```

---

## 2. Page Specifications & Components

### 2.1 Dashboard (`/`)
- **Metric Cards:**
  - **Revenue at Risk:** Active unresolved failed amount.
  - **Recovered Revenue:** Net settled revenue via SmartMandateRetry.
  - **Recovery Rate (%):** Recovered / Total Eligible Failed.
  - **Recovery Uplift (%):** SmartMandateRetry Rate - Baseline Rate.
  - **Active Cases:** In-flight cases count.
  - **Human Attention:** Escalated cases count.
- **Visualizations:**
  - Dual-line time-series of At-Risk vs Recovered Revenue.
  - Category distribution donut chart.
  - Live activity feed.

### 2.2 Recovery Cases Inbox (`/cases`)
- **Filters:** Status (Active, Escalated, Recovered, Stopped), Category, Amount Range, Stage (`Pending (Observing)` vs `Halted (Active Recovery)`).
- **Table Grid:** Case ID, Customer Identifier, Amount (INR), Failure Root Cause, Stage, State Badge, AI Strategy & Confidence, Retry Count, Timestamps.

### 2.3 Case Detail View (`/cases/:id`)
- **Context Panel:** Payment metadata, subscription ID, mandate details, customer tenure and reliability score.
- **AI Proposal & Policy Evaluation:**
  - AI JSON recommendation display (`action`, `delay_hours`, `confidence`, `reasoning`).
  - Policy evaluation breakdown with pass/fail gates on 7 merchant rules.
- **Audit Timeline:** Append-only vertical log of all events from webhook arrival to resolution.

### 2.4 Policy Configuration (`/policies`)
- Configurable controls: `max_retries_per_case`, `min_retry_interval_hours`, `max_recovery_window_days`, `min_confidence_threshold`, `high_value_threshold_inr`, `max_customer_contacts_per_cycle`, `hard_decline_auto_stop`.

### 2.5 Evaluation Lab (`/evaluation`)
- Dataset runner (Synthetic 5,000+ benchmark dataset).
- Baseline selector: Razorpay native fixed schedule vs simple rule-based retry.
- Comparative metric tables and confusion matrices.
