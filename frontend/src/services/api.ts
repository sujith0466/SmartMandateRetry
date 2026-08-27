import {
  AuditEventItem,
  CaseDetailResponse,
  MerchantPolicy,
  ObservabilitySummary,
  OverviewMetrics,
  PaginationInfo,
  ReadinessCheck,
  ReconciliationStatusInfo,
  RecoveryActionItem,
  RecoveryCase,
} from '../types';

const API_BASE = '/api/v1';

// Default active merchant tenant (enterprise baseline)
export const DEFAULT_MERCHANT_ID = 'merch_saas_metrics_01';

export function getActiveMerchantId(): string {
  if (typeof window !== 'undefined' && window.localStorage) {
    return localStorage.getItem('smartmandate_active_merchant') || DEFAULT_MERCHANT_ID;
  }
  return DEFAULT_MERCHANT_ID;
}

export function setActiveMerchantId(merchantId: string): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    localStorage.setItem('smartmandate_active_merchant', merchantId);
  }
}

export class ApiError extends Error {
  code: string;
  status: number;
  details?: Record<string, any>;
  path?: string;

  constructor(message: string, status: number, code: string = 'API_ERROR', details?: Record<string, any>, path?: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
    this.path = path;
  }
}

function getHeaders(customHeaders?: HeadersInit): Headers {
  const headers = new Headers(customHeaders);
  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (!headers.has('X-Merchant-ID')) {
    headers.set('X-Merchant-ID', getActiveMerchantId());
  }
  if (!headers.has('X-Correlation-ID')) {
    headers.set('X-Correlation-ID', `corr_fe_${Math.random().toString(36).substring(2, 10)}`);
  }
  return headers;
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_BASE}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: getHeaders(options.headers),
  });

  if (!response.ok) {
    let errorData: any = {};
    try {
      errorData = await response.json();
    } catch {
      // Fallback for non-JSON error responses
    }

    const err = errorData.error || {};
    throw new ApiError(
      err.message || `Request failed with status ${response.status}`,
      response.status,
      err.code || 'UNKNOWN_ERROR',
      err.details,
      err.path || endpoint
    );
  }

  return response.json();
}

export async function fetchHealth(): Promise<{ status: string; app: string; version: string }> {
  return request('/healthz');
}

export async function fetchReadiness(): Promise<ReadinessCheck> {
  return request('/readyz');
}

export async function fetchOverviewMetrics(): Promise<OverviewMetrics> {
  return request('/analytics/overview');
}

export async function fetchPolicies(): Promise<MerchantPolicy> {
  return request('/policies');
}

export async function updatePolicy(policyData: Partial<MerchantPolicy>): Promise<MerchantPolicy> {
  return request('/policies', {
    method: 'PUT',
    body: JSON.stringify(policyData),
  });
}

export async function previewPolicyChanges(proposedData: Partial<MerchantPolicy>): Promise<import('../types').PolicyChangePreview> {
  return request('/policies/preview', {
    method: 'POST',
    body: JSON.stringify(proposedData),
  });
}

export async function simulatePolicy(
  proposedData: Partial<MerchantPolicy>,
  split: string = 'TEST'
): Promise<import('../types').PolicySimulationResponse> {
  return request(`/policies/simulate?split=${split}`, {
    method: 'POST',
    body: JSON.stringify(proposedData),
  });
}

export async function fetchPolicyHistory(limit: number = 20): Promise<import('../types').PolicyHistoryResponse> {
  return request(`/policies/history?limit=${limit}`);
}

export async function fetchCases(
  page: number = 1,
  limit: number = 20,
  filters?: {
    state?: string;
    stage?: string;
    failure_category?: string;
    search?: string;
    min_amount?: number;
    max_amount?: number;
  }
): Promise<{ data: RecoveryCase[]; pagination: PaginationInfo }> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (filters?.state) params.append('state', filters.state);
  if (filters?.stage) params.append('stage', filters.stage);
  if (filters?.failure_category) params.append('failure_category', filters.failure_category);
  if (filters?.search) params.append('search', filters.search);
  if (filters?.min_amount !== undefined) params.append('min_amount', filters.min_amount.toString());
  if (filters?.max_amount !== undefined) params.append('max_amount', filters.max_amount.toString());

  return request(`/cases?${params.toString()}`);
}

export async function fetchCaseDetail(caseId: string): Promise<CaseDetailResponse> {
  return request(`/cases/${caseId}`);
}

export async function fetchCaseActions(caseId: string): Promise<{ actions: RecoveryActionItem[] }> {
  return request(`/cases/${caseId}/actions`);
}

export async function fetchCaseReconciliation(caseId: string): Promise<ReconciliationStatusInfo> {
  return request(`/cases/${caseId}/reconciliation`);
}

