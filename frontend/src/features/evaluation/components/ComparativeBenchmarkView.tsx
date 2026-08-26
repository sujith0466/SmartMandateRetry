import React from 'react';
import { ShieldCheck, AlertTriangle, XCircle, Award, CheckCircle2 } from 'lucide-react';
import { BenchmarkMetricsType } from '../../../types';

interface ComparativeBenchmarkViewProps {
  modeMetrics: Record<string, BenchmarkMetricsType>;
  baselineRecoveryRate: number;
}

interface ModeConfig {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  description: string;
  isSut?: boolean;
}

const MODES: ModeConfig[] = [
  {
    id: 'SMART_MANDATE',
    name: 'SmartMandateRetry',
    badge: 'SYSTEM UNDER TEST',
    badgeColor: 'bg-indigo-950 text-indigo-300 border-indigo-700/80',
    description: 'Deterministic P0–P4 policy safety gates with customer-aware recovery selection',
    isSut: true,
  },
  {
    id: 'RAZORPAY_NATIVE',
    name: 'Razorpay Native',
    badge: 'BASELINE A',
    badgeColor: 'bg-blue-950 text-blue-300 border-blue-800/80',
    description: 'Standard 3-retry naive fixed schedule blindly executed on all active errors',
  },
  {
    id: 'RULE_BASED',
    name: 'Rule-Based Heuristic',
    badge: 'BASELINE B',
    badgeColor: 'bg-amber-950 text-amber-300 border-amber-800/80',
    description: 'Static 48-hour single retry rule for recoverable errors, stopping thereafter',
  },
  {
    id: 'AI_UNGUARDED',
    name: 'AI Unguarded (Ablation)',
    badge: 'ABLATION CONTROL',
    badgeColor: 'bg-rose-950 text-rose-300 border-rose-800/80',
    description: 'Raw LLM recommendations bypassing all merchant policy caps and safety gates',
  },
];

export const ComparativeBenchmarkView: React.FC<ComparativeBenchmarkViewProps> = ({
  modeMetrics,
  baselineRecoveryRate,
}) => {
  return (
    <div className="space-y-6">
      {/* Comparative Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {MODES.map((mode) => {
          const m = modeMetrics[mode.id];
          const accuracy = m ? (m.label_accuracy * 100).toFixed(1) : '--';
          const recoveryRate = m ? (m.simulated_recovery_rate * 100).toFixed(1) : '--';
          const violations = m?.safety_metrics.total_policy_violations ?? 0;
          const isSafe = violations === 0;

          return (
            <div
              key={mode.id}
              className={`rounded-2xl p-5 border transition-all ${
                mode.isSut
                  ? 'bg-gradient-to-b from-indigo-950/40 to-slate-900/90 border-indigo-500/60 shadow-[0_0_25px_rgba(99,102,241,0.15)] ring-1 ring-indigo-500/30'
                  : 'bg-slate-900/60 border-slate-800/80'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded border ${mode.badgeColor}`}>
                  {mode.badge}
                </span>
                {isSafe ? (
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Safe
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400">
                    <XCircle className="w-3.5 h-3.5" /> {violations} Violations
                  </span>
                )}
              </div>

              <h3 className="text-base font-black text-white mt-3 flex items-center gap-1.5">
                {mode.name}
                {mode.isSut && <Award className="w-4 h-4 text-amber-400" />}
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 line-clamp-2 min-h-[32px]">{mode.description}</p>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-slate-800/80">
                <div>
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Accuracy</div>
                  <div className="text-lg font-black text-white mt-0.5">{accuracy}%</div>
                </div>
                <div>
                  <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Recovery Rate</div>
                  <div className="text-lg font-black text-emerald-400 mt-0.5">{recoveryRate}%</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Comparative Metric Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800/80 flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-white">Comparative Benchmark Performance Matrix</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Empirical decision accuracy, recovery efficiency, and safety compliance across all 4 modes
            </p>
          </div>
          <div className="text-xs font-semibold text-slate-400">
            Baseline Reference: <span className="text-blue-400">{(baselineRecoveryRate * 100).toFixed(1)}%</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/60 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-800/80">
              <tr>
                <th className="py-3.5 px-4">Evaluation Mode</th>
                <th className="py-3.5 px-4 text-right">Label Acc</th>
                <th className="py-3.5 px-4 text-right">Policy Acc</th>
                <th className="py-3.5 px-4 text-right">Action Acc</th>
                <th className="py-3.5 px-4 text-right">Macro F1</th>
                <th className="py-3.5 px-4 text-right">Recovery Rate</th>
                <th className="py-3.5 px-4 text-right">Recovery Uplift</th>
                <th className="py-3.5 px-4 text-center">Safety Violations</th>
                <th className="py-3.5 px-4 text-center">Governance Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {MODES.map((mode) => {
                const m = modeMetrics[mode.id];
                if (!m) return null;

                const labelAcc = (m.label_accuracy * 100).toFixed(2);
                const polAcc = (m.policy_outcome_accuracy * 100).toFixed(2);
                const actAcc = (m.final_action_accuracy * 100).toFixed(2);
                const macroF1 = m.macro_f1.toFixed(4);
                const recRate = (m.simulated_recovery_rate * 100).toFixed(2);
                const uplift = m.recovery_uplift_pp !== null && m.recovery_uplift_pp !== undefined
                  ? `${m.recovery_uplift_pp >= 0 ? '+' : ''}${m.recovery_uplift_pp.toFixed(2)} pp`
                  : '0.00 pp (Ref)';
                const violations = m.safety_metrics.total_policy_violations;

                return (
                  <tr
                    key={mode.id}
                    className={`hover:bg-slate-800/30 transition-colors ${
                      mode.isSut ? 'bg-indigo-950/20 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold">{mode.name}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border ${mode.badgeColor}`}>
                          {mode.badge}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-white">{labelAcc}%</td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-300">{polAcc}%</td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-300">{actAcc}%</td>
                    <td className="py-3.5 px-4 text-right font-mono text-slate-300">{macroF1}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-emerald-400 font-bold">{recRate}%</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold">
                      <span className={m.recovery_uplift_pp && m.recovery_uplift_pp > 0 ? 'text-emerald-400' : 'text-slate-400'}>
                        {uplift}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded font-mono text-xs font-bold ${
                          violations === 0
                            ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                            : 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
                        }`}
                      >
                        {violations}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {violations === 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                          <ShieldCheck className="w-3.5 h-3.5" /> PASSED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400">
                          <AlertTriangle className="w-3.5 h-3.5" /> REJECTED
                        </span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
