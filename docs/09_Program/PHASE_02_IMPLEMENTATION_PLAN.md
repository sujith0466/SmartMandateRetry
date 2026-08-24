# SmartMandateRetry — Phase 2 Implementation Plan: Core Domain Model & Database Foundation

> **Document ID:** DOC-PROG-012  
> **Phase:** Phase 2 — Core Domain Model & Database Foundation  
> **Status:** PLANNING (Awaiting User Approval)  
> **Authoritative References:**  
> - [`docs/04_Data/DATABASE_DESIGN.md`](../04_Data/DATABASE_DESIGN.md) [DOC-DATA-001]  
> - [`docs/04_Data/DATA_DICTIONARY.md`](../04_Data/DATA_DICTIONARY.md) [DOC-DATA-002]  
> - [`docs/02_Domain/DOMAIN_MODEL.md`](../02_Domain/DOMAIN_MODEL.md) [DOC-DOM-001]  
> - [`docs/02_Domain/RECOVERY_STATE_MACHINE.md`](../02_Domain/RECOVERY_STATE_MACHINE.md) [DOC-DOM-002]  
> - [`docs/02_Domain/POLICY_ENGINE.md`](../02_Domain/POLICY_ENGINE.md) [DOC-DOM-003]  
> - [`docs/08_Operations/OBSERVABILITY.md`](../08_Operations/OBSERVABILITY.md) [DOC-OPS-001]  

---

## 1. Phase Objective

Establish the complete, persistent domain foundation required by SmartMandateRetry prior to implementing webhook ingestion, AI decisions, recovery orchestration, or merchant REST APIs.

By the end of Phase 2, the system will possess:
1. Complete SQLAlchemy 2.0 ORM domain entities with type-annotated mapped columns and relational constraints.
2. An initialized Alembic migration environment with an executable initial migration (`001_initial_schema.py`) supporting forward and rollback operations.
3. Repositories and Data Access Objects (DAOs) implementing explicit transaction boundaries, optimistic concurrency locking, and idempotent query patterns.
4. Deterministic seed data factories for development and isolated integration test environments.
5. A comprehensive database test suite validating all schema constraints, foreign keys, unique indices, and optimistic locking behavior.

---

## 2. Scope of Phase 2

- **Domain Entities & ORM Mapping:**
  - `Merchant` (Tenant root)
  - `RecoveryPolicy` (Merchant safety rules & thresholds)
  - `Customer` (Subscriber profile, tenure, historical success rate)
  - `Subscription` (Razorpay mandate tracker, plan ID, status, cycle)
  - `RecoveryCase` (Aggregate root tracking payment failure recovery lifecycle)
  - `RecoveryDecision` (AI proposal record with structured reasoning and risk flags)
  - `RecoveryAction` (Executed intervention record with idempotency key and external ref)
  - `AuditEvent` (Append-only immutable audit trail)
  - `WebhookEvent` (Raw inbound webhook idempotency store)
  - `EvaluationRun` & `EvaluationScenarioResult` (Evaluation persistence for benchmark lab)
- **Alembic Infrastructure:**
  - Migration environment configuration (`alembic.ini`, `env.py`).
  - Auto-generating and manual verification of the initial baseline migration.
- **Repository Layer:**
  - `MerchantRepository`, `CustomerRepository`, `SubscriptionRepository`
  - `RecoveryCaseRepository` (with optimistic locking & state query filters)
  - `PolicyRepository`, `AuditEventRepository`, `WebhookEventRepository`
  - `EvaluationRepository`
- **Database Utilities & Seed Data:**
  - Database connection session management and transaction context managers (`UnitOfWork`).
  - Seed CLI command (`python -m app.infrastructure.seed`) for local dev environment setup.
- **Database Test Suite:**
  - Pytest fixtures utilizing test database containers / rollback transactions.
  - Constraint tests (unique keys, foreign key cascades, nullability, enum validation).

---

## 3. Explicit Non-Scope (Deferred to Subsequent Phases)

