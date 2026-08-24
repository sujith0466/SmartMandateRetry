# Contributing to SmartMandateRetry

Thank you for contributing to SmartMandateRetry. To maintain production-grade reliability and strict safety compliance, all contributors must follow these guidelines.

---

## 1. Branching & Commit Conventions

- **Branch Naming:**
  - `feat/phase-<number>-<description>` (e.g., `feat/phase-3-webhook-ingestion`)
  - `fix/<issue-description>`
  - `docs/<doc-update>`
- **Commit Message Format:**
  - Follow Conventional Commits: `type(scope): description`
  - Examples:
    - `feat(ingestion): implement HMAC-SHA256 signature verification`
    - `test(policy): add 100% branch tests for hard decline vetoes`
    - `docs(ai): update OpenRouter parameter documentation`

---

## 2. Strict Architectural Invariants

1. **No Direct LLM Financial Control:** Never connect an LLM output directly to a gateway API mutation. All actions must pass through the deterministic Policy Engine.
2. **Deterministic Safety Gating:** All safety rules in `docs/02_Domain/POLICY_ENGINE.md` require 100% branch test coverage.
3. **Traceability:** Every pull request must reference the corresponding Task ID from `docs/09_Program/MASTER_TRACKER.md`.
