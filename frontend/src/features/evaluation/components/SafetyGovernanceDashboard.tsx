import React from 'react';
import { ShieldCheck, ShieldAlert, AlertOctagon, CheckCircle2, XCircle, Info } from 'lucide-react';
import { SafetyMetricsType } from '../../../types';

interface SafetyGovernanceDashboardProps {
  safetyMetrics: SafetyMetricsType;
  modeName: string;
}

interface GuardrailConfig {
  id: keyof Omit<SafetyMetricsType, 'total_policy_violations'>;
  title: string;
  description: string;
  ruleCode: string;
}

const GUARDRAILS: GuardrailConfig[] = [
  {
    id: 'hard_decline_safety_rate',
    title: 'Hard Decline Auto-Stop Veto',
    description: 'Enforces immediate STOP and halts retry cycle on terminal bank failure codes (e.g. stolen card, closed account)',
    ruleCode: 'P0 GUARDRAIL',
  },
  {
    id: 'retry_cap_safety_rate',
    title: 'Max Retries Cap Enforcement',
    description: 'Enforces hard ceiling on recovery attempts per case to prevent endless retry loops and bank penalties',
    ruleCode: 'P1 GUARDRAIL',
  },
  {
    id: 'recovery_window_enforcement_rate',
    title: 'Recovery Window Expiration',
    description: 'Stops recovery checks when case age exceeds merchant-defined recovery window period (e.g. 14 days)',
    ruleCode: 'P2A GUARDRAIL',
  },
  {
    id: 'high_value_escalation_compliance',
    title: 'High-Value Escalation Policy',
    description: 'Routes payments above merchant threshold to manual ops review instead of automated direct retries',
    ruleCode: 'P2B GUARDRAIL',
  },
  {
    id: 'low_confidence_veto_rate',
    title: 'Low-Confidence AI Veto',
    description: 'Blocks automated recovery action and flags for observation when AI model confidence is below threshold',
    ruleCode: 'P3A GUARDRAIL',
  },
  {
    id: 'contact_cap_enforcement_rate',
    title: 'Customer Contact Cap',
    description: 'Enforces anti-harassment limit on customer payment link notifications per billing cycle',
    ruleCode: 'P3B GUARDRAIL',
  },
];

export const SafetyGovernanceDashboard: React.FC<SafetyGovernanceDashboardProps> = ({
  safetyMetrics,
  modeName,
}) => {
  const isZeroViolations = safetyMetrics.total_policy_violations === 0;

  return (
    <div className="space-y-6">
      {/* Governance Banner */}
      <div
        className={`p-4 rounded-2xl border backdrop-blur-md flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 ${
          isZeroViolations
            ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
            : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              isZeroViolations
                ? 'bg-emerald-950 border-emerald-700 text-emerald-400'
                : 'bg-rose-950 border-rose-700 text-rose-400'
            }`}
          >
            {isZeroViolations ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black text-white">
                {isZeroViolations ? 'Zero-Tolerance Policy Safety Certified' : 'CRITICAL GOVERNANCE BREACH DETECTED'}
              </h3>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                  isZeroViolations
                    ? 'bg-emerald-950 text-emerald-300 border-emerald-700'
                    : 'bg-rose-950 text-rose-300 border-rose-700'
                }`}
              >
                {isZeroViolations ? 'PASSED (0 VIOLATIONS)' : `${safetyMetrics.total_policy_violations} VIOLATIONS`}
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-0.5">
              Evaluation mode: <span className="font-semibold text-white">{modeName}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs font-semibold px-3 py-1.5 rounded-xl bg-slate-900/80 border border-slate-800 text-slate-300">
          <Info className="w-4 h-4 text-indigo-400" />
          <span>Core Invariant: High Recovery Rate ≠ Safe System</span>
        </div>
      </div>

      {/* 6 Zero-Tolerance Guardrails Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {GUARDRAILS.map((g) => {
          const rate = safetyMetrics[g.id];
          const ratePct = (rate * 100).toFixed(1);
          const isPassed = rate >= 1.0;
          const isWarning = rate >= 0.90 && rate < 1.0;

          return (
            <div
              key={String(g.id)}
              className={`rounded-2xl p-4 border transition-all ${
                isPassed
                  ? 'bg-slate-900/60 border-slate-800/80'
                  : 'bg-rose-950/20 border-rose-900/60 shadow-[0_0_15px_rgba(244,63,94,0.1)]'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-[9px] font-bold px-2 py-0.5 rounded bg-slate-950 text-indigo-300 border border-slate-800">
                  {g.ruleCode}
                </span>
                {isPassed ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 100% PASS
                  </span>
                ) : isWarning ? (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-amber-400">
                    <AlertOctagon className="w-3.5 h-3.5" /> WARNING
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400">
                    <XCircle className="w-3.5 h-3.5" /> FAILED
                  </span>
                )}
              </div>

              <h4 className="text-sm font-bold text-white mt-2.5">{g.title}</h4>
              <p className="text-xs text-slate-400 mt-1 min-h-[36px]">{g.description}</p>

              <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between">
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                  Enforcement Rate
                </div>
                <div
                  className={`text-base font-black font-mono ${
                    isPassed ? 'text-emerald-400' : 'text-rose-400'
                  }`}
                >
                  {ratePct}%
                </div>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 rounded-full bg-slate-800 mt-2 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    isPassed ? 'bg-emerald-500' : 'bg-rose-500'
                  }`}
                  style={{ width: `${Math.min(rate * 100, 100)}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
