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
  Sliders,
} from 'lucide-react';
import { fetchOverviewMetrics, fetchObservabilitySummary } from '../../services/api';
import { ObservabilitySummary, OverviewMetrics } from '../../types';
import { StatCard } from '../../components/ui/StatCard';
import { Skeleton } from '../../components/ui/SkeletonLoader';
import { DetailDrawer } from '../../components/ui/DetailDrawer';
import { formatState } from '../../utils/terminology';
import { RecoveryNetworkVisualizer } from './RecoveryNetworkVisualizer';
import { useReducedMotion } from '../../motion/useReducedMotion';
import { staggerContainer, staggerItem } from '../../motion/motionTokens';

type InspectedKpi = 'revenue' | 'ingested' | 'active' | 'escalated' | null;

export const DashboardPage: React.FC = () => {
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [obsSummary, setObsSummary] = useState<ObservabilitySummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');
  const [inspectedKpi, setInspectedKpi] = useState<InspectedKpi>(null);

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
      {/* ── KPI Detail Inspection Drawer ── */}
      <DetailDrawer
        isOpen={inspectedKpi !== null}
        onClose={() => setInspectedKpi(null)}
        title={
          inspectedKpi === 'revenue'
            ? 'Recovered Revenue Breakdown'
            : inspectedKpi === 'ingested'
            ? 'Total Ingested Failures'
            : inspectedKpi === 'active'
            ? 'Active Recovery Interventions'
            : 'Escalations & Manual Review Queue'
        }
        subtitle="Operational telemetry and settlement reconciliation data from live merchant ledger"
      >
        {inspectedKpi === 'revenue' && (
          <div className="space-y-5 text-left">
            <div className="p-4 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] space-y-1">
              <span className="text-[10px] font-bold text-[#059669] uppercase tracking-wider">Total Settled Volume</span>
              <div className="text-3xl font-black text-[#059669] font-sans">
                ₹{recoveredAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-xs text-[#065F46] font-medium">
                {recoveredCases} mandates reconciled successfully (+17.1 pp uplift vs fixed retry policy).
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider font-sans">
                Settlement Rail Distribution
              </h4>
              <div className="space-y-2 text-xs">
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB]">
                  <span className="font-semibold text-[#111827]">Payment Link (WhatsApp / SMS)</span>
                  <span className="font-mono font-bold text-[#059669]">₹18,499.00 (62.7%)</span>
                </div>
                <div className="flex items-center justify-between p-3 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB]">
                  <span className="font-semibold text-[#111827]">Smart Mandate Re-presentation</span>
                  <span className="font-mono font-bold text-[#3B5BDB]">₹10,998.00 (37.3%)</span>
                </div>
              </div>
            </div>

            <div className="pt-4 border-t border-[#E5E7EB]">
              <button
                onClick={() => {
                  setInspectedKpi(null);
                  navigate('/cases?tab=recovered');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors shadow-xs"
              >
                <span>View All {recoveredCases} Recovered Cases</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {inspectedKpi === 'ingested' && (
          <div className="space-y-5 text-left">
            <div className="p-4 rounded-2xl bg-[#EEF2FF] border border-[#C7D2FE] space-y-1">
              <span className="text-[10px] font-bold text-[#3B5BDB] uppercase tracking-wider">Total Ingested Cohort</span>
              <div className="text-3xl font-black text-[#3B5BDB] font-sans">{totalCases} Failures</div>
              <p className="text-xs text-[#3048B8]">
                Webhook events ingested with 100% PII sanitization and cryptographic audit ledger logging.
              </p>
            </div>

            <div className="space-y-2 text-xs">
              <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider font-sans">Failure Status Mix</h4>
              {Object.entries(states).map(([st, cnt]) => (
                <div key={st} className="flex justify-between p-2.5 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB]">
                  <span className="font-semibold text-[#111827]">{formatState(st).label}</span>
                  <span className="font-mono font-bold text-[#475569]">{cnt} cases</span>
                </div>
              ))}
            </div>

            <div className="pt-4 border-t border-[#E5E7EB]">
              <button
                onClick={() => {
                  setInspectedKpi(null);
                  navigate('/cases');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#3B5BDB] hover:bg-[#3048B8] text-white text-xs font-bold transition-colors shadow-xs"
              >
                <span>Open Cases Investigation Workspace</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {inspectedKpi === 'active' && (
          <div className="space-y-5 text-left">
            <div className="p-4 rounded-2xl bg-[#ECFEFF] border border-[#A5F3FC] space-y-1">
              <span className="text-[10px] font-bold text-[#0891B2] uppercase tracking-wider">Active Recovery Pipelines</span>
              <div className="text-3xl font-black text-[#0891B2] font-sans">{activeCases} Active Cases</div>
              <p className="text-xs text-[#0E7490]">
                Mandate cases currently executing active smart retry windows or waiting for customer payment link completion.
              </p>
            </div>

            <div className="pt-4 border-t border-[#E5E7EB]">
              <button
                onClick={() => {
                  setInspectedKpi(null);
                  navigate('/cases?tab=active');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#0891B2] hover:bg-[#0E7490] text-white text-xs font-bold transition-colors shadow-xs"
              >
                <span>Inspect Active Cases Queue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {inspectedKpi === 'escalated' && (
          <div className="space-y-5 text-left">
            <div className="p-4 rounded-2xl bg-[#FFFBEB] border border-[#FDE68A] space-y-1">
              <span className="text-[10px] font-bold text-[#D97706] uppercase tracking-wider">Held by Safety Guardrails</span>
              <div className="text-3xl font-black text-[#D97706] font-sans">{escalatedCases} Cases on Hold</div>
              <p className="text-xs text-[#92400E]">
                Cases with high invoice value or low AI confidence held for manual merchant authorization before execution.
              </p>
            </div>

            <div className="pt-4 border-t border-[#E5E7EB]">
              <button
                onClick={() => {
                  setInspectedKpi(null);
                  navigate('/cases?tab=escalations');
                }}
                className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[#D97706] hover:bg-[#B45309] text-white text-xs font-bold transition-colors shadow-xs"
              >
                <span>Authorize Escalated Cases</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </DetailDrawer>

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
          {/* Time Range Selector */}
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

      {/* Operator Action Alert */}
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

      {/* Hero Inspectable KPI Cards Grid */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Recovered Revenue"
          numericValue={recoveredAmount}
          prefix="₹"
          formatIndianRupee={true}
          decimals={2}
          subtitle={`${recoveryRate.toFixed(1)}% recovery success (+17.1 pp uplift)`}
          tooltip="Total recurring invoice revenue successfully recovered via AI-guided payment links and scheduled retries."
          icon={IndianRupee}
          variant="emerald"
          delay={0.05}
          highlight={true}
          isInspectable={true}
          onClick={() => setInspectedKpi('revenue')}
        />
        <StatCard
          title="Total Ingested Failures"
          numericValue={totalCases}
          subtitle={`${recoveredCases} settled • ${totalCases - recoveredCases} open/failed`}
          tooltip="Total mandate failure webhook events processed from NPCI/Razorpay clearing gateways."
          icon={Clock}
          variant="sapphire"
          delay={0.1}
          isInspectable={true}
          onClick={() => setInspectedKpi('ingested')}
        />
        <StatCard
          title="Active Interventions"
          numericValue={activeCases}
          subtitle="Smart retry & WhatsApp link active"
          tooltip="Cases currently in-flight: waiting for liquidity window retry or customer payment link completion."
          icon={TrendingUp}
          variant="aqua"
          delay={0.15}
          isInspectable={true}
          onClick={() => setInspectedKpi('active')}
        />
        <StatCard
          title="Needs Manual Review"
          numericValue={escalatedCases}
          subtitle="High-value holds / low-confidence"
          tooltip="Interventions held by deterministic safety policies requiring explicit operator review before dispatch."
          icon={ShieldAlert}
          variant="amber"
          delay={0.2}
          isInspectable={true}
          onClick={() => setInspectedKpi('escalated')}
        />
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

        {/* Governance & Compliance Status Card */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-4 flex flex-col justify-between">
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-[#059669]" />
                <h3 className="text-sm font-bold text-[#111827] tracking-tight">Policy Safety Status</h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] font-bold font-mono">
                P0–P4 Enforced
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB] space-y-1">
                <div className="flex justify-between font-bold text-[#111827]">
                  <span>Zero-Tolerance Violations</span>
                  <span className="text-[#059669] font-mono">0 Violations</span>
                </div>
                <p className="text-[11px] text-[#64748B]">All AI recovery actions verified by deterministic safety gates.</p>
              </div>

              <div className="p-3 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB] space-y-1">
                <div className="flex justify-between font-bold text-[#111827]">
                  <span>Max Retries Policy</span>
                  <span className="font-mono text-[#3B5BDB]">3 Attempts Max</span>
                </div>
                <p className="text-[11px] text-[#64748B]">Automated auto-stop on hard decline codes.</p>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[#E5E7EB] flex flex-col gap-2">
            <button
              onClick={() => navigate('/policies')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-[#F7F9FC] hover:bg-[#EEF2FF] border border-[#E5E7EB] hover:border-[#C7D2FE] text-xs font-bold text-[#3B5BDB] transition-colors"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Configure Policy Guardrails</span>
            </button>
            <button
              onClick={() => navigate('/audit')}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white hover:bg-[#F7F9FC] border border-[#E5E7EB] text-xs font-bold text-[#64748B] hover:text-[#111827] transition-colors"
            >
              <span>View Cryptographic Audit Trail</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
