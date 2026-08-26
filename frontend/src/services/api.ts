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

// Default demo merchant ID for local UI interaction
const DEFAULT_MERCHANT_ID = 'm_demo_merchant_01';

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
    headers.set('X-Merchant-ID', DEFAULT_MERCHANT_ID);
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

export async function fetchCases(
  page: number = 1,
  limit: number = 20,
  state?: string,
  stage?: string
): Promise<{ data: RecoveryCase[]; pagination: PaginationInfo }> {
  const params = new URLSearchParams({
    page: page.toString(),
    limit: limit.toString(),
  });
  if (state) params.append('state', state);
  if (stage) params.append('stage', stage);

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

export async function fetchObservabilitySummary(): Promise<ObservabilitySummary> {
  return request('/observability/summary');
}
