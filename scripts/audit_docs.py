"""Documentation consistency, integrity, and link audit script."""

import os
import sys

REQUIRED_DOCS = [
    "docs/00_Product/PRODUCT_VISION.md",
    "docs/00_Product/PRD.md",
    "docs/00_Product/PPD.md",
    "docs/00_Product/PRODUCT_SCOPE.md",
    "docs/00_Product/USER_JOURNEYS.md",
    "docs/01_Architecture/SYSTEM_ARCHITECTURE.md",
    "docs/01_Architecture/AI_ARCHITECTURE.md",
    "docs/01_Architecture/WORKFLOW_ARCHITECTURE.md",
    "docs/01_Architecture/INTEGRATION_ARCHITECTURE.md",
    "docs/01_Architecture/SECURITY_ARCHITECTURE.md",
    "docs/01_Architecture/ARCHITECTURE_DECISIONS.md",
    "docs/01_Architecture/RAZORPAY_CAPABILITY_MATRIX.md",
    "docs/02_Domain/DOMAIN_MODEL.md",
    "docs/02_Domain/RECOVERY_STATE_MACHINE.md",
    "docs/02_Domain/POLICY_ENGINE.md",
    "docs/02_Domain/RECOVERY_STRATEGIES.md",
    "docs/03_API/API_SPECIFICATION.md",
    "docs/03_API/WEBHOOK_SPECIFICATION.md",
    "docs/04_Data/DATABASE_DESIGN.md",
    "docs/04_Data/DATA_DICTIONARY.md",
    "docs/05_AI/AI_DECISION_SPEC.md",
    "docs/05_AI/AI_EVALUATION.md",
    "docs/05_AI/EVALUATION_PLAN.md",
    "docs/05_AI/OPENROUTER_INTEGRATION.md",
    "docs/07_QA/QA_STRATEGY.md",
    "docs/07_QA/TEST_PLAN.md",
    "docs/07_QA/FAILURE_SCENARIOS.md",
    "docs/08_Operations/OBSERVABILITY.md",
    "docs/08_Operations/DEPLOYMENT.md",
    "docs/09_Program/IMPLEMENTATION_ROADMAP.md",
    "docs/09_Program/MASTER_TRACKER.md",
    "docs/09_Program/MILESTONES.md",
    "docs/09_Program/CHANGELOG.md",
    "docs/09_Program/REPOSITORY_BASELINE_AUDIT.md",
    "docs/09_Program/PREFREEZE_AUDIT.md",
    "docs/09_Program/REPOSITORY_BASELINE.md",
    "docs/09_Program/BASELINE_FREEZE.md",
    "docs/09_Program/GIT_SECURITY_AUDIT.md",
    "docs/09_Program/GIT_RELEASE_CHECKLIST.md",
    "docs/09_Program/GIT_RELEASE_REPORT.md",
    "docs/09_Program/PHASE_02_IMPLEMENTATION_PLAN.md",
    "docs/09_Program/PHASE_02_COMPLETION_REPORT.md",
    "docs/09_Program/PHASE_03_IMPLEMENTATION_PLAN.md",
    "docs/09_Program/PHASE_03_COMPLETION_REPORT.md",
    "docs/09_Program/PHASE_04_IMPLEMENTATION_PLAN.md",
    "docs/09_Program/PHASE_04_COMPLETION_REPORT.md",
    "docs/09_Program/PHASE_05_IMPLEMENTATION_PLAN.md",
    "docs/09_Program/PHASE_05_COMPLETION_REPORT.md",
    "docs/09_Program/PHASE_06_IMPLEMENTATION_PLAN.md",
    "docs/09_Program/PHASE_06_COMPLETION_REPORT.md",
    "docs/09_Program/PHASE_07_IMPLEMENTATION_PLAN.md",
    "docs/09_Program/PHASE_07_COMPLETION_REPORT.md",
    "docs/09_Program/AI_PROVIDER_HARDENING_PLAN.md",
    "docs/09_Program/FREE_MODEL_CATALOG.md",
    "docs/09_Program/AI_PROVIDER_HARDENING_REPORT.md",
    "docs/09_Program/PHASE_08_IMPLEMENTATION_PLAN.md",
    "docs/09_Program/PHASE_08_COMPLETION_REPORT.md",
    "docs/09_Program/PHASE_09_IMPLEMENTATION_PLAN.md",
    "docs/09_Program/PHASE_09_COMPLETION_REPORT.md",
    "docs/09_Program/PHASE_10_IMPLEMENTATION_PLAN.md",
    "docs/09_Program/PHASE_10_COMPLETION_REPORT.md",
    "docs/09_Program/PHASE_11_IMPLEMENTATION_PLAN.md",
    "docs/09_Program/PHASE_11_COMPLETION_REPORT.md",
    "docs/09_Program/PHASE_12_IMPLEMENTATION_PLAN.md",
    "docs/09_Program/PHASE_12_COMPLETION_REPORT.md",
    "docs/09_Program/PHASE_13_IMPLEMENTATION_PLAN.md",
    "docs/09_Program/PHASE_13_COMPLETION_REPORT.md",
]


def audit_docs():
    print("Running SmartMandateRetry Documentation Audit...")
    missing = []
    for doc in REQUIRED_DOCS:
        norm_path = doc.replace("/", os.sep)
        if not os.path.exists(norm_path):
            missing.append(doc)

    if missing:
        print(f"FAILED: {len(missing)} required documents are missing:")
        for m in missing:
            print(f"  - {m}")
        sys.exit(1)

    print(f"SUCCESS: All {len(REQUIRED_DOCS)} required documents verified on disk.")


if __name__ == "__main__":
    audit_docs()
