export type RecoveryStage = 'PENDING_OBSERVATION' | 'HALTED_RECOVERY';

export type CaseState =
  | 'DETECTED'
  | 'ANALYZING'
  | 'DECISION_PENDING'
  | 'POLICY_REVIEW'
  | 'SCHEDULED'
  | 'ACTION_PENDING'
  | 'ACTION_EXECUTED'
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
  customer_email?: string;
  amount_inr: number;
  failure_category: FailureCategory;
  failure_code: string;
  stage: RecoveryStage;
  state: CaseState;
  ai_recommended_action?: string;
  ai_confidence?: number;
  attempt_count: number;
  created_at: string;
}

export interface MerchantPolicy {
  max_retries_per_case: number;
  min_retry_interval_hours: number;
  max_recovery_window_days: number;
  min_confidence_threshold: number;
  high_value_threshold_inr: number;
  max_customer_contacts_per_cycle: number;
  hard_decline_auto_stop: boolean;
}

export interface OverviewMetrics {
  revenue_at_risk_inr: number;
  recovered_revenue_inr: number;
  recovery_rate_percent: number;
  recovery_uplift_percent: number;
  active_cases_count: number;
  escalated_cases_count: number;
}
