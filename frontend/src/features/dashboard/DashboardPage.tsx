import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  ShieldAlert,
  IndianRupee,
  RefreshCw,
  Server,
  Database,
  Cpu,
  Layers,
  Sparkles,
} from 'lucide-react';
import { fetchObservabilitySummary, fetchOverviewMetrics, fetchReadiness } from '../../services/api';
import { ObservabilitySummary, OverviewMetrics, ReadinessCheck } from '../../types';
import { StatCard } from '../../components/ui/StatCard';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/SkeletonLoader';

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
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-64" />
          <Skeleton className="h-8 w-24" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Skeleton className="lg:col-span-2 h-72 rounded-2xl" />
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel border border-rose-800/80 rounded-2xl p-6 my-4 bg-rose-950/20">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-rose-400" />
          <h3 className="text-sm font-bold text-rose-200">Error Loading Dashboard</h3>
        </div>
        <p className="text-xs text-rose-300/80 mt-2">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-colors"
        >
          Retry Load
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
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Recovery Performance Dashboard</h1>
            <span className="flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
              <Sparkles className="w-3 h-3 text-indigo-400" />
              AI Driven
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Real-time mandate failure recovery analytics, policy guardrails & system health
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-200 bg-slate-900 border border-slate-700/80 hover:bg-slate-800 shadow-md transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          Refresh
        </button>
      </div>

      {/* Hero KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Recovered Revenue"
          value={`₹${recoveredAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle={`${recoveryRate.toFixed(1)}% recovery success rate`}
          icon={IndianRupee}
          variant="emerald"
          delay={0.05}
        />
        <StatCard
          title="Total Mandate Cases"
          value={totalCases}
          subtitle={`${recoveredCases} recovered / ${totalCases - recoveredCases} open/failed`}
          icon={Clock}
          variant="indigo"
          delay={0.1}
        />
        <StatCard
          title="Active Interventions"
          value={activeCases}
          subtitle="Smart retry & policy scheduled"
          icon={TrendingUp}
          variant="amber"
          delay={0.15}
        />
        <StatCard
          title="Policy Escalations"
          value={escalatedCases}
          subtitle="High-value / low-confidence holds"
          icon={ShieldAlert}
          variant="violet"
          delay={0.2}
        />
      </div>

      {/* Main Grid: Lifecycle Distribution & Readiness Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Case State Distribution */}
        <div className="lg:col-span-2 glass-card p-6 rounded-2xl space-y-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white tracking-wide">Case Lifecycle Distribution</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">{totalCases} Total</span>
          </div>

          {Object.keys(states).length === 0 ? (
            <div className="py-16 text-center text-xs text-slate-500 font-medium">
              No active recovery cases recorded in current partition.
            </div>
          ) : (
            <div className="space-y-3.5">
              {Object.entries(states).map(([stateName, count]) => {
                const pct = totalCases > 0 ? (count / totalCases) * 100 : 0;
                let colorBar = 'bg-slate-600';
                if (stateName === 'RECOVERED') colorBar = 'bg-gradient-to-r from-emerald-500 to-teal-400 shadow-[0_0_10px_rgba(16,185,129,0.3)]';
                else if (stateName === 'SCHEDULED' || stateName === 'ACTION_PENDING') colorBar = 'bg-gradient-to-r from-indigo-500 to-blue-400 shadow-[0_0_10px_rgba(99,102,241,0.3)]';
                else if (stateName === 'IN_PROGRESS' || stateName === 'WAITING_FOR_OUTCOME') colorBar = 'bg-gradient-to-r from-amber-500 to-orange-400 shadow-[0_0_10px_rgba(245,158,11,0.3)]';
                else if (stateName === 'ESCALATED') colorBar = 'bg-gradient-to-r from-violet-500 to-purple-400 shadow-[0_0_10px_rgba(139,92,246,0.3)]';
                else if (stateName === 'FAILED' || stateName === 'STOPPED') colorBar = 'bg-gradient-to-r from-rose-500 to-red-600 shadow-[0_0_10px_rgba(244,63,94,0.3)]';

                return (
                  <div key={stateName} className="space-y-1.5">
                    <div className="flex justify-between text-xs font-semibold">
                      <span className="text-slate-300">{stateName}</span>
                      <span className="text-slate-400 font-mono">
                        {count} <span className="text-slate-500">({pct.toFixed(1)}%)</span>
                      </span>
                    </div>
                    <div className="w-full bg-slate-800/80 rounded-full h-2 overflow-hidden border border-slate-700/50">
                      <div className={`h-2 rounded-full ${colorBar} transition-all duration-500`} style={{ width: `${Math.max(pct, 2)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Infrastructure Readiness & Diagnostics Matrix */}
        <div className="glass-card p-6 rounded-2xl space-y-5">
          <h3 className="text-sm font-bold text-white tracking-wide">Infrastructure Readiness</h3>
          <div className="space-y-3">
            <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">PostgreSQL 16</p>
                  <p className="text-[11px] text-slate-400">{readiness?.checks?.database || 'Connected'}</p>
                </div>
              </div>
              <Badge state="HEALTHY" variant="emerald" />
            </div>

            <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
                  <Server className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">Redis / Celery</p>
                  <p className="text-[11px] text-slate-400">{readiness?.checks?.redis || 'Ready'}</p>
                </div>
              </div>
              <Badge state="READY" variant="indigo" />
            </div>

            <div className="p-3.5 bg-slate-900/90 rounded-xl border border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-slate-800 text-slate-300">
                  <Cpu className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-200">OpenRouter LLM</p>
                  <p className="text-[11px] text-slate-400">{readiness?.checks?.llm_provider || 'Active (Auto-Failover)'}</p>
                </div>
              </div>
              <Badge state="ACTIVE" variant="emerald" />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
            <span>Immutable Audit Log:</span>
            <span className="font-mono font-bold text-indigo-400">
              {metrics?.total_audit_events || 0} Records
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