- ❌ Razorpay webhook parsing, verification, or business event handling (Phase 3).
- ❌ Payment failure classification engine or error code taxonomy mapping (Phase 4).
- ❌ Customer context calculation or dynamic profile synthesis (Phase 5).
- ❌ OpenRouter / LLM decision API invocations or prompt execution (Phase 6).
- ❌ Policy engine business evaluation and rule execution (Phase 7).
- ❌ Payment Link creation via Razorpay API or Celery task dispatch (Phase 8).
- ❌ Settlement webhook outcome reconciliation (Phase 9).
- ❌ Merchant Console UI implementation or REST API business handlers (Phases 12–15).

---

## 4. Architectural & Domain Dependencies

```
┌─────────────────────────────────────────────────────────────┐
│                    Phase 1 (Completed)                      │
│      - Config Management (Pydantic BaseSettings)            │
│      - Structured Logging & Error Hierarchy                 │
│      - Docker Compose Topology (PostgreSQL 16)              │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Phase 2 (This Plan)                      │
│      - SQLAlchemy 2.0 ORM Declarative Models                │
│      - Alembic Baseline Migrations                          │
│      - Repository Layer & UnitOfWork Pattern                │
│      - Database Schema Constraints & Indexes                │
└──────────────────────────────┬──────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                    Phase 3+ (Downstream)                    │
│      - Webhook Ingestion & Idempotent Event Processing      │
│      - AI Decision Engine & Policy Enforcement              │
└─────────────────────────────────────────────────────────────┘
```

---

## 5. Domain Entities & Database Schema Specification

### 5.1 Entity Relationship Diagram (ERD)

```
┌──────────────┐         1:N          ┌───────────────────┐
│   Merchant   ├─────────────────────►│     Customer      │
└──────┬───────┘                      └─────────┬─────────┘
       │                                        │
       │ 1:1                                    │ 1:N
       ▼                                        ▼
┌──────────────┐                      ┌───────────────────┐
│RecoveryPolicy│                      │   Subscription    │
└──────────────┘                      └─────────┬─────────┘
                                                │
                                                │ 1:N
                                                ▼
                                      ┌───────────────────┐
                                      │   RecoveryCase    │
                                      └──┬──────┬───────┬─┘
                                         │      │       │
                        ┌────────────────┘      │       └────────────────┐
                        │ 1:N                   │ 1:N                    │ 1:N
                        ▼                       ▼                        ▼
              ┌──────────────────┐    ┌──────────────────┐     ┌──────────────────┐
              │ RecoveryDecision │    │  RecoveryAction  │     │    AuditEvent    │
              └──────────────────┘    └──────────────────┘     └──────────────────┘
```

### 5.2 Table Schemas & PostgreSQL Constraints

#### 1. `merchants`
- `id` VARCHAR(36) PRIMARY KEY (UUID format: `merch_...`)
- `name` VARCHAR(255) NOT NULL
- `razorpay_account_id` VARCHAR(64) NOT NULL UNIQUE
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
- **Indexes:** `ix_merchants_razorpay_account_id`

#### 2. `recovery_policies`
- `id` VARCHAR(36) PRIMARY KEY (`pol_...`)
- `merchant_id` VARCHAR(36) NOT NULL UNIQUE REFERENCES `merchants(id)` ON DELETE RESTRICT
- `max_retries_per_case` INT NOT NULL DEFAULT 3 CHECK (max_retries_per_case BETWEEN 1 AND 10)
- `min_retry_interval_hours` INT NOT NULL DEFAULT 24 CHECK (min_retry_interval_hours BETWEEN 1 AND 168)
- `max_recovery_window_days` INT NOT NULL DEFAULT 14 CHECK (max_recovery_window_days BETWEEN 1 AND 60)
- `min_confidence_threshold` NUMERIC(3,2) NOT NULL DEFAULT 0.75 CHECK (min_confidence_threshold BETWEEN 0.0 AND 1.0)
- `high_value_threshold_inr` NUMERIC(12,2) NOT NULL DEFAULT 10000.00 CHECK (high_value_threshold_inr >= 0)
- `max_customer_contacts_per_cycle` INT NOT NULL DEFAULT 3 CHECK (max_customer_contacts_per_cycle BETWEEN 1 AND 10)
- `hard_decline_auto_stop` BOOLEAN NOT NULL DEFAULT TRUE
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
- **Indexes:** `ix_recovery_policies_merchant_id`

