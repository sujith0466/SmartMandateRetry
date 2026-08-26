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
      <div className="bg-white border border-slate-200 rounded-2xl p-5 animate-pulse space-y-3">
        <div className="h-4 bg-slate-200 rounded w-1/3"></div>
        <div className="h-20 bg-slate-100 rounded-xl"></div>
      </div>
    );
  }

  if (error || !attribution) {
    return null; // Gracefully hide if explainability is unavailable
  }

  const isBlocked = attribution.policy_status === 'BLOCKED';
  const isModified = attribution.policy_status === 'MODIFIED';

  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Decision Explainability & Factor Attribution
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 font-mono font-bold border border-slate-200">
                {attribution.governing_authority}
              </span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Dual-brain governance: probabilistic AI proposal evaluated against deterministic merchant safety gates.
            </p>
          </div>
        </div>
      </div>

      {/* Dual-Brain Decision Flow Pipeline */}
      <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* 1. AI Recommendation */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-xs">
            <Cpu className="w-4 h-4 text-purple-600" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">1. AI Recommendation</span>
            <div className="font-mono font-bold text-slate-900 text-xs mt-0.5">{attribution.ai_action}</div>
            <span className="text-[11px] font-bold text-purple-700 font-mono">{(attribution.ai_confidence * 100).toFixed(0)}% model confidence</span>
          </div>
        </div>

        <ArrowRight className="w-4 h-4 text-slate-400 hidden md:block shrink-0" />

        {/* 2. Policy Engine Safety Gate */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className={`p-2.5 rounded-xl border shadow-xs ${
            isBlocked ? 'bg-rose-50 border-rose-200 text-rose-700' :
            isModified ? 'bg-amber-50 border-amber-200 text-amber-700' :
            'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">2. Safety Gate Review</span>
            <div className={`font-mono font-bold text-xs mt-0.5 ${
              isBlocked ? 'text-rose-700' : isModified ? 'text-amber-700' : 'text-emerald-700'
            }`}>
              {attribution.policy_status}
            </div>
            <span className="text-[10px] text-slate-500 font-medium">Deterministic Guardrails</span>
          </div>
        </div>

        <ArrowRight className="w-4 h-4 text-slate-400 hidden md:block shrink-0" />

        {/* 3. Final Authorized Action */}
        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-700 shadow-xs">
            {isBlocked ? <ShieldAlert className="w-4 h-4 text-rose-600" /> : <ShieldCheck className="w-4 h-4 text-emerald-600" />}
          </div>
          <div>
            <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">3. Authorized Action</span>
            <div className="font-mono font-black text-slate-900 text-xs mt-0.5">{attribution.final_action}</div>
            <span className="text-[10px] text-slate-500 font-medium">Safe Execution Dispatch</span>
          </div>
        </div>
      </div>

      {/* Factor Weights Breakdown */}
      <div className="space-y-2.5 pt-1">
        <span className="text-xs font-bold text-slate-900 uppercase tracking-wider text-[11px]">Feature Attribution & Factor Weights</span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {attribution.factor_weights.map((fw) => {
            const isPos = fw.impact === 'POSITIVE';
            const isNeg = fw.impact === 'NEGATIVE';
            return (
              <div key={fw.factor_name} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">{fw.label}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isPos ? 'bg-emerald-50 text-emerald-800 border-emerald-200' :
                    isNeg ? 'bg-rose-50 text-rose-800 border-rose-200' :
                    'bg-slate-100 text-slate-700 border-slate-200'
                  }`}>
                    {fw.impact} ({(fw.weight * 100).toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isPos ? 'bg-emerald-600' : isNeg ? 'bg-rose-600' : 'bg-slate-400'}`}
                    style={{ width: `${fw.weight * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">{fw.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Policy Override Explanation / Veto Chain */}
      {attribution.policy_override_explanation && (
        <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-2.5 shadow-xs">
          <AlertTriangle className="w-4 h-4 shrink-0 text-amber-600 mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5 text-amber-950">Safety Gate Override Audit Log</span>
            <p className="text-amber-800 text-[11px] leading-relaxed">{attribution.policy_override_explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
};
