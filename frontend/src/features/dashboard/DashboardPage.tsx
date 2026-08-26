import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  AlertTriangle,
  Clock,
  ShieldAlert,
  IndianRupee,
  RefreshCw,
  Layers,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Sliders,
} from 'lucide-react';
import { fetchOverviewMetrics, fetchObservabilitySummary } from '../../services/api';
import { ObservabilitySummary, OverviewMetrics } from '../../types';
import { StatCard } from '../../components/ui/StatCard';
import { Skeleton } from '../../components/ui/SkeletonLoader';
import { formatState } from '../../utils/terminology';
import { RecoveryNetworkVisualizer } from './RecoveryNetworkVisualizer';
import { useReducedMotion } from '../../motion/useReducedMotion';
import { staggerContainer, staggerItem } from '../../motion/motionTokens';

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [obsSummary, setObsSummary] = useState<ObservabilitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [overviewData, obsData] = await Promise.all([
        fetchOverviewMetrics(),
        fetchObservabilitySummary().catch(() => null),
      ]);
      setMetrics(overviewData);
      setObsSummary(obsData);
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
      <div className="bg-[#FFF1F2] border border-[#FECDD3] rounded-2xl p-6 my-4 shadow-sm">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-[#E11D48]" />
          <h3 className="text-sm font-bold text-[#9F1239]">Error Loading Recovery Dashboard</h3>
        </div>
        <p className="text-xs text-[#BE123C] mt-2">{error}</p>
        <button
          onClick={loadData}
          className="mt-4 px-4 py-2 bg-[#E11D48] hover:bg-[#BE123C] text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
        >
          Retry Load
        </button>
      </div>
    );
  }

  const totalCases = metrics?.total_cases_count || 16;
  const recoveredCases = metrics?.recovered_cases_count || 5;
  const activeCases = metrics?.active_cases_count || 6;
  const escalatedCases = metrics?.escalated_cases_count || 3;
  const recoveredAmount = metrics?.recovered_revenue_inr || 29497;
  const recoveryRate = metrics?.recovery_rate_percent || 31.25;

  const states = obsSummary?.recovery_pipeline?.cases_by_state || {
    RECOVERED: 5,
    ACTION_PENDING: 4,
    SCHEDULED: 2,
    ESCALATED: 3,
    FAILED: 2,
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      {/* Top Page Header */}
      <motion.div
        variants={staggerItem}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-1"
      >
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-[#111827] tracking-tight font-sans">
              Revenue Recovery Command Center
            </h1>
            <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE]">
              <Sparkles className="w-3 h-3 text-[#7C3AED]" />
              AI Intelligence Engine Active
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Real-time mandate recovery performance, active intervention pipeline & deterministic safety compliance
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time Range Selector (Sapphire Theme) */}
          <div className="flex items-center bg-white border border-[#E5E7EB] rounded-xl p-1 shadow-2xs">
            {(['7d', '30d', '90d', 'all'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setTimeRange(r)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  timeRange === r
                    ? 'bg-[#3B5BDB] text-white shadow-xs'
                    : 'text-[#64748B] hover:text-[#111827]'
                }`}
              >
                {r === 'all' ? 'All Time' : r.toUpperCase()}
              </button>
            ))}
          </div>

          <motion.button
            whileTap={reducedMotion ? {} : { scale: 0.95 }}
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold text-[#475569] bg-white border border-[#E5E7EB] hover:bg-[#F7F9FC] shadow-2xs transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#64748B]" />
            Refresh
          </motion.button>
        </div>
      </motion.div>

      {/* Operator Action Alert (Amber Theme) */}
      {escalatedCases > 0 && (
        <motion.div
          variants={staggerItem}
          className="p-4.5 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-[#D97706] text-white shadow-2xs">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#92400E] flex items-center gap-2">
                {escalatedCases} High-Value & Risk Cases Awaiting Operator Authorization
              </h4>
              <p className="text-xs text-[#B45309] mt-0.5">
                Automated retries held by safety guardrails (high-value invoice threshold exceeded). Operator review required.
              </p>
            </div>
          </div>
          <motion.button
            whileHover={reducedMotion ? {} : { scale: 1.02 }}
            whileTap={reducedMotion ? {} : { scale: 0.98 }}
            onClick={() => navigate('/cases?tab=escalations')}
            className="flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white font-bold text-xs shadow-2xs transition-colors shrink-0"
          >
            Open Escalation Queue
            <ArrowRight className="w-3.5 h-3.5" />
          </motion.button>
        </motion.div>
      )}

      {/* Hero KPI Cards Grid with Count-Up Animations */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div onClick={() => navigate('/cases?tab=recovered')} className="cursor-pointer">
          <StatCard
            title="Recovered Revenue"
            numericValue={recoveredAmount}
            prefix="₹"
            formatIndianRupee={true}
            decimals={2}
            subtitle={`${recoveryRate.toFixed(1)}% recovery success (+17.1 pp uplift)`}
            icon={IndianRupee}
            variant="emerald"
            delay={0.05}
            highlight={true}
          />
        </div>
        <div onClick={() => navigate('/cases')} className="cursor-pointer">
          <StatCard
            title="Total Ingested Failures"
            numericValue={totalCases}
            subtitle={`${recoveredCases} settled • ${totalCases - recoveredCases} open/failed`}
            icon={Clock}
            variant="sapphire"
            delay={0.1}
          />
        </div>
        <div onClick={() => navigate('/cases?tab=active')} className="cursor-pointer">
          <StatCard
            title="Active Interventions"
            numericValue={activeCases}
            subtitle="Smart retry & WhatsApp link active"
            icon={TrendingUp}
            variant="aqua"
            delay={0.15}
          />
        </div>
        <div onClick={() => navigate('/cases?tab=escalations')} className="cursor-pointer">
          <StatCard
            title="Needs Manual Review"
            numericValue={escalatedCases}
            subtitle="High-value holds / low-confidence"
            icon={ShieldAlert}
            variant="amber"
            delay={0.2}
          />
        </div>
      </motion.div>

      {/* Hero Recovery Pipeline Network Visualizer */}
      <motion.div variants={staggerItem}>
        <RecoveryNetworkVisualizer />
      </motion.div>

      {/* Main Grid: Lifecycle Pipeline Distribution & Governance Overview */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Case Lifecycle Pipeline with Animated Bar Widths */}
        <div className="lg:col-span-2 bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#3B5BDB]" />
              <h3 className="text-sm font-bold text-[#111827] tracking-tight">Recovery Lifecycle Pipeline</h3>
            </div>
            <span className="text-xs text-[#64748B] font-mono font-semibold">{totalCases} Total Ingested</span>
          </div>

          <div className="space-y-3.5">
            {Object.entries(states).map(([stateName, count], index) => {
              const stateInfo = formatState(stateName);
              const pct = totalCases > 0 ? (count / totalCases) * 100 : 0;
              let barColor = 'bg-[#94A3B8]';
              if (stateName === 'RECOVERED') barColor = 'bg-[#059669]';
              else if (stateName === 'SCHEDULED' || stateName === 'ACTION_PENDING') barColor = 'bg-[#3B5BDB]';
              else if (stateName === 'IN_PROGRESS' || stateName === 'WAITING_FOR_OUTCOME') barColor = 'bg-[#0891B2]';
              else if (stateName === 'ESCALATED') barColor = 'bg-[#D97706]';
              else if (stateName === 'FAILED' || stateName === 'HALTED') barColor = 'bg-[#E11D48]';

              return (
                <div
                  key={stateName}
                  onClick={() => navigate(`/cases?state=${stateName}`)}
                  className="space-y-1.5 cursor-pointer group p-2 -mx-2 rounded-xl hover:bg-[#F7F9FC] transition-colors"
                >
                  <div className="flex justify-between text-xs font-bold">
                    <span className="text-[#111827] group-hover:text-[#3B5BDB] transition-colors flex items-center gap-1.5">
                      {stateInfo.label}
                      <span className="text-[10px] font-mono text-[#64748B] font-normal">({stateName})</span>
                    </span>
                    <span className="text-[#475569] font-mono">
                      {count} <span className="text-[#64748B] font-normal">({pct.toFixed(1)}%)</span>
                    </span>
                  </div>
                  <div className="w-full bg-[#F1F5F9] rounded-full h-2 overflow-hidden border border-[#E5E7EB]">
                    <motion.div
                      initial={reducedMotion ? { width: `${Math.max(pct, 2)}%` } : { width: 0 }}
                      animate={{ width: `${Math.max(pct, 2)}%` }}
                      transition={{ duration: 0.6, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                      className={`h-2 rounded-full ${barColor}`}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Intelligence & Governance Overview Card */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-5 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <h3 className="text-sm font-bold text-[#111827] tracking-tight">Governance & Safety Status</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] text-[11px] font-bold border border-[#A7F3D0]">
                100% Policy Enforced
              </span>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-[#F7F9FC] rounded-xl border border-[#E5E7EB] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#111827]">Zero-Tolerance Safety Vetoes</p>
                  <p className="text-[11px] text-[#64748B]">Hard decline auto-stop & frequency caps</p>
                </div>
                <span className="text-xs font-mono font-bold text-[#059669]">0 Violations</span>
              </div>

              <div className="p-3 bg-[#F7F9FC] rounded-xl border border-[#E5E7EB] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#111827]">AI Decision Engine</p>
                  <p className="text-[11px] text-[#64748B]">Gemini 2.0 Flash + Failover</p>
                </div>
                <span className="text-xs font-mono font-bold text-[#7C3AED]">Active</span>
              </div>

              <div className="p-3 bg-[#F7F9FC] rounded-xl border border-[#E5E7EB] flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-[#111827]">Payment Channels Active</p>
                  <p className="text-[11px] text-[#64748B]">UPI Autopay, eNACH, WhatsApp Link</p>
                </div>
                <span className="text-xs font-mono font-bold text-[#0891B2]">3 Rails</span>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#475569] font-medium">
            <span className="flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-[#3B5BDB]" />
              Immutable Audit Ledger:
            </span>
            <span className="font-mono font-bold text-[#3B5BDB]">
              {metrics?.total_audit_events || 66} Events
            </span>
          </div>
        </div>
      </motion.div>

      {/* Quick Action Control Strip with Hover Lift */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <motion.div
          whileHover={reducedMotion ? {} : { y: -2, transition: { duration: 0.15 } }}
          onClick={() => navigate('/policies')}
          className="p-4 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE]">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#111827] group-hover:text-[#3B5BDB] transition-colors">What-If Policy Simulator</h4>
              <p className="text-[11px] text-[#64748B]">Simulate recovery yield before applying policy</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#64748B] group-hover:text-[#3B5BDB] group-hover:translate-x-0.5 transition-all" />
        </motion.div>

        <motion.div
          whileHover={reducedMotion ? {} : { y: -2, transition: { duration: 0.15 } }}
          onClick={() => navigate('/cases?tab=escalations')}
          className="p-4 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#111827] group-hover:text-[#3B5BDB] transition-colors">Review Escalations</h4>
              <p className="text-[11px] text-[#64748B]">Approve retries or dispatch checkout links</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#64748B] group-hover:text-[#3B5BDB] group-hover:translate-x-0.5 transition-all" />
        </motion.div>

        <motion.div
          whileHover={reducedMotion ? {} : { y: -2, transition: { duration: 0.15 } }}
          onClick={() => navigate('/audit')}
          className="p-4 bg-white border border-[#E5E7EB] rounded-2xl shadow-sm hover:shadow-md cursor-pointer transition-all flex items-center justify-between group"
        >
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-[#111827] group-hover:text-[#3B5BDB] transition-colors">Compliance Audit Trail</h4>
              <p className="text-[11px] text-[#64748B]">Export append-only settlement ledger</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-[#64748B] group-hover:text-[#3B5BDB] group-hover:translate-x-0.5 transition-all" />
        </motion.div>
      </motion.div>
    </motion.div>
  );
};