#### 3. `webhook_events` (Idempotency Ingestion Store)
- `id` VARCHAR(36) PRIMARY KEY (`evt_rec_...`)
- `event_id` VARCHAR(128) NOT NULL UNIQUE
- `event_type` VARCHAR(64) NOT NULL
- `payload` JSONB NOT NULL
- `signature_verified` BOOLEAN NOT NULL DEFAULT FALSE
- `processed` BOOLEAN NOT NULL DEFAULT FALSE
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
- **Indexes:** `ix_webhook_events_event_id`, `ix_webhook_events_event_type`, `ix_webhook_events_processed`

#### 4. `customers`
- `id` VARCHAR(36) PRIMARY KEY (`cust_...`)
- `merchant_id` VARCHAR(36) NOT NULL REFERENCES `merchants(id)` ON DELETE RESTRICT
- `razorpay_customer_id` VARCHAR(64) NOT NULL
- `email` VARCHAR(255)
- `contact` VARCHAR(32)
- `tenure_months` INT NOT NULL DEFAULT 0 CHECK (tenure_months >= 0)
- `historical_success_rate` NUMERIC(3,2) NOT NULL DEFAULT 1.00 CHECK (historical_success_rate BETWEEN 0.0 AND 1.0)
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
- **Constraints:** UNIQUE (`merchant_id`, `razorpay_customer_id`)
- **Indexes:** `ix_customers_merchant_razorpay_id`

#### 5. `subscriptions`
- `id` VARCHAR(36) PRIMARY KEY (`sub_rec_...`)
- `merchant_id` VARCHAR(36) NOT NULL REFERENCES `merchants(id)` ON DELETE RESTRICT
- `customer_id` VARCHAR(36) NOT NULL REFERENCES `customers(id)` ON DELETE RESTRICT
- `razorpay_subscription_id` VARCHAR(64) NOT NULL UNIQUE
- `plan_id` VARCHAR(64) NOT NULL
- `status` VARCHAR(32) NOT NULL
- `current_cycle` INT NOT NULL DEFAULT 1 CHECK (current_cycle >= 1)
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
- **Indexes:** `ix_subscriptions_razorpay_id`, `ix_subscriptions_status`

#### 6. `recovery_cases` (Aggregate Root)
- `id` VARCHAR(36) PRIMARY KEY (`case_...`)
- `merchant_id` VARCHAR(36) NOT NULL REFERENCES `merchants(id)` ON DELETE RESTRICT
- `subscription_id` VARCHAR(36) NOT NULL REFERENCES `subscriptions(id)` ON DELETE RESTRICT
- `invoice_id` VARCHAR(64) NOT NULL
- `payment_id` VARCHAR(64)
- `amount_inr` NUMERIC(12,2) NOT NULL CHECK (amount_inr > 0)
- `currency` VARCHAR(3) NOT NULL DEFAULT 'INR'
- `stage` VARCHAR(32) NOT NULL  -- PENDING_OBSERVATION, HALTED_RECOVERY
- `state` VARCHAR(32) NOT NULL  -- DETECTED, ANALYZING, DECISION_PENDING, etc.
- `failure_category` VARCHAR(32)
- `failure_code` VARCHAR(64)
- `attempt_count` INT NOT NULL DEFAULT 0 CHECK (attempt_count >= 0)
- `contacts_count` INT NOT NULL DEFAULT 0 CHECK (contacts_count >= 0)
- `recovered_amount_inr` NUMERIC(12,2) NOT NULL DEFAULT 0.00 CHECK (recovered_amount_inr >= 0)
- `version` INT NOT NULL DEFAULT 1  -- Optimistic Concurrency Lock
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
- `updated_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
- `resolved_at` TIMESTAMPTZ
- **Constraints:** UNIQUE (`merchant_id`, `invoice_id`)  -- 1 Recovery case per invoice
- **Indexes:** `ix_recovery_cases_merchant_state`, `ix_recovery_cases_subscription`, `ix_recovery_cases_created_at`

#### 7. `recovery_decisions`
- `id` VARCHAR(36) PRIMARY KEY (`dec_...`)
- `recovery_case_id` VARCHAR(36) NOT NULL REFERENCES `recovery_cases(id)` ON DELETE CASCADE
- `recommended_action` VARCHAR(64) NOT NULL
- `delay_hours` INT NOT NULL DEFAULT 0 CHECK (delay_hours >= 0)
- `confidence` NUMERIC(3,2) NOT NULL CHECK (confidence BETWEEN 0.0 AND 1.0)
- `reasoning` TEXT NOT NULL
- `risk_flags` JSONB NOT NULL DEFAULT '[]'
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
- **Indexes:** `ix_recovery_decisions_case_id`

#### 8. `recovery_actions`
- `id` VARCHAR(36) PRIMARY KEY (`act_...`)
- `recovery_case_id` VARCHAR(36) NOT NULL REFERENCES `recovery_cases(id)` ON DELETE CASCADE
- `action_type` VARCHAR(64) NOT NULL
- `idempotency_key` VARCHAR(128) NOT NULL UNIQUE
- `status` VARCHAR(32) NOT NULL  -- PENDING, EXECUTED, FAILED
- `external_reference_id` VARCHAR(128)
- `executed_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
- **Indexes:** `ix_recovery_actions_case_id`, `ix_recovery_actions_idempotency_key`

