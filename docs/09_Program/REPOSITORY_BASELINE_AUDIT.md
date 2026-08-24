# SmartMandateRetry — Repository Baseline Audit

> **Document ID:** DOC-PROG-005  
> **Date:** 2026-08-24  
> **Status:** AUDIT COMPLETE  
> **Scope:** Initial inspection of repository state prior to OpenRouter migration and foundation scaffolding.

---

## 1. Inventory of Current Repository Structure

Prior to the foundation build, the repository contained only planning specifications under `docs/` and root planning artifacts:

```
SmartMandateRetry/
├── docs/
│   ├── 00_Product/          (5 documents: VISION, PRD, PPD, SCOPE, JOURNEYS)
│   ├── 01_Architecture/     (6 documents: SYSTEM, AI, WORKFLOW, INTEGRATION, SECURITY, ADR)
│   ├── 02_Domain/           (4 documents: DOMAIN, STATE_MACHINE, POLICY, STRATEGIES)
│   ├── 03_API/              (2 documents: API_SPEC, WEBHOOK_SPEC)
│   ├── 04_Data/             (2 documents: DATABASE_DESIGN, DATA_DICTIONARY)
│   ├── 05_AI/               (3 documents: AI_DECISION_SPEC, AI_EVALUATION, EVALUATION_PLAN)
│   ├── 07_QA/               (3 documents: QA_STRATEGY, TEST_PLAN, FAILURE_SCENARIOS)
│   ├── 08_Operations/       (2 documents: OBSERVABILITY, DEPLOYMENT)
│   └── 09_Program/          (4 documents: ROADMAP, MASTER_TRACKER, MILESTONES, CHANGELOG)
```

---

## 2. Audit Findings & Required Corrections

| Category | Finding / Inconsistency | Severity | Correction Action |
|---|---|---|---|
| **AI Provider Architecture** | Documentation and ADRs referenced Google Gemini as the direct primary provider rather than an OpenRouter gateway abstraction. | **HIGH** | Replace with OpenRouter provider interface; make model dynamically configurable via `OPENROUTER_MODEL`; create `OPENROUTER_INTEGRATION.md`. |
| **Razorpay Capability Specifics** | Needed explicit, formal capability matrix mapping verified APIs, test mode constraints, and out-of-band Payment Links vs native retries. | **HIGH** | Create `docs/01_Architecture/RAZORPAY_CAPABILITY_MATRIX.md` based on fresh official documentation verification. |
| **Unqualified Statistical Claims** | Draft PRD contained ungrounded industry churn figures ("12–22%") and unqualified detection targets ("100% detection"). | **MEDIUM** | Remove unsubstantiated market metrics; qualify detection scope to "100% of successfully received and authenticated webhook events". |
| **Evaluation Uplift Framing** | Draft PRD mandated a >=15% uplift as a hard acceptance requirement before measurement. | **MEDIUM** | Refactor to an empirical evaluation framework that objectively measures uplift against native fixed retry and rule-based baselines without pre-judging results. |
| **Repository Foundation Files** | Repository lacked backend, frontend, docker, configuration, and tooling scaffolding. | **HIGH** | Scaffold complete production-grade repository foundation (Flask backend, React frontend, Docker Compose, Alembic, pytest). |
| **Tracker Granularity** | Master tracker had only 22 high-level tasks. | **MEDIUM** | Expand to granular Epic -> Feature -> Task breakdown across all 21 phases with explicit requirement mappings. |

---

## 3. Audit Conclusion

All identified discrepancies will be systematically corrected across the entire documentation set before freezing the baseline and completing repository foundation validation.