export async function escalateCase(
  caseId: string,
  reason: string,
  notes: string = ''
): Promise<{ status: string; case_id: string; state: string; message: string }> {
  return request(`/cases/${caseId}/escalate`, {
    method: 'POST',
    body: JSON.stringify({ reason, notes }),
  });
}

export async function resolveEscalatedCase(
  caseId: string,
  action: 'APPROVE_RETRY' | 'SEND_PAYMENT_LINK' | 'DISMISS',
  notes: string = ''
): Promise<{ status: string; case_id: string; new_state: string; action_executed: string; message: string }> {
  return request(`/cases/${caseId}/resolve`, {
    method: 'POST',
    body: JSON.stringify({ action, notes }),
  });
}

export async function fetchCasePromises(caseId: string): Promise<{ promises: any[] }> {
  return request(`/cases/${caseId}/promises`);
}

export async function createCasePromise(
  caseId: string,
  data: { promise_due_at: string; notes?: string; source?: string }
): Promise<{ status: string; promise: any }> {
  return request(`/cases/${caseId}/promises`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function fetchWeeklyDigest(): Promise<any> {
  return request('/analytics/digest');
}

export async function exportCasesCsv(state?: string, stage?: string): Promise<Blob> {
  const params = new URLSearchParams();
  if (state) params.append('state', state);
  if (stage) params.append('stage', stage);

  const response = await fetch(`${API_BASE}/cases/export?${params.toString()}`, {
    headers: getHeaders({ Accept: 'text/csv' }),
  });
  if (!response.ok) throw new Error('Failed to export cases CSV');
  return response.blob();
}

export async function fetchAuditEvents(
  page: number = 1,
  limit: number = 20,
  caseId?: string,
  eventType?: string,
  correlationId?: string
): Promise<{ data: AuditEventItem[]; pagination: PaginationInfo }> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (caseId) params.append('case_id', caseId);
  if (eventType) params.append('event_type', eventType);
  if (correlationId) params.append('correlation_id', correlationId);

  return request(`/audit-events?${params.toString()}`);
}

export async function exportAuditCsv(caseId?: string, eventType?: string): Promise<Blob> {
  const params = new URLSearchParams();
  if (caseId) params.append('case_id', caseId);
  if (eventType) params.append('event_type', eventType);

  const response = await fetch(`${API_BASE}/audit-events/export?${params.toString()}`, {
    headers: getHeaders({ Accept: 'text/csv' }),
  });
  if (!response.ok) throw new Error('Failed to export audit CSV');
  return response.blob();
}

export async function fetchObservabilitySummary(): Promise<ObservabilitySummary> {
  return request('/observability/summary');
}

// ==========================================
// Phase 18 — Evaluation Lab API Methods
// ==========================================

export async function fetchEvaluationSummary(): Promise<import('../types').EvaluationSummaryResponse> {
  return request('/evaluation/summary');
}

export async function fetchEvaluationRuns(
  page: number = 1,
  limit: number = 20
): Promise<{ data: import('../types').EvaluationRunItem[]; pagination: PaginationInfo }> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  return request(`/evaluation/runs?${params.toString()}`);
}

export async function fetchEvaluationRunDetail(
  runId: string
): Promise<import('../types').EvaluationRunItem> {
  return request(`/evaluation/runs/${runId}`);
}

export async function fetchScenarioResults(
  runId: string,
  page: number = 1,
  limit: number = 20,
  filters?: {
    family?: string;
    tier?: string;
    split?: string;
    label?: string;
    is_correct?: boolean;
    is_violation?: boolean;
    search?: string;
  }
): Promise<{ data: import('../types').EvaluationScenarioResultItem[]; pagination: PaginationInfo }> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });

  if (filters?.family) params.append('family', filters.family);
  if (filters?.tier) params.append('tier', filters.tier);
  if (filters?.split) params.append('split', filters.split);
  if (filters?.label) params.append('label', filters.label);
  if (filters?.is_correct !== undefined) params.append('is_correct', filters.is_correct.toString());
  if (filters?.is_violation !== undefined) params.append('is_violation', filters.is_violation.toString());
  if (filters?.search) params.append('search', filters.search);

  return request(`/evaluation/runs/${runId}/results?${params.toString()}`);
}

export async function executeBenchmarkRun(
  req: import('../types').BenchmarkRunRequest
): Promise<import('../types').ComparativeBenchmarkResponse | { mode: string; split: string; metrics: import('../types').BenchmarkMetricsType; total_evaluated: number; run_id: string }> {
  return request('/evaluation/benchmark', {
    method: 'POST',
    body: JSON.stringify(req),
  });
}

export async function fetchCaseExplainability(
  caseId: string
): Promise<import('../types').DecisionAttributionResponse> {
  return request(`/cases/${caseId}/explainability`);
}

export async function fetchEvaluationTrends(): Promise<import('../types').EvaluationTrendsResponse> {
  return request('/evaluation/trends');
}
