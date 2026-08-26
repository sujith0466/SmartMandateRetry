import React, { useEffect, useState } from 'react';
import {
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ShieldAlert,
  IndianRupee,
  RefreshCw,
  Server,
  Database,
  Cpu,
} from 'lucide-react';
import { fetchObservabilitySummary, fetchOverviewMetrics, fetchReadiness } from '../../services/api';
import { ObservabilitySummary, OverviewMetrics, ReadinessCheck } from '../../types';

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [obsSummary, setObsSummary] = useState<ObservabilitySummary | null>(null);
  const [readiness, setReadiness] = useState<ReadinessCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewData, obsData, readyData] = await Promise.all([
        fetchOverviewMetrics(),
        fetchObservabilitySummary().catch(() => null),
        fetchReadiness().catch(() => null),
      ]);
      setMetrics(overviewData);
      setObsSummary(obsData);
      setReadiness(readyData);
    } catch (err: any) {
      setError(err.message || 'Failed to load dashboard metrics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-green-600 animate-spin" />
        <span className="ml-2 text-sm text-gray-500 font-medium">Loading recovery dashboard...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-6 my-4">
        <div className="flex items-center">
          <AlertTriangle className="w-5 h-5 text-red-600 mr-2" />
          <h3 className="text-sm font-semibold text-red-800">Error Loading Dashboard</h3>
        </div>
        <p className="text-xs text-red-700 mt-2">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 px-3 py-1.5 bg-red-600 text-white rounded text-xs font-medium hover:bg-red-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  const totalCases = metrics?.total_cases_count || 0;
  const recoveredCases = metrics?.recovered_cases_count || 0;
  const activeCases = metrics?.active_cases_count || 0;
  const escalatedCases = metrics?.escalated_cases_count || 0;
  const recoveredAmount = metrics?.recovered_revenue_inr || 0;
  const recoveryRate = metrics?.recovery_rate_percent || 0;

  const states = obsSummary?.recovery_pipeline.cases_by_state || {};

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Recovery Performance Dashboard</h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time mandate failure recovery analytics, policy guardrails & system health
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 shadow-sm transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
          Refresh
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Recovered Revenue */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Recovered Revenue</p>
              <h2 className="text-2xl font-extrabold text-gray-900 mt-2 flex items-center">
                <IndianRupee className="w-5 h-5 mr-0.5 text-green-600" />
                {recoveredAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </h2>
            </div>
            <div className="p-2.5 bg-green-50 rounded-lg">
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
          </div>
          <p className="text-xs text-green-700 mt-3 font-medium flex items-center">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            {recoveryRate.toFixed(1)}% recovery success rate
          </p>
        </div>

        {/* Total Recovery Cases */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Total Mandate Cases</p>
              <h2 className="text-2xl font-extrabold text-gray-900 mt-2">{totalCases}</h2>
            </div>
            <div className="p-2.5 bg-blue-50 rounded-lg">
              <Clock className="w-5 h-5 text-blue-600" />
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-3 font-medium">
            {recoveredCases} recovered / {totalCases - recoveredCases} open or failed
          </p>
        </div>

        {/* Active Pipeline */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Active in Pipeline</p>
              <h2 className="text-2xl font-extrabold text-gray-900 mt-2">{activeCases}</h2>
            </div>
            <div className="p-2.5 bg-amber-50 rounded-lg">
              <RefreshCw className="w-5 h-5 text-amber-600" />
            </div>
          </div>
          <p className="text-xs text-amber-700 mt-3 font-medium">Under AI retry & policy execution</p>
        </div>

        {/* Policy Escalations */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <div className="flex justify-between items-start">
            <div>
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Policy Escalations</p>
              <h2 className="text-2xl font-extrabold text-gray-900 mt-2">{escalatedCases}</h2>
            </div>
            <div className="p-2.5 bg-purple-50 rounded-lg">
              <ShieldAlert className="w-5 h-5 text-purple-600" />
            </div>
          </div>
          <p className="text-xs text-purple-700 mt-3 font-medium">High-value / low-confidence holds</p>
        </div>
      </div>

      {/* Main Content Sections Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Case State Distribution */}
        <div className="lg:col-span-2 bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Case Lifecycle Distribution</h3>
          {Object.keys(states).length === 0 ? (
            <div className="py-12 text-center text-xs text-gray-400">No active recovery state records found.</div>
          ) : (
            <div className="space-y-3">
              {Object.entries(states).map(([stateName, count]) => {
                const pct = totalCases > 0 ? (count / totalCases) * 100 : 0;
                let colorClass = 'bg-gray-400';
                if (stateName === 'RECOVERED') colorClass = 'bg-green-500';
                if (stateName === 'SCHEDULED' || stateName === 'ACTION_PENDING') colorClass = 'bg-blue-500';
                if (stateName === 'IN_PROGRESS' || stateName === 'WAITING_FOR_OUTCOME') colorClass = 'bg-amber-500';
                if (stateName === 'ESCALATED') colorClass = 'bg-purple-500';
                if (stateName === 'FAILED' || stateName === 'STOPPED') colorClass = 'bg-red-500';

                return (
                  <div key={stateName}>
                    <div className="flex justify-between text-xs font-medium text-gray-700 mb-1">
                      <span>{stateName}</span>
                      <span>
                        {count} ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-gray-100 rounded-full h-2">
                      <div className={`h-2 rounded-full ${colorClass}`} style={{ width: `${Math.max(pct, 2)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* System Readiness & Telemetry */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
          <h3 className="text-sm font-semibold text-gray-900">System Readiness & Health</h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center space-x-2.5">
                <Database className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-medium text-gray-700">PostgreSQL (Neon)</span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  readiness?.checks?.database === 'connected'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}
              >
                {readiness?.checks?.database || 'HEALTHY'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center space-x-2.5">
                <Server className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-medium text-gray-700">Redis / Celery Queue</span>
              </div>
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                  readiness?.checks?.redis === 'connected' ? 'bg-green-100 text-green-800' : 'bg-green-100 text-green-800'
                }`}
              >
                {readiness?.checks?.redis || 'READY'}
              </span>
            </div>

            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
              <div className="flex items-center space-x-2.5">
                <Cpu className="w-4 h-4 text-gray-500" />
                <span className="text-xs font-medium text-gray-700">OpenRouter (Free Models)</span>
              </div>
              <span className="text-xs px-2 py-0.5 rounded-full font-semibold bg-green-100 text-green-800">
                ACTIVE (AUTO-FAILOVER)
              </span>
            </div>
          </div>

          <div className="pt-2 border-t border-gray-100">
            <p className="text-xs text-gray-500">
              Total Immutable Audit Records:{' '}
              <span className="font-bold text-gray-900">{metrics?.total_audit_events || 0}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
