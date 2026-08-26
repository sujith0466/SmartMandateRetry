import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, ShieldAlert, Cpu, Sparkles, AlertTriangle, Scale, ArrowRight } from 'lucide-react';
import { DecisionAttributionResponse } from '../../types';
import { fetchCaseExplainability } from '../../services/api';
import { useReducedMotion } from '../../motion/useReducedMotion';

interface DecisionAttributionCardProps {
  caseId: string;
}

export const DecisionAttributionCard: React.FC<DecisionAttributionCardProps> = ({ caseId }) => {
  const [attribution, setAttribution] = useState<DecisionAttributionResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const reducedMotion = useReducedMotion();

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
      <div className="bg-white border border-[#E5E7EB] rounded-2xl p-5 animate-pulse space-y-3 shadow-2xs">
        <div className="h-4 bg-[#E5E7EB] rounded w-1/3"></div>
        <div className="h-20 bg-[#F7F9FC] rounded-xl"></div>
      </div>
    );
  }

  if (error || !attribution) {
    return null; // Gracefully hide if explainability is unavailable
  }

  const isBlocked = attribution.policy_status === 'BLOCKED';
  const isModified = attribution.policy_status === 'MODIFIED';

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2 font-sans">
              Decision Explainability & Factor Attribution
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F7F9FC] text-[#475569] font-mono font-bold border border-[#E5E7EB]">
                {attribution.governing_authority}
              </span>
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              Dual-brain governance: probabilistic AI proposal evaluated against deterministic merchant safety gates.
            </p>
          </div>
        </div>
      </div>

      {/* Dual-Brain Decision Flow Pipeline with Sequential Motion */}
      <div className="p-4 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB] flex flex-col md:flex-row items-center justify-between gap-3 text-xs">
        {/* 1. AI Recommendation (Violet Theme) */}
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, x: -8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25 }}
          className="flex items-center gap-3 w-full md:w-auto p-2 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs"
        >
          <div className="p-2.5 rounded-xl bg-[#F5F3FF] border border-[#DDD6FE] text-[#7C3AED] shadow-2xs">
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">1. AI Recommendation</span>
            <div className="font-mono font-bold text-[#111827] text-xs mt-0.5">{attribution.ai_action}</div>
            <span className="text-[11px] font-bold text-[#7C3AED] font-mono">
              {(attribution.ai_confidence * 100).toFixed(0)}% model confidence
            </span>
          </div>
        </motion.div>

        <ArrowRight className="w-4 h-4 text-[#94A3B8] hidden md:block shrink-0" />

        {/* 2. Policy Engine Safety Gate (Emerald/Amber/Rose) */}
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.25, delay: 0.1 }}
          className={`flex items-center gap-3 w-full md:w-auto p-2 rounded-xl border shadow-2xs ${
            isBlocked ? 'bg-[#FFF1F2] border-[#FECDD3]' :
            isModified ? 'bg-[#FFFBEB] border-[#FDE68A]' :
            'bg-white border-[#E5E7EB]'
          }`}
        >
          <div className={`p-2.5 rounded-xl border shadow-2xs ${
            isBlocked ? 'bg-[#FFF1F2] border-[#FECDD3] text-[#E11D48]' :
            isModified ? 'bg-[#FFFBEB] border-[#FDE68A] text-[#D97706]' :
            'bg-[#ECFDF5] border-[#A7F3D0] text-[#059669]'
          }`}>
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">2. Safety Gate Review</span>
            <div className={`font-mono font-bold text-xs mt-0.5 ${
              isBlocked ? 'text-[#E11D48]' : isModified ? 'text-[#D97706]' : 'text-[#059669]'
            }`}>
              {attribution.policy_status}
            </div>
            <span className="text-[10px] text-[#64748B] font-medium">Deterministic Guardrails</span>
          </div>
        </motion.div>

        <ArrowRight className="w-4 h-4 text-[#94A3B8] hidden md:block shrink-0" />

        {/* 3. Final Authorized Action (Sapphire Theme) */}
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, x: 8 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.25, delay: 0.2 }}
          className="flex items-center gap-3 w-full md:w-auto p-2 rounded-xl bg-white border border-[#C7D2FE] shadow-2xs ring-2 ring-[#EEF2FF]"
        >
          <div className="p-2.5 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] text-[#3B5BDB] shadow-2xs">
            {isBlocked ? <ShieldAlert className="w-4 h-4 text-[#E11D48]" /> : <ShieldCheck className="w-4 h-4 text-[#3B5BDB]" />}
          </div>
          <div>
            <span className="text-[10px] text-[#64748B] uppercase font-bold tracking-wider">3. Authorized Action</span>
            <div className="font-mono font-black text-[#111827] text-xs mt-0.5">{attribution.final_action}</div>
            <span className="text-[10px] text-[#059669] font-medium font-bold">Safe Execution Dispatch</span>
          </div>
        </motion.div>
      </div>

      {/* Factor Weights Breakdown with Smooth Bar Fill */}
      <div className="space-y-2.5 pt-1">
        <span className="text-xs font-bold text-[#111827] uppercase tracking-wider text-[11px]">
          Feature Attribution & Factor Weights
        </span>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          {attribution.factor_weights.map((fw, index) => {
            const isPos = fw.impact === 'POSITIVE';
            const isNeg = fw.impact === 'NEGATIVE';
            return (
              <div key={fw.factor_name} className="p-3.5 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB] space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-[#111827]">{fw.label}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                    isPos ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]' :
                    isNeg ? 'bg-[#FFF1F2] text-[#E11D48] border-[#FECDD3]' :
                    'bg-[#F1F5F9] text-[#475569] border-[#E5E7EB]'
                  }`}>
                    {fw.impact} ({(fw.weight * 100).toFixed(0)}%)
                  </span>
                </div>
                <div className="w-full bg-[#E5E7EB] rounded-full h-1.5 overflow-hidden">
                  <motion.div
                    initial={reducedMotion ? { width: `${fw.weight * 100}%` } : { width: 0 }}
                    animate={{ width: `${fw.weight * 100}%` }}
                    transition={{ duration: 0.5, delay: index * 0.08, ease: [0.16, 1, 0.3, 1] }}
                    className={`h-full rounded-full ${isPos ? 'bg-[#059669]' : isNeg ? 'bg-[#E11D48]' : 'bg-[#94A3B8]'}`}
                  />
                </div>
                <p className="text-[11px] text-[#475569] leading-relaxed">{fw.description}</p>
              </div>
            );
          })}
        </div>
      </div>

      {/* Policy Override Explanation / Veto Chain */}
      {attribution.policy_override_explanation && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-3.5 rounded-xl bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] text-xs flex items-start gap-2.5 shadow-2xs"
        >
          <AlertTriangle className="w-4 h-4 shrink-0 text-[#D97706] mt-0.5" />
          <div>
            <span className="font-bold block mb-0.5 text-[#92400E]">Safety Gate Override Audit Log</span>
            <p className="text-[#B45309] text-[11px] leading-relaxed">{attribution.policy_override_explanation}</p>
          </div>
        </motion.div>
      )}
    </div>
  );
};
