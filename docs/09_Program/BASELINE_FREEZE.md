# SmartMandateRetry — Product & Architecture Baseline Freeze

> **Baseline Version:** 1.0.0  
> **Effective Date:** 2026-08-24  
> **Status:** **FROZEN**  
> **Authorized By:** SmartMandateRetry Core Architecture Team  

---

## 1. Freeze Declaration

The Product Definition, Technical Architecture, Domain Model, API Contracts, AI Strategy, QA Test Plan, and Implementation Tracker for **SmartMandateRetry** are hereby officially **FROZEN** at Version 1.0.0.

No structural, architectural, or domain changes may be made to the frozen specifications without formal Change Request review and corresponding version increment in `CHANGELOG.md`.

---

## 2. Core Architectural Pillars (Immutable Baseline)

1. **Product Mission:** "SmartMandateRetry intelligently recovers revenue lost to failed recurring payments by diagnosing failure causes, understanding payment/customer context, selecting bounded recovery strategies, enforcing deterministic merchant safety policies, executing only approved actions, verifying actual payment outcomes, and measuring recovered revenue."
2. **Core Invariant:** AI Proposes -> Deterministic Policy Engine Decides -> Action Executor Acts. The LLM has zero direct financial authority or execution credentials.
3. **AI Gateway:** OpenRouter provider abstraction (`OpenRouterProvider`) with configurable dynamic model selection (`$OPENROUTER_MODEL`).
4. **Dual-Stage Recovery:**
   - Stage 1 (`PENDING_OBSERVATION`): Contextual observation & early customer guidance during Razorpay's native T+1..T+3 daily auto-retry cycle.
   - Stage 2 (`HALTED_RECOVERY`): Primary recovery orchestration post-`halted` via out-of-band Payment Links and scheduled re-engagement.
5. **Action Taxonomy:** Distinct separation between `NATIVE_RETRY_OBSERVATION`, `SCHEDULE_RECOVERY_CHECK`, `PAYMENT_LINK_RECOVERY`, `PAYMENT_METHOD_RECOVERY`, `MANUAL_ESCALATION`, and `STOP`.
6. **Empirical Evaluation:** Objective benchmark against Baseline A (Razorpay Native Fixed Retry) and Baseline B (Simple Rule-Based 48h) on a 5,000-scenario synthetic dataset.

---

## 3. Authoritative Document Suite

The following 33 documents constitute the authoritative baseline:
- `docs/00_Product/`: `PRODUCT_VISION.md`, `PRD.md`, `PPD.md`, `PRODUCT_SCOPE.md`, `USER_JOURNEYS.md`
- `docs/01_Architecture/`: `SYSTEM_ARCHITECTURE.md`, `AI_ARCHITECTURE.md`, `WORKFLOW_ARCHITECTURE.md`, `INTEGRATION_ARCHITECTURE.md`, `SECURITY_ARCHITECTURE.md`, `ARCHITECTURE_DECISIONS.md`, `RAZORPAY_CAPABILITY_MATRIX.md`
- `docs/02_Domain/`: `DOMAIN_MODEL.md`, `RECOVERY_STATE_MACHINE.md`, `POLICY_ENGINE.md`, `RECOVERY_STRATEGIES.md`
- `docs/03_API/`: `API_SPECIFICATION.md`, `WEBHOOK_SPECIFICATION.md`
- `docs/04_Data/`: `DATABASE_DESIGN.md`, `DATA_DICTIONARY.md`
- `docs/05_AI/`: `AI_DECISION_SPEC.md`, `AI_EVALUATION.md`, `EVALUATION_PLAN.md`, `OPENROUTER_INTEGRATION.md`, `AI_ARCHITECTURE.md`
- `docs/07_QA/`: `QA_STRATEGY.md`, `TEST_PLAN.md`, `FAILURE_SCENARIOS.md`
- `docs/08_Operations/`: `OBSERVABILITY.md`, `DEPLOYMENT.md`
- `docs/09_Program/`: `IMPLEMENTATION_ROADMAP.md`, `MASTER_TRACKER.md`, `MILESTONES.md`, `CHANGELOG.md`, `REPOSITORY_BASELINE_AUDIT.md`, `PREFREEZE_AUDIT.md`, `REPOSITORY_BASELINE.md`, `BASELINE_FREEZE.md`

---

## 4. Change Control Policy

Any proposed modification to frozen specifications must follow the 4-step governance process:
1. **Change Proposal:** Document problem, rationale, and proposed specification diff.
2. **Impact Analysis:** Cross-domain review across PRD, Architecture, Policy Engine, and DB Schema.
3. **Approval:** Explicit sign-off by Product and Architecture leads.
4. **Changelog Entry:** Version increment and update recorded in `CHANGELOG.md`.

---

## 5. Next Authorized Phase

The next authorized step is **Phase 1: Repository Foundation & Engineering Setup** (Scaffolding directories, Docker Compose, Flask backend shell, React frontend shell, test runners). Feature implementation remains paused until Phase 2+.
