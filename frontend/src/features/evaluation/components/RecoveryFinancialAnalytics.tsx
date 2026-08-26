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
        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Recovered Revenue</span>
            <IndianRupee className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400 mt-2">
            {formatINR(recoveredRev)}
          </div>
          <p className="text-xs text-slate-400 mt-1">
            of {formatINR(totalRev)} total at-risk revenue ({revRecoveryPct}%)
          </p>
        </div>

        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Recovery Uplift</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-black font-mono text-cyan-400 mt-2 flex items-center gap-1">
            {uplift !== null && uplift !== undefined ? (
              <>
                <ArrowUpRight className="w-5 h-5" />
                {uplift >= 0 ? '+' : ''}{uplift.toFixed(2)} pp
              </>
            ) : (
              '0.00 pp (Ref)'
            )}
          </div>
          <p className="text-xs text-slate-400 mt-1">vs Razorpay Native naive baseline</p>
        </div>

        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Intervention Efficiency</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-black font-mono text-white mt-2">
            {efficiency}
          </div>
          <p className="text-xs text-slate-400 mt-1">Recovered cases per dispatched action</p>
        </div>

        <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 shadow-xl">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-bold uppercase tracking-wider">Wasted Action Rate</span>
            <AlertCircle className={`w-4 h-4 ${metrics.wasted_action_rate > 0 ? 'text-rose-400' : 'text-emerald-400'}`} />
          </div>
          <div
            className={`text-2xl font-black font-mono mt-2 ${
              metrics.wasted_action_rate > 0 ? 'text-rose-400' : 'text-emerald-400'
            }`}
          >
            {wastedRatePct}%
          </div>
          <p className="text-xs text-slate-400 mt-1">Wasted retry attempts on hard declines</p>
        </div>
      </div>

      {/* Revenue Progress Breakdown */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 shadow-xl space-y-4">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Revenue Recovery Distribution ({modeName})
        </h4>

        <div className="w-full h-3 rounded-full bg-slate-800 overflow-hidden flex">
          <div
            className="h-full bg-gradient-to-r from-emerald-500 to-teal-400"
            style={{ width: `${Math.min(parseFloat(revRecoveryPct) || 0, 100)}%` }}
            title={`Recovered: ${revRecoveryPct}%`}
          />
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 inline-block" />
            <span>Recovered Revenue: <strong className="text-white">{formatINR(recoveredRev)}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block" />
            <span>Unrecovered / Terminated: <strong className="text-white">{formatINR(typeof totalRev === 'number' && typeof recoveredRev === 'number' ? totalRev - recoveredRev : '--')}</strong></span>
          </div>
        </div>
      </div>
    </div>
  );
};