#### 9. `audit_events` (Append-Only Ledger)
- `id` VARCHAR(36) PRIMARY KEY (`aud_...`)
- `merchant_id` VARCHAR(36) NOT NULL REFERENCES `merchants(id)` ON DELETE RESTRICT
- `recovery_case_id` VARCHAR(36) REFERENCES `recovery_cases(id)` ON DELETE SET NULL
- `event_type` VARCHAR(64) NOT NULL
- `actor` VARCHAR(64) NOT NULL  -- SYSTEM, POLICY_GATE, AI_ENGINE, MERCHANT_USER
- `payload` JSONB NOT NULL
- `correlation_id` VARCHAR(128)
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()
- **Indexes:** `ix_audit_events_case_id`, `ix_audit_events_merchant_id`, `ix_audit_events_created_at`

#### 10. `evaluation_runs` & `evaluation_scenario_results` (Evaluation Lab)
- `id` VARCHAR(36) PRIMARY KEY (`eval_...`)
- `dataset_name` VARCHAR(128) NOT NULL
- `baseline_mode` VARCHAR(64) NOT NULL
- `metrics_summary` JSONB NOT NULL
- `created_at` TIMESTAMPTZ NOT NULL DEFAULT NOW()

---

## 6. Migration Strategy (Alembic)

1. **Environment Setup:**  
   Configure `backend/migrations/env.py` to import `Base.metadata` from `app.domain.models` and dynamically inject database connection URL from `app.core.config.get_settings().DATABASE_URL`.
2. **Initial Baseline Migration:**  
   Create `backend/migrations/versions/001_initial_schema.py` containing explicit `upgrade()` and `downgrade()` logic for all 11 tables with foreign keys and unique constraints.
3. **Migration Verification:**  
   Validate bidirectional migration execution (`alembic upgrade head` followed by `alembic downgrade base` and re-upgrade).

---

## 7. Repository & Data-Access Strategy

Implement explicit Repository classes in `backend/app/infrastructure/repositories/`:
- **`BaseRepository`**: Generic CRUD methods (`get_by_id`, `add`, `update`, `delete`, `count`).
- **`RecoveryCaseRepository`**: Specialized queries (`find_by_state`, `find_by_invoice_id`, `find_stale_scheduled_cases`, `atomic_state_transition` with optimistic version check).
- **`WebhookEventRepository`**: Fast idempotent write (`insert_if_not_exists`).
- **`AuditEventRepository`**: Append-only write (`record_event`).
- **Unit of Work Pattern (`UnitOfWork`)**: Context manager guaranteeing atomic commits across case updates, action creations, and audit logging.

---

## 8. Transaction & Idempotency Strategy

- **Idempotency Enforcement:**
  - `webhook_events.event_id` enforces single-delivery ingestion.
  - `recovery_cases.invoice_id` prevents duplicate recovery tracking for the same billing cycle invoice.
  - `recovery_actions.idempotency_key` ensures external action dispatches cannot be duplicated.
