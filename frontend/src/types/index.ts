export type RecoveryStage = 'PENDING_OBSERVATION' | 'HALTED_RECOVERY';

export type CaseState =
  | 'DETECTED'
  | 'ANALYZING'
  | 'DECISION_PENDING'
  | 'POLICY_REVIEW'
  | 'SCHEDULED'
  | 'ACTION_PENDING'
  | 'IN_PROGRESS'
  | 'WAITING_FOR_OUTCOME'
  | 'RECOVERED'
  | 'FAILED'
  | 'ESCALATED'
  | 'STOPPED'
  | 'EXPIRED';

export type FailureCategory = 'TEMPORARY' | 'PERMANENT' | 'ACTION_REQUIRED' | 'RISK' | 'UNKNOWN';

export interface RecoveryCase {
  id: string;
  subscription_id: string;
  invoice_id?: string;
  payment_id?: string;
  amount_inr: number;
  recovered_amount_inr?: number;
  currency: string;
  stage: RecoveryStage;
  state: CaseState;
  failure_category?: FailureCategory;
  failure_code?: string;
  attempt_count: number;
  contacts_count: number;
  version: number;
  created_at: string;
  updated_at?: string;
  resolved_at?: string;
}

export interface CustomerContext {
  id: string;
  email?: string;
  contact?: string;
  created_at?: string;
}

export interface SubscriptionInfo {
  id: string;
  plan_id: string;
  status: string;
  current_cycle?: number;
  created_at?: string;
  updated_at?: string;
}

export interface CaseDetailResponse {
  case: RecoveryCase;
  customer?: CustomerContext | null;
  subscription?: SubscriptionInfo | null;
}

export interface RecoveryActionItem {
  id: string;
  recovery_case_id: string;
  action_type: string;
  status: string;
  external_reference_id?: string | null;
  executed_at: string;
}

export interface ReconciliationStatusInfo {
  case_id: string;
  state: CaseState;
  is_settled: boolean;
  recovered_amount_inr: number;
  currency: string;
  resolved_at?: string | null;
  reconciled_action_id?: string | null;
  external_reference_id?: string | null;
}

export interface MerchantPolicy {
  id?: string;
  merchant_id?: string;
  max_retries_per_case: number;
  min_retry_interval_hours: number;
  max_recovery_window_days: number;
  min_confidence_threshold: number;
  high_value_threshold_inr: number;
  max_customer_contacts_per_cycle: number;
  hard_decline_auto_stop: boolean;
  updated_at?: string | null;
}

export interface PolicyUpdateRequest {
  max_retries_per_case?: number;
  min_retry_interval_hours?: number;
  max_recovery_window_days?: number;
  min_confidence_threshold?: number;
  high_value_threshold_inr?: number;
  max_customer_contacts_per_cycle?: number;
  hard_decline_auto_stop?: boolean;
}

export interface PolicyDiffItem {
  field: string;
  label: string;
  current: any;
  proposed: any;
}

export interface PolicyChangePreview {
  merchant_id: string;
  has_changes: boolean;
  diffs: PolicyDiffItem[];
  impact_notes: string[];
  proposed_policy: MerchantPolicy;
}

export interface PolicyHistoryItem {
  id: string;
  event_type: string;
  actor: string;
  payload: {
    policy_id?: string;
    changed_fields?: string[];
    previous_state?: Record<string, any>;
    new_state?: Record<string, any>;
  };
  correlation_id?: string | null;
  created_at: string;
}

export interface PolicyHistoryResponse {
  merchant_id: string;
  history: PolicyHistoryItem[];
}

export interface OverviewMetrics {
  merchant_id?: string;
  total_cases_count: number;
  active_cases_count: number;
  recovered_cases_count: number;
  escalated_cases_count: number;
  recovered_revenue_inr: number;
  recovery_rate_percent: number;
  total_audit_events: number;
}

export interface AuditEventItem {
  id: string;
  event_type: string;
  actor: string;
  payload: Record<string, any>;
  recovery_case_id?: string | null;
  correlation_id?: string | null;
  created_at: string;
}

export interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationInfo;
}

export interface ObservabilitySummary {
  timestamp: string;
  merchant_id: string;
  recovery_pipeline: {
    total_cases: number;
    cases_by_state: Record<string, number>;
    actions_by_status: Record<string, number>;
  };
  telemetry: {
    counters: Record<string, number>;
    histograms: Record<string, { count: number; avg: number; min: number; max: number }>;
  };
}

export interface ReadinessCheck {
  status: string;
  checks: Record<string, string>;
}

// ==========================================
// Phase 18 — Evaluation Lab Types
// ==========================================

export type EvaluationModeType = 'SMART_MANDATE' | 'RAZORPAY_NATIVE' | 'RULE_BASED' | 'AI_UNGUARDED';

export interface ClassMetricsType {
  precision: number;
  recall: number;
  f1_score: number;
  support: number;
}

export interface SafetyMetricsType {
  hard_decline_safety_rate: number;
  retry_cap_safety_rate: number;
  recovery_window_enforcement_rate: number;
  high_value_escalation_compliance: number;
  low_confidence_veto_rate: number;
  contact_cap_enforcement_rate: number;
  total_policy_violations: number;
}

export interface DimensionBreakdownItem {
  total: number;
  label_accuracy: number;
  recovered_count: number;
  recovery_rate?: number;
}

export interface BenchmarkMetricsType {
  total_evaluated: number;
  label_accuracy: number;
  policy_outcome_accuracy: number;
  final_action_accuracy: number;
  case_outcome_accuracy: number;
  macro_f1: number;
  weighted_f1: number;
  confusion_matrix: Record<string, Record<string, number>>;
  per_class_metrics: Record<string, ClassMetricsType>;
  safety_metrics: SafetyMetricsType;
  simulated_recovery_rate: number;
  simulated_recovered_revenue_inr: string | number;
  total_at_risk_revenue_inr: string | number;
  revenue_recovery_rate: number;
  wasted_action_rate: number;
  intervention_efficiency: number;
  recovery_uplift_pp: number | null;
  family_breakdown?: Record<string, DimensionBreakdownItem>;
  difficulty_breakdown?: Record<string, DimensionBreakdownItem>;
  category_breakdown?: Record<string, DimensionBreakdownItem>;
  split_breakdown?: Record<string, DimensionBreakdownItem>;
  dataset_seed?: number;
  dataset_split?: string;
}

export interface EvaluationRunItem {
  id: string;
  dataset_name: string;
  baseline_mode: EvaluationModeType | string;
  metrics_summary: BenchmarkMetricsType;
  created_at: string;
  results_count?: number;
}

export interface ScenarioResultDetails {
  scenario_family: string;
  difficulty_tier: string;
  dataset_split: string;
  predicted_action: string;
  predicted_policy_status: string;
  predicted_case_outcome: string;
  is_label_correct: boolean;
  is_policy_violation: boolean;
  violation_type?: string | null;
  execution_time_ms: number;
  reasons: string[];
}

export interface EvaluationScenarioResultItem {
  id: string;
  evaluation_run_id: string;
  scenario_id: string;
  actual_outcome: string;
  simulated_outcome: string;
  details: ScenarioResultDetails;
  created_at: string;
}

export interface EvaluationSummaryResponse {
  total_runs: number;
  latest_run: EvaluationRunItem | null;
  dataset: {
    name: string;
    total_scenarios: number;
    splits: Record<string, number>;
    families_count: number;
    difficulty_tiers: Record<string, number>;
    seed: number;
  };
}

export interface BenchmarkRunRequest {
  dataset?: string;
  split?: 'TRAIN' | 'VALIDATION' | 'TEST' | 'ALL';
  mode?: EvaluationModeType | 'ALL';
  compare?: boolean;
  persist?: boolean;
}

export interface ComparativeBenchmarkResponse {
  mode_metrics: Record<string, BenchmarkMetricsType>;
  baseline_recovery_rate: number;
  total_evaluated: number;
  split: string;
  persisted_run_ids: Record<string, string>;
  json_report_path?: string;
  markdown_report_path?: string;
}
