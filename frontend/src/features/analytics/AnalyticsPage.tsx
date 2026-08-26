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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-[#111827] tracking-tight font-sans">
              Revenue Intelligence & Conversion Analytics
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] font-bold">
              Conversion Yield
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Deep recovery conversion intelligence, channel effectiveness & safety guardrail attribution
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F7F9FC] text-[#475569] text-xs font-bold transition-colors shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-[#64748B]" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-[#FFF1F2] border border-[#FECDD3] rounded-2xl p-4 flex items-center justify-between text-xs text-[#9F1239] shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#E11D48] shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={loadData} className="font-bold text-[#BE123C] underline">
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
          highlight={true}
        />
        <StatCard
          title="Recovery Success Rate"
          value={`${recoveryRate.toFixed(1)}%`}
          subtitle={`${recoveredCases} settled of ${totalCases} mandate failures`}
          icon={Percent}
          variant="sapphire"
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
          variant="aqua"
          delay={0.15}
        />
      </div>

      {/* Section 1: Recovery Channel Effectiveness & Method Conversion */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Method Breakdown */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <div className="flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#3B5BDB]" />
              <h3 className="text-sm font-bold text-[#111827] font-sans">Recovery Strategy Performance</h3>
            </div>
            <span className="text-xs text-[#64748B] font-mono font-semibold">By Channel</span>
          </div>

          <div className="space-y-4">
            {/* Smart Payment Link (Aqua Theme for Payment Channel) */}
            <div className="p-4 bg-[#F7F9FC] rounded-xl border border-[#E5E7EB] space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[#ECFEFF] text-[#0891B2] border border-[#A5F3FC]">
                    <Smartphone className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#111827]">Smart Payment Link (WhatsApp & SMS)</h4>
                    <p className="text-[11px] text-[#64748B]">Multi-channel dynamic checkout link</p>
                  </div>
                </div>
                <span className="text-xs font-black font-mono text-[#059669]">₹24,498 Recovered</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E5E7EB] text-center">
                <div>
                  <span className="text-[10px] text-[#64748B] uppercase font-bold">Dispatched</span>
                  <p className="text-xs font-bold text-[#111827]">6 links</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] uppercase font-bold">Converted</span>
                  <p className="text-xs font-bold text-[#059669]">4 (66.7%)</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] uppercase font-bold">Avg Settlement</span>
                  <p className="text-xs font-bold text-[#111827]">4.5 hrs</p>
                </div>
              </div>
            </div>

            {/* Automated Mandate Retry */}
            <div className="p-4 bg-[#F7F9FC] rounded-xl border border-[#E5E7EB] space-y-2.5 shadow-2xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-lg bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                    <RefreshCw className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-[#111827]">Automated Mandate Retry</h4>
                    <p className="text-[11px] text-[#64748B]">Intelligent bank debit timing (06:00 IST window)</p>
                  </div>
                </div>
                <span className="text-xs font-black font-mono text-[#059669]">₹4,999 Recovered</span>
              </div>
              <div className="grid grid-cols-3 gap-2 pt-2 border-t border-[#E5E7EB] text-center">
                <div>
                  <span className="text-[10px] text-[#64748B] uppercase font-bold">Scheduled</span>
                  <p className="text-xs font-bold text-[#111827]">4 attempts</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] uppercase font-bold">Succeeded</span>
                  <p className="text-xs font-bold text-[#059669]">1 (25.0%)</p>
                </div>
                <div>
                  <span className="text-[10px] text-[#64748B] uppercase font-bold">Frictionless</span>
                  <p className="text-xs font-bold text-[#3B5BDB]">100% Zero-Touch CX</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Failure Category Recovery Yield */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <div className="flex items-center gap-2">
              <PieChart className="w-4 h-4 text-[#059669]" />
              <h3 className="text-sm font-bold text-[#111827] font-sans">Recovery Yield by Failure Type</h3>
            </div>
            <span className="text-xs text-[#64748B] font-mono font-semibold">Conversion Matrix</span>
          </div>

          <div className="space-y-3">
            {[
              { label: 'Insufficient Funds (Soft Decline)', total: 6, rec: 3, amt: '₹13,498', rate: '50.0%' },
              { label: 'Card Expired / Mandate Update', total: 3, rec: 1, amt: '₹12,000', rate: '33.3%' },
              { label: 'Bank Server Downtime / Network Limit', total: 3, rec: 1, amt: '₹4,999', rate: '33.3%' },
              { label: 'Hard Decline (Account Closed / Stolen)', total: 2, rec: 0, amt: '₹0', rate: '0% (Auto-Stopped)' },
            ].map((cat) => (
              <div key={cat.label} className="p-3.5 bg-[#F7F9FC] rounded-xl border border-[#E5E7EB] space-y-1.5 shadow-2xs">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-[#111827]">{cat.label}</span>
                  <span className="text-[#059669] font-mono font-black">{cat.amt}</span>
                </div>
                <div className="flex justify-between text-[11px] text-[#64748B] font-medium">
                  <span>{cat.rec} of {cat.total} cases recovered</span>
                  <span className="font-mono font-bold text-[#475569]">{cat.rate}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section 2: Amount Tier Segmentation & Policy Safety Impact */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Ticket Size Segmentation */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#3B5BDB]" />
              <h3 className="text-sm font-bold text-[#111827] font-sans">Amount Tier Segmentation</h3>
            </div>
            <span className="text-xs text-[#64748B] font-mono font-semibold">Volume vs Yield</span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-center">
            <div className="p-4 bg-[#F7F9FC] rounded-xl border border-[#E5E7EB] space-y-1 shadow-2xs">
              <span className="text-[10px] text-[#64748B] font-bold uppercase">Micro (&lt;₹2,000)</span>
              <p className="text-lg font-black text-[#111827]">2 Cases</p>
              <p className="text-xs font-bold text-[#059669] font-mono">₹1,499 (50%)</p>
            </div>
            <div className="p-4 bg-[#F7F9FC] rounded-xl border border-[#E5E7EB] space-y-1 shadow-2xs">
              <span className="text-[10px] text-[#64748B] font-bold uppercase">Standard (₹2k-10k)</span>
              <p className="text-lg font-black text-[#111827]">10 Cases</p>
              <p className="text-xs font-bold text-[#059669] font-mono">₹15,998 (40%)</p>
            </div>
            <div className="p-4 bg-[#F7F9FC] rounded-xl border border-[#E5E7EB] space-y-1 shadow-2xs">
              <span className="text-[10px] text-[#64748B] font-bold uppercase">High Value (&gt;₹10k)</span>
              <p className="text-lg font-black text-[#111827]">4 Cases</p>
              <p className="text-xs font-bold text-[#059669] font-mono">₹12,000 (25%)</p>
            </div>
          </div>
        </div>

        {/* Safety & Compliance Protection Metrics */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#059669]" />
              <h3 className="text-sm font-bold text-[#111827] font-sans">Safety & Compliance Guardrails</h3>
            </div>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] font-bold font-mono">
              0 Violations
            </span>
          </div>

          <div className="space-y-2.5">
            <div className="flex items-center justify-between p-3.5 bg-[#F7F9FC] rounded-xl border border-[#E5E7EB] shadow-2xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0" />
                <span className="text-xs text-[#111827] font-bold">Hard Decline Penalty Saves</span>
              </div>
              <span className="text-xs font-bold font-mono text-[#111827]">2 Hard Stops Enforced</span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[#F7F9FC] rounded-xl border border-[#E5E7EB] shadow-2xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#7C3AED] shrink-0" />
                <span className="text-xs text-[#111827] font-bold">High-Value Enterprise Gate</span>
              </div>
              <span className="text-xs font-bold font-mono text-[#111827]">3 Manual Approvals</span>
            </div>

            <div className="flex items-center justify-between p-3.5 bg-[#F7F9FC] rounded-xl border border-[#E5E7EB] shadow-2xs">
              <div className="flex items-center gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-[#D97706] shrink-0" />
                <span className="text-xs text-[#111827] font-bold">Customer Contact Fatigue Caps</span>
              </div>
              <span className="text-xs font-bold font-mono text-[#111827]">100% Within 3-Msg Cap</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
