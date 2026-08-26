import React, { useEffect, useState } from 'react';
import { RefreshCw, AlertCircle, IndianRupee } from 'lucide-react';
import { fetchObservabilitySummary, fetchOverviewMetrics } from '../../services/api';
import { ObservabilitySummary, OverviewMetrics } from '../../types';

export const AnalyticsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [obsSummary, setObsSummary] = useState<ObservabilitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [m, o] = await Promise.all([
        fetchOverviewMetrics(),
        fetchObservabilitySummary().catch(() => null),
      ]);
      setMetrics(m);
      setObsSummary(o);
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
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
        <span className="ml-2 text-sm text-gray-500 font-medium">Loading analytics data...</span>
      </div>
    );
  }

  const totalCases = metrics?.total_cases_count || 0;
  const recoveredCases = metrics?.recovered_cases_count || 0;
  const recoveredAmount = metrics?.recovered_revenue_inr || 0;
  const recoveryRate = metrics?.recovery_rate_percent || 0;

  const actions = obsSummary?.recovery_pipeline.actions_by_status || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Recovery Performance Analytics</h1>
          <p className="text-xs text-gray-500 mt-1">
            Macro subscription revenue recovery, conversion rates & action efficiency metrics
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={loadData} className="font-semibold text-red-800 underline">
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-2">
          <span className="text-xs font-bold text-gray-500 uppercase">Recovered Revenue</span>
          <p className="text-2xl font-extrabold text-green-700 flex items-center">
            <IndianRupee className="w-5 h-5 mr-0.5" />
            {recoveredAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          <p className="text-xs text-gray-500">Total settled revenue successfully reclaimed from failed mandates.</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-2">
          <span className="text-xs font-bold text-gray-500 uppercase">Recovery Rate</span>
          <p className="text-2xl font-extrabold text-blue-700">{recoveryRate.toFixed(1)}%</p>
          <p className="text-xs text-gray-500">
            {recoveredCases} of {totalCases} mandate failure cases recovered.
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-2">
          <span className="text-xs font-bold text-gray-500 uppercase">Active Interventions</span>
          <p className="text-2xl font-extrabold text-purple-700">{metrics?.active_cases_count || 0}</p>
          <p className="text-xs text-gray-500">Subscriptions actively progressing through smart recovery.</p>
        </div>
      </div>

      {/* Actions Breakdown Card */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Execution Actions Breakdown</h3>
        {Object.keys(actions).length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">No action executions recorded yet.</div>
        ) : (
          <div className="space-y-3">
            {Object.entries(actions).map(([actionStatus, count]) => (
              <div key={actionStatus} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                <span className="text-xs font-bold text-gray-800">{actionStatus}</span>
                <span className="text-xs font-semibold text-gray-600">{count} action(s)</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
