import React, { useEffect, useState } from 'react';
import { ShieldCheck, ShieldAlert, Cpu, Sparkles, AlertTriangle, Scale, ArrowRight } from 'lucide-react';
import { DecisionAttributionResponse } from '../../types';
import { fetchCaseExplainability } from '../../services/api';

interface DecisionAttributionCardProps {
  caseId: string;
}

export const DecisionAttributionCard: React.FC<DecisionAttributionCardProps> = ({ caseId }) => {
  const [attribution, setAttribution] = useState<DecisionAttributionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    fetchCaseExplainability(caseId)
      .then((data) => {
        if (isMounted) {
          setAttribution(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err?.message || 'Failed to load explainability breakdown');
          setLoading(false);
        }
      });
    return () => {
      isMounted = false;
    };
  }, [caseId]);

  if (loading) {
    return (
      <div className="glass-panel border-slate-800/80 rounded-2xl p-5 animate-pulse space-y-3">
        <div className="h-4 bg-slate-800 rounded w-1/3"></div>
        <div className="h-20 bg-slate-800/50 rounded-xl"></div>
      </div>
    );
  }

  if (error || !attribution) {
    return null; // Gracefully hide if explainability is unavailable
  }

  const isBlocked = attribution.policy_status === 'BLOCKED';
  const isModified = attribution.policy_status === 'MODIFIED';

  return (
    <div className="glass-panel border-slate-800/80 rounded-2xl p-5 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              Decision Explainability & Factor Attribution
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono">
                {attribution.governing_authority}
              </span>
            </h3>
            <p className="text-xs text-slate-400">
              Deterministic factor weights and safety veto attribution governing this recovery intervention.
            </p>
          </div>
        </div>
      </div>

      {/* Decision Flow Pipeline */}
      <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* 1. AI Proposal */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-300">
            <Cpu className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">AI Recommendation</span>
            <div className="font-mono font-bold text-slate-200">{attribution.ai_action}</div>
            <span className="text-[10px] text-indigo-400">{(attribution.ai_confidence * 100).toFixed(0)}% confidence</span>
          </div>
        </div>

        <ArrowRight className="w-4 h-4 text-slate-600 hidden md:block shrink-0" />

        {/* 2. Policy Engine Review */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className={`p-2 rounded-lg border ${
            isBlocked ? 'bg-rose-500/10 border-rose-500/30 text-rose-400' :
            isModified ? 'bg-amber-500/10 border-amber-500/30 text-amber-400' :
            'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}>
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Policy Gate Status</span>
            <div className={`font-mono font-bold ${
              isBlocked ? 'text-rose-400' : isModified ? 'text-amber-400' : 'text-emerald-400'
            }`}>
              {attribution.policy_status}
            </div>
            <span className="text-[10px] text-slate-400">P0-P4 Safety Gates</span>
          </div>
        </div>

        <ArrowRight className="w-4 h-4 text-slate-600 hidden md:block shrink-0" />

        {/* 3. Authorized Action */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300">
            {isBlocked ? <ShieldAlert className="w-4 h-4 text-rose-400" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-semibold">Final Authorized Action</span>
            <div className="font-mono font-bold text-white">{attribution.final_action}</div>
            <span className="text-[10px] text-slate-400">Authorized Execution</span>
          </div>
        </div>
      </div>

      {/* Factor Weights Breakdown */}
      <div className="space-y-2 pt-1">
        <span className="text-xs font-semibold text-slate-300">Feature Importance & Decision Factors</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
          {attribution.factor_weights.map((fw) => {
            const isPos = fw.impact === 'POSITIVE';
            const isNeg = fw.impact === 'NEGATIVE';
            return (
              <div key={fw.factor_name} className="p-2.5 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-200">{fw.label}</span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                    isPos ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                    isNeg ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                    'bg-slate-800 text-slate-300'
                  }`}>
                    {fw.impact} ({(fw.weight * 100).toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-800/80 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isPos ? 'bg-emerald-400' : isNeg ? 'bg-rose-400' : 'bg-slate-400'}`}
                    style={{ width: `${fw.weight * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">{fw.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Policy Override Explanation / Veto Chain */}
      {attribution.policy_override_explanation && (
        <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Policy Gate Override Trace</span>
            <p className="text-amber-200/90 text-[11px]">{attribution.policy_override_explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
};
