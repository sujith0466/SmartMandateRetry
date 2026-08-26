import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, AlertCircle, IndianRupee, Activity, Percent } from 'lucide-react';
import { fetchObservabilitySummary, fetchOverviewMetrics } from '../../services/api';
import { ObservabilitySummary, OverviewMetrics } from '../../types';
import { StatCard } from '../../components/ui/StatCard';
import { Skeleton } from '../../components/ui/SkeletonLoader';

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
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const totalCases = metrics?.total_cases_count || 0;
  const recoveredCases = metrics?.recovered_cases_count || 0;
  const recoveredAmount = metrics?.recovered_revenue_inr || 0;
  const recoveryRate = metrics?.recovery_rate_percent || 0;

  const actions = obsSummary?.recovery_pipeline.actions_by_status || {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Recovery Performance Analytics</h1>
          <p className="text-xs text-slate-400 mt-1">
            Macro subscription revenue recovery, conversion rates & action efficiency metrics
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="glass-panel border-rose-800/80 rounded-2xl p-4 flex items-center justify-between text-xs text-rose-300 bg-rose-950/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={loadData} className="font-bold text-rose-300 underline">
            Retry
          </button>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <StatCard
          title="Recovered Revenue"
          value={`₹${recoveredAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="Total settled mandate payments reclaimed"
          icon={IndianRupee}
          variant="emerald"
        />
        <StatCard
          title="Recovery Success Rate"
          value={`${recoveryRate.toFixed(1)}%`}
          subtitle={`${recoveredCases} of ${totalCases} mandate cases recovered`}
          icon={Percent}
          variant="indigo"
          delay={0.05}
        />
        <StatCard
          title="Active Interventions"
          value={metrics?.active_cases_count || 0}
          subtitle="Mandates actively in automated recovery"
          icon={Activity}
          variant="amber"
          delay={0.1}
        />
      </div>

      {/* Actions Breakdown Card */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="text-sm font-bold text-white">Execution Actions Breakdown</h3>
          <span className="text-xs font-mono text-slate-400">Total Action Dispatch Summary</span>
        </div>

        {Object.keys(actions).length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 font-medium">
            No execution actions recorded in current partition.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(actions).map(([actionStatus, count]) => (
              <div
                key={actionStatus}
                className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <span className="text-xs font-bold text-slate-300">{actionStatus}</span>
                  <p className="text-[11px] text-slate-500 mt-0.5">Execution Status</p>
                </div>
                <span className="text-base font-extrabold font-mono text-indigo-400">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
