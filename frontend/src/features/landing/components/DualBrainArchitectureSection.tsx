import React from 'react';
import { motion } from 'framer-motion';
import { Cpu, ShieldCheck, Zap, ArrowRight, Lock, Sparkles } from 'lucide-react';
import { useReducedMotion } from '../../../motion/useReducedMotion';

export const DualBrainArchitectureSection: React.FC = () => {
  const reducedMotion = useReducedMotion();

  return (
    <section id="architecture" className="py-24 bg-[#F3EFE6] border-y border-[#E8E1D5] relative">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#F5F3FF] border border-[#DDD6FE] text-xs font-bold text-[#7C3AED]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Dual-Brain Governance</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#111827] tracking-tight font-sans">
            AI Proposes. Deterministic Policy Governs.
          </h2>
          <p className="text-sm sm:text-base text-[#64748B] font-medium leading-relaxed">
            SmartMandateRetry ensures AI never directly executes on merchant money without passing through
            hardcoded, zero-tolerance deterministic safety guardrails.
          </p>
        </div>

        {/* 3 Pillars Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Pillar 1: AI Intelligence (Violet Theme) */}
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.3 }}
            className="p-6 rounded-3xl bg-white border border-[#E8E1D5] space-y-4 shadow-sm flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-[#F5F3FF] border border-[#DDD6FE] text-[#7C3AED] w-fit shadow-2xs">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#111827]">1. Probabilistic AI Strategy</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Evaluates failure error codes, customer track record, retry history, invoice size, and time-of-day clearing windows to recommend the optimal recovery strategy.
              </p>
              <div className="space-y-2 pt-2 border-t border-[#E8E1D5] text-xs">
                <div className="flex items-center gap-2 text-[#475569]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
                  <span>Gemini 2.0 Flash + OpenRouter Failover</span>
                </div>
                <div className="flex items-center gap-2 text-[#475569]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
                  <span>91% Average Confidence Scoring</span>
                </div>
                <div className="flex items-center gap-2 text-[#475569]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#7C3AED]" />
                  <span>Sub-200ms Decision Ingestion</span>
                </div>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#F5F3FF] border border-[#DDD6FE] text-[11px] font-bold text-[#7C3AED] text-center font-mono">
              OUTPUT: PROPOSED RECOVERY ACTION
            </div>
          </motion.div>

          {/* Pillar 2: Deterministic Safety Gate (Emerald/Rose Theme) */}
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="p-6 rounded-3xl bg-white border-2 border-[#A7F3D0] space-y-4 shadow-sm flex flex-col justify-between ring-2 ring-[#ECFDF5]"
          >
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#059669] w-fit shadow-2xs">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#111827]">2. Deterministic Safety Gate</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Evaluates the AI proposal against platform hard limits and merchant policies with zero exceptions. Intercepts unsafe retries before payment rail execution.
              </p>
              <div className="space-y-2 pt-2 border-t border-[#E8E1D5] text-xs">
                <div className="flex items-center gap-2 text-[#475569]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#E11D48]" />
                  <span>P0: Hard Decline Immediate Auto-Stop</span>
                </div>
                <div className="flex items-center gap-2 text-[#475569]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                  <span>P1 & P2: Max 3 Retries & 24hr Interval</span>
                </div>
                <div className="flex items-center gap-2 text-[#475569]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#D97706]" />
                  <span>P2b: High Value (&gt;₹10k) Operator Hold</span>
                </div>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0] text-[11px] font-bold text-[#059669] text-center font-mono">
              OUTPUT: AUTHORIZED SAFE DIRECTIVE
            </div>
          </motion.div>

          {/* Pillar 3: Multi-Channel Dispatch (Sapphire/Aqua Theme) */}
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.3, delay: 0.2 }}
            className="p-6 rounded-3xl bg-white border border-[#E8E1D5] space-y-4 shadow-sm flex flex-col justify-between"
          >
            <div className="space-y-3">
              <div className="p-3 rounded-2xl bg-[#EEF2FF] border border-[#C7D2FE] text-[#3B5BDB] w-fit shadow-2xs">
                <Zap className="w-6 h-6" />
              </div>
              <h3 className="text-base font-bold text-[#111827]">3. Multi-Channel Execution</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">
                Dispatches authorized actions across active payment rails: scheduled bank clearing retries, WhatsApp/SMS smart checkout links, or operator triage.
              </p>
              <div className="space-y-2 pt-2 border-t border-[#E8E1D5] text-xs">
                <div className="flex items-center gap-2 text-[#475569]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#3B5BDB]" />
                  <span>Automated Mandate Clearing (06:00 IST)</span>
                </div>
                <div className="flex items-center gap-2 text-[#475569]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#0891B2]" />
                  <span>WhatsApp & SMS Dynamic Links (66.7% Yield)</span>
                </div>
                <div className="flex items-center gap-2 text-[#475569]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
                  <span>Real-Time Webhook Reconciliation</span>
                </div>
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] text-[11px] font-bold text-[#3B5BDB] text-center font-mono">
              OUTPUT: SETTLED INVOICE REVENUE
            </div>
          </motion.div>
        </div>

        {/* Dual-Brain Visual Flow Diagram */}
        <div className="p-6 rounded-3xl bg-white border border-[#E8E1D5] shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#E8E1D5] pb-3">
            <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider font-sans">
              Live Governance Protocol Execution
            </h4>
            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#FAF8F3] text-[#475569] border border-[#E8E1D5] font-mono font-bold flex items-center gap-1">
              <Lock className="w-3 h-3" /> ZERO-TOLERANCE ENFORCED
            </span>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-2">
            <div className="p-3.5 rounded-2xl bg-[#F5F3FF] border border-[#DDD6FE] text-center w-full md:w-1/3 space-y-1">
              <span className="text-[10px] text-[#7C3AED] font-bold uppercase">AI Model Output</span>
              <p className="text-xs font-black text-[#111827]">RETRY_SCHEDULED (06:00 IST)</p>
              <span className="text-[10px] text-[#64748B]">Confidence: 91%</span>
            </div>

            <ArrowRight className="w-5 h-5 text-[#94A3B8] shrink-0 rotate-90 md:rotate-0" />

            <div className="p-3.5 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-center w-full md:w-1/3 space-y-1">
              <span className="text-[10px] text-[#059669] font-bold uppercase">Safety Gate Verification</span>
              <p className="text-xs font-black text-[#059669]">PASSED (0 VETOES)</p>
              <span className="text-[10px] text-[#64748B]">P0–P4 Guardrails Compliant</span>
            </div>

            <ArrowRight className="w-5 h-5 text-[#94A3B8] shrink-0 rotate-90 md:rotate-0" />

            <div className="p-3.5 rounded-2xl bg-[#EEF2FF] border border-[#C7D2FE] text-center w-full md:w-1/3 space-y-1">
              <span className="text-[10px] text-[#3B5BDB] font-bold uppercase">Authorized Dispatch</span>
              <p className="text-xs font-black text-[#111827]">SCHEDULED_DEBIT_DISPATCHED</p>
              <span className="text-[10px] text-[#059669] font-bold">Immutable Ledger Logged</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