- **Transaction Boundaries:**
  - Webhook ingestion commit is isolated from downstream processing.
  - Case state transitions, action persistence, and audit logging execute within a single atomic database transaction.

---

## 9. Concurrency & Locking Strategy

- **Optimistic Concurrency Control (OCC):**  
  `recovery_cases` includes a `version` column. State transitions issue `UPDATE recovery_cases SET state = :new_state, version = version + 1 WHERE id = :id AND version = :expected_version`. If 0 rows are updated, an `OptimisticLockError` is raised.
- **Pessimistic Row-Level Locking (`SELECT FOR UPDATE`):**  
  Used during background task triage when mutating active case state to eliminate race conditions between simultaneous webhooks.

---

## 10. Database Testing Strategy

- **Pytest Database Fixture:** Isolated test database with transaction rollback after each test method.
- **Test Suites:**
  1. `test_schema_constraints.py`: Test unique constraints, foreign keys, and numeric CHECK bounds.
  2. `test_case_repository.py`: Test state filtering, atomic updates, and optimistic locking exceptions.
  3. `test_audit_immutability.py`: Test audit event recording and query capabilities.
  4. `test_seed_factory.py`: Test synthetic seed generation in local development environment.

---

## 11. Task Breakdown (Master Tracker Integration)

| Task ID | Epic | Feature | Task Description | Dependencies | Priority | Acceptance Criteria |
|---|---|---|---|---|---|---|
| `TSK-007-01` | Domain Data | Models | Implement SQLAlchemy 2.0 ORM models for all 11 tables | Phase 1 | P0 | Models compile with type hints and declarative Base. |
| `TSK-007-02` | Domain Data | Alembic | Initialize Alembic environment & write baseline migration | TSK-007-01 | P0 | `alembic upgrade head` and `downgrade base` execute cleanly. |
| `TSK-007-03` | Domain Data | Data Access | Implement `UnitOfWork` and `BaseRepository` | TSK-007-01 | P0 | Context manager handles commit/rollback safely. |
| `TSK-007-04` | Domain Data | Repositories | Implement `RecoveryCaseRepository` with optimistic locking | TSK-007-03 | P0 | Queries, state transitions, and lock checks verified. |
| `TSK-007-05` | Domain Data | Repositories | Implement `WebhookEventRepository` & `AuditEventRepository` | TSK-007-03 | P0 | Idempotent insertion and append-only logging verified. |
| `TSK-007-06` | Domain Data | Repositories | Implement `MerchantRepository` & `PolicyRepository` | TSK-007-03 | P1 | Merchant retrieval and policy updates verified. |
| `TSK-007-07` | Domain Data | Seeding | Implement deterministic seed data generator CLI | TSK-007-06 | P1 | Seeds default merchant, policies, customers, and cases. |
| `TSK-007-08` | Domain Data | Testing | Implement comprehensive database schema & repository unit tests | TSK-007-04..07 | P0 | 100% of schema constraints and repository methods tested. |

---

## 12. Definition of Done (DoD) for Phase 2

- [ ] All 11 SQLAlchemy 2.0 models implemented with exact columns, constraints, and indexes specified in `DATABASE_DESIGN.md`.
- [ ] Alembic baseline migration runs cleanly forward and backward against PostgreSQL 16.
- [ ] Repositories for all entities implemented and integrated with UnitOfWork context manager.
- [ ] Optimistic locking verified on `RecoveryCase`.
- [ ] Seed data CLI script generates realistic development fixtures without errors.
- [ ] Full database test suite passes with 0 failures (`pytest backend/tests/test_database/`).
- [ ] Zero business logic, webhook processing, or AI runtime calls introduced in Phase 2.

---

## 13. Risks & Rollback Strategy

| Risk | Mitigation |
|---|---|
| **Schema Inconsistency with Specs** | Mapped directly from frozen `DATABASE_DESIGN.md` [DOC-DATA-001]. |
| **Migration Lock Contention** | All DDL statements use non-blocking index creation where practical. |
| **Rollback Plan** | `alembic downgrade base` cleanly removes all created tables without lingering database objects. |
