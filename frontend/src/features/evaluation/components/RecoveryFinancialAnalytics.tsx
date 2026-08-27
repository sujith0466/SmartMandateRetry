import React from 'react';
import { IndianRupee, TrendingUp, Zap, AlertCircle, ArrowUpRight } from 'lucide-react';
import { BenchmarkMetricsType } from '../../../types';

interface RecoveryFinancialAnalyticsProps {
  metrics: BenchmarkMetricsType;
  modeName: string;
}

function formatINR(val: string | number | undefined): string {
  if (val === undefined || val === null) return '₹0';
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(num);
}

export const RecoveryFinancialAnalytics: React.FC<RecoveryFinancialAnalyticsProps> = ({
  metrics,
  modeName,
}) => {
  const recoveredRev = metrics.simulated_recovered_revenue_inr;
  const totalRev = metrics.total_at_risk_revenue_inr;
  const revRecoveryPct = (metrics.revenue_recovery_rate * 100).toFixed(1);
  const wastedRatePct = (metrics.wasted_action_rate * 100).toFixed(1);
  const efficiency = metrics.intervention_efficiency.toFixed(2);
  const uplift = metrics.recovery_uplift_pp;

  return (
    <div className="space-y-6">
      {/* Financial KPIs Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white/90 backdrop-blur-md border border-[#E5E7EB] p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-bold uppercase tracking-wider font-sans">Recovered Revenue</span>
            <div className="p-1.5 rounded-lg bg-[#ECFDF5] text-[#059669]">
              <IndianRupee className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-[#059669] mt-2">
            {formatINR(recoveredRev)}
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            of {formatINR(totalRev)} total at-risk revenue ({revRecoveryPct}%)
          </p>
        </div>

        <div className="rounded-2xl bg-white/90 backdrop-blur-md border border-[#E5E7EB] p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-bold uppercase tracking-wider font-sans">Recovery Uplift</span>
            <div className="p-1.5 rounded-lg bg-[#ECFEFF] text-[#0891B2]">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-[#0891B2] mt-2 flex items-center gap-1">
            {uplift !== null && uplift !== undefined ? (
              <>
                <ArrowUpRight className="w-5 h-5" />
                {uplift >= 0 ? '+' : ''}{uplift.toFixed(2)} pp
              </>
            ) : (
              '0.00 pp (Ref)'
            )}
          </div>
          <p className="text-xs text-[#64748B] mt-1">vs Razorpay Native naive baseline</p>
        </div>

        <div className="rounded-2xl bg-white/90 backdrop-blur-md border border-[#E5E7EB] p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-bold uppercase tracking-wider font-sans">Intervention Efficiency</span>
            <div className="p-1.5 rounded-lg bg-[#FFFBEB] text-[#D97706]">
              <Zap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black font-mono text-[#111827] mt-2">
            {efficiency}
          </div>
          <p className="text-xs text-[#64748B] mt-1">Recovered cases per dispatched action</p>
        </div>

        <div className="rounded-2xl bg-white/90 backdrop-blur-md border border-[#E5E7EB] p-5 shadow-xs">
          <div className="flex items-center justify-between text-[#64748B]">
            <span className="text-xs font-bold uppercase tracking-wider font-sans">Wasted Action Rate</span>
            <div className={`p-1.5 rounded-lg ${metrics.wasted_action_rate > 0 ? 'bg-[#FFF1F2] text-[#E11D48]' : 'bg-[#ECFDF5] text-[#059669]'}`}>
              <AlertCircle className="w-4 h-4" />
            </div>
          </div>
          <div
            className={`text-2xl font-black font-mono mt-2 ${
              metrics.wasted_action_rate > 0 ? 'text-[#E11D48]' : 'text-[#059669]'
            }`}
          >
            {wastedRatePct}%
          </div>
          <p className="text-xs text-[#64748B] mt-1">Wasted retry attempts on hard declines</p>
        </div>
      </div>

      {/* Revenue Progress Breakdown */}
      <div className="rounded-2xl bg-white/90 backdrop-blur-md border border-[#E5E7EB] p-5 shadow-xs space-y-4">
        <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider font-sans">
          Revenue Recovery Distribution ({modeName})
        </h4>

        <div className="w-full h-3 rounded-full bg-[#F1F5F9] overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-[#059669] to-[#0D9488]"
            style={{ width: `${Math.min(parseFloat(revRecoveryPct) || 0, 100)}%` }}
            title={`Recovered: ${revRecoveryPct}%`}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-[#64748B]">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#059669] inline-block" />
            <span>Recovered Revenue: <strong className="text-[#111827]">{formatINR(recoveredRev)}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#94A3B8] inline-block" />
            <span>Unrecovered / Terminated: <strong className="text-[#111827]">{formatINR(typeof totalRev === 'number' && typeof recoveredRev === 'number' ? totalRev - recoveredRev : '--')}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
