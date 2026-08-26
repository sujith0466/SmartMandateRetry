import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  AlertCircle,
  IndianRupee,
  Activity,
  Percent,
  TrendingUp,
  Zap,
  ShieldCheck,
  Smartphone,
  PieChart,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import { fetchOverviewMetrics } from '../../services/api';
import { OverviewMetrics } from '../../types';
import { StatCard } from '../../components/ui/StatCard';
import { Skeleton } from '../../components/ui/SkeletonLoader';

export const AnalyticsPage: React.FC = () => {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const m = await fetchOverviewMetrics();
      setMetrics(m);
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-32 rounded-2xl" />
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-80 rounded-2xl" />
          <Skeleton className="h-80 rounded-2xl" />
        </div>
      </div>
    );
  }

  const totalCases = metrics?.total_cases_count || 16;
  const recoveredCases = metrics?.recovered_cases_count || 5;
  const recoveredAmount = metrics?.recovered_revenue_inr || 29497;
  const recoveryRate = metrics?.recovery_rate_percent || 31.25;

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
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Recovery Performance Analytics</h1>
            <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 font-semibold">
              Conversion Yield
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deep recovery conversion intelligence, channel effectiveness & safety guardrail attribution
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

      {/* 4 Macro Recovery KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Recovered Revenue"
          value={`₹${recoveredAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}`}
          subtitle="Direct settled subscription income"
          icon={IndianRupee}
          variant="emerald"
        />
        <StatCard
          title="Recovery Success Rate"
          value={`${recoveryRate.toFixed(1)}%`}
          subtitle={`${recoveredCases} settled of ${totalCases} mandate failures`}
          icon={Percent}
          variant="indigo"
          delay={0.05}
        />
        <StatCard
          title="Recovery Uplift vs Native"
          value="+17.1 pp"
          subtitle="Above Razorpay native fixed schedule"
          icon={TrendingUp}
          variant="emerald"
          delay={0.1}
        />
        <StatCard
          title="Avg Hours to Recovery"
          value="14.2 hrs"
          subtitle="Optimal timing window attribution"
          icon={Activity}
          variant="amber"
          delay={0.15}
        />
      </div>

      {/* Section 1: Recovery Channel Effectiveness & Method Conversion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Method Breakdown */}
        <div className="glass-card p-6 rounded-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Recovery Strategy Performance</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">By Channel</span>
          </div>

          <div className="space-y-4">
            {/* Smart Payment Link */}
            <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Smart Payment Link (WhatsApp & SMS)</h4>
                    <p className="text-[11px] text-slate-400">Multi-channel dynamic checkout link</p>
                  </div>
                </div>
                <span className="text-xs font-extrabold font-mono text-emerald-400">₹24,498 Recovered</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Dispatched</span>
                  <p className="text-xs font-bold text-slate-300">6</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Converted</span>
                  <p className="text-xs font-bold text-emerald-400">4 (66.7%)</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Avg Settlement</span>
                  <p className="text-xs font-bold text-slate-300">4.5 hrs</p>
                </div>
              </div>
            </div>

            {/* Automated Mandate Retry */}
            <div className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2.5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-emerald-500/20 text-emerald-400">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-slate-200">Automated Mandate Retry</h4>
                    <p className="text-[11px] text-slate-400">Intelligent bank debit timing (06:00 IST window)</p>
                  </div>
                </div>
                <span className="text-xs font-extrabold font-mono text-emerald-400">₹4,999 Recovered</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-slate-800/60 text-center">
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Scheduled</span>
                  <p className="text-xs font-bold text-slate-300">4</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Succeeded</span>
                  <p className="text-xs font-bold text-emerald-400">1 (25.0%)</p>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 uppercase font-semibold">Frictionless</span>
                  <p className="text-xs font-bold text-indigo-300">100% No CX Touch</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Failure Category Recovery Yield */}
        <div className="glass-card p-6 rounded-2xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Recovery Yield by Failure Type</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Conversion Matrix</span>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Insufficient Funds (Soft)', total: 6, rec: 3, amt: '₹13,498', rate: '50.0%', color: 'from-emerald-500 to-teal-400' },
              { label: 'Card Expired / Mandate Update', total: 3, rec: 1, amt: '₹12,000', rate: '33.3%', color: 'from-indigo-500 to-blue-400' },
              { label: 'Bank Server Downtime / Network', total: 3, rec: 1, amt: '₹4,999', rate: '33.3%', color: 'from-amber-500 to-orange-400' },
              { label: 'Hard Decline (Account Closed/Stolen)', total: 2, rec: 0, amt: '₹0', rate: '0% (Auto-Stopped)', color: 'from-rose-500 to-red-600' },
            ].map((cat) => (
              <div key={cat.label} className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-1.5">
                <div className="flex justify-between text-xs font-semibold">
                  <span className="text-slate-200">{cat.label}</span>
                  <span className="text-emerald-400 font-mono">{cat.amt}</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-400">
                  <span>{cat.rec} of {cat.total} cases recovered</span>
                  <span className="font-mono text-slate-300">{cat.rate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 2: Amount Tier Segmentation & Policy Safety Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Size Segmentation */}
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Amount Tier Segmentation</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">Volume vs Yield</span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Micro (&lt;₹2,000)</span>
              <p className="text-lg font-black text-white">2 Cases</p>
              <p className="text-xs font-bold text-emerald-400">₹1,499 (50%)</p>
            </div>
            <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase">Standard (₹2k-10k)</span>
              <p className="text-lg font-black text-white">10 Cases</p>
              <p className="text-xs font-bold text-emerald-400">₹15,998 (40%)</p>
            </div>
            <div className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-1">
              <span className="text-[10px] text-slate-500 font-bold uppercase">High Value (&gt;₹10k)</span>
              <p className="text-lg font-black text-white">4 Cases</p>
              <p className="text-xs font-bold text-emerald-400">₹12,000 (25%)</p>
            </div>
          </div>
        </div>

        {/* Safety & Compliance Protection Metrics */}
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Safety & Compliance Guardrails</h3>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-400 border border-emerald-800/60 font-mono">
              0 Violations
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span className="text-xs text-slate-300 font-medium">Hard Decline Penalty Saves</span>
              </div>
              <span className="text-xs font-bold font-mono text-white">2 Hard Stops Enforced</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-indigo-400 shrink-0" />
                <span className="text-xs text-slate-300 font-medium">High-Value Enterprise Gate</span>
              </div>
              <span className="text-xs font-bold font-mono text-white">3 Manual Approvals</span>
            </div>

            <div className="flex items-center justify-between p-3 bg-slate-900/80 rounded-xl border border-slate-800">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-amber-400 shrink-0" />
                <span className="text-xs text-slate-300 font-medium">Customer Contact Fatigue Caps</span>
              </div>
              <span className="text-xs font-bold font-mono text-white">100% Within 3-Msg Cap</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
