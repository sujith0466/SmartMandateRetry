import { MerchantPolicy, OverviewMetrics, RecoveryCase } from '../types';

const API_BASE = '/api/v1';

export async function fetchHealth(): Promise<{ status: string }> {
  const res = await fetch(`${API_BASE}/healthz`);
  if (!res.ok) throw new Error('Health check failed');
  return res.json();
}

export async function fetchOverviewMetrics(): Promise<OverviewMetrics> {
  const res = await fetch(`${API_BASE}/analytics/overview`);
  if (!res.ok) throw new Error('Failed to fetch metrics');
  return res.json();
}

export async function fetchPolicies(): Promise<MerchantPolicy> {
  const res = await fetch(`${API_BASE}/policies`);
  if (!res.ok) throw new Error('Failed to fetch policies');
  return res.json();
}

export async function fetchCases(page = 1, limit = 20): Promise<{ data: RecoveryCase[]; pagination: { total: number } }> {
  const res = await fetch(`${API_BASE}/cases?page=${page}&limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch cases');
  return res.json();
}
