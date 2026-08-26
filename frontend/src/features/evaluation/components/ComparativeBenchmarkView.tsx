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
    badgeColor: 'bg-[#EEF2FF] text-[#3B5BDB] border-[#C7D2FE]',
    description: 'Deterministic P0–P4 policy safety gates with customer-aware recovery selection',
    isSut: true,
  },
  {
    id: 'RAZORPAY_NATIVE',
    name: 'Razorpay Native',
    badge: 'BASELINE A',
    badgeColor: 'bg-[#ECFEFF] text-[#0891B2] border-[#A5F3FC]',
    description: 'Standard 3-retry naive fixed schedule blindly executed on all active errors',
  },
  {
    id: 'RULE_BASED',
    name: 'Rule-Based Heuristic',
    badge: 'BASELINE B',
    badgeColor: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]',
    description: 'Static 48-hour single retry rule for recoverable errors, stopping thereafter',
  },
  {
    id: 'AI_UNGUARDED',
    name: 'AI Unguarded (Ablation)',
    badge: 'ABLATION CONTROL',
    badgeColor: 'bg-[#FFF1F2] text-[#E11D48] border-[#FECDD3]',
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
                  ? 'bg-white border-[#C7D2FE] shadow-md ring-2 ring-[#EEF2FF]'
                  : 'bg-white border-[#E5E7EB] shadow-sm'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${mode.badgeColor}`}>
                  {mode.badge}
                </span>
                {isSafe ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-[#059669]">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Safe
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-[#E11D48]">
                    <XCircle className="w-3.5 h-3.5" /> {violations} Violations
                  </span>
                )}
              </div>

              <h3 className="text-base font-black text-[#111827] mt-3 flex items-center gap-1.5 font-sans">
                {mode.name}
                {mode.isSut && <Award className="w-4 h-4 text-[#D97706]" />}
              </h3>
              <p className="text-[11px] text-[#64748B] mt-1 line-clamp-2 min-h-[32px]">{mode.description}</p>

              <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t border-[#E5E7EB]">
                <div>
                  <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Accuracy</div>
                  <div className="text-lg font-black text-[#111827] mt-0.5 font-mono">{accuracy}%</div>
                </div>
                <div>
                  <div className="text-[10px] font-bold text-[#64748B] uppercase tracking-wider">Recovery Rate</div>
                  <div className="text-lg font-black text-[#059669] mt-0.5 font-mono">{recoveryRate}%</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Full Comparative Metric Table */}
      <div className="rounded-2xl bg-white border border-[#E5E7EB] overflow-hidden shadow-sm">
        <div className="p-4.5 bg-[#F7F9FC] border-b border-[#E5E7EB] flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[#111827] font-sans">Comparative Benchmark Performance Matrix</h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Empirical decision accuracy, recovery efficiency, and safety compliance across all 4 modes
            </p>
          </div>
          <div className="text-xs font-bold text-[#64748B]">
            Baseline Reference: <span className="text-[#3B5BDB] font-mono">{(baselineRecoveryRate * 100).toFixed(1)}%</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F7F9FC] text-[#64748B] text-[10px] font-extrabold uppercase tracking-wider border-b border-[#E5E7EB]">
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
            <tbody className="divide-y divide-[#E5E7EB] font-medium text-[#475569]">
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
                    className={`hover:bg-[#F7F9FC] transition-colors ${
                      mode.isSut ? 'bg-[#EEF2FF]/40 font-semibold' : ''
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2">
                        <span className="text-[#111827] font-bold">{mode.name}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border ${mode.badgeColor}`}>
                          {mode.badge}
                        </span>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-[#111827] font-bold">{labelAcc}%</td>
                    <td className="py-3.5 px-4 text-right font-mono text-[#475569]">{polAcc}%</td>
                    <td className="py-3.5 px-4 text-right font-mono text-[#475569]">{actAcc}%</td>
                    <td className="py-3.5 px-4 text-right font-mono text-[#475569]">{macroF1}</td>
                    <td className="py-3.5 px-4 text-right font-mono text-[#059669] font-bold">{recRate}%</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold">
                      <span className={m.recovery_uplift_pp && m.recovery_uplift_pp > 0 ? 'text-[#059669]' : 'text-[#64748B]'}>
                        {uplift}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full font-mono text-xs font-bold ${
                          violations === 0
                            ? 'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                            : 'bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3]'
                        }`}
                      >
                        {violations}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      {violations === 0 ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#059669]">
                          <ShieldCheck className="w-3.5 h-3.5" /> PASSED
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E11D48]">
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
