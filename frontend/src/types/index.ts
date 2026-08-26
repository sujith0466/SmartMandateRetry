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
