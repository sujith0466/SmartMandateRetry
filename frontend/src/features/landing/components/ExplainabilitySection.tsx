import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Cpu, CheckCircle2 } from 'lucide-react';
import { useReducedMotion } from '../../../motion/useReducedMotion';

export const ExplainabilitySection: React.FC = () => {
  const reducedMotion = useReducedMotion();

  const factors = [
    { label: 'Customer Tenure (12+ Months)', weight: 35, impact: 'POSITIVE', desc: 'Long-standing subscriber with 95% historical recovery rate.' },
    { label: 'Soft Decline Error Code', weight: 45, impact: 'POSITIVE', desc: 'Insufficient funds classified as temporary liquidity dip.' },
    { label: 'High Value Threshold (>₹10k)', weight: 20, impact: 'MODIFIED', desc: 'Safety gate requires operator approval before debit retry.' },
  ];

  return (
    <section className="py-24 bg-[#F7F9FC] relative">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#F5F3FF] border border-[#DDD6FE] text-xs font-bold text-[#7C3AED]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Decision Attribution</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#111827] tracking-tight font-sans">
            Complete Explainability on Every Recovery Action
          </h2>
          <p className="text-sm sm:text-base text-[#64748B] font-medium leading-relaxed">
            Eliminate AI black-boxes. Every recovery decision includes transparent factor weights, confidence scores, and safety audit logs.
          </p>
        </div>

        {/* Interactive Explainability Card */}
        <div className="max-w-4xl mx-auto p-8 rounded-3xl bg-white border border-[#E5E7EB] shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E5E7EB] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE]">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111827]">Case Explainability & Feature Attribution</h3>
                <p className="text-[11px] text-[#64748B]">Invoice: <strong className="font-mono text-[#111827]">inv_sub_4892c</strong> • Amount: ₹4,999.00</p>
              </div>
            </div>
            <span className="text-[11px] font-mono font-bold text-[#7C3AED] px-3 py-1 rounded-full bg-[#F5F3FF] border border-[#DDD6FE]">
              91% MODEL CONFIDENCE
            </span>
          </div>

          {/* Attribution Flow */}
          <div className="space-y-4">
            <div className="text-xs font-bold text-[#475569] uppercase tracking-wider text-[10px]">
              Attribution Factors Evaluated
            </div>

            <div className="space-y-3">
              {factors.map((f, i) => (
                <div key={f.label} className="p-4 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-[#111827]">{f.label}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      f.impact === 'POSITIVE'
                        ? 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]'
                        : 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]'
                    }`}>
                      {f.impact} ({f.weight}%)
                    </span>
                  </div>
                  <div className="w-full bg-[#E5E7EB] rounded-full h-1.5 overflow-hidden">
                    <motion.div
                      initial={reducedMotion ? { width: `${f.weight}%` } : { width: 0 }}
                      whileInView={{ width: `${f.weight}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 0.5, delay: i * 0.1 }}
                      className={`h-full rounded-full ${f.impact === 'POSITIVE' ? 'bg-[#059669]' : 'bg-[#D97706]'}`}
                    />
                  </div>
                  <p className="text-[11px] text-[#64748B]">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-between text-xs text-[#1E3A8A]">
            <span className="font-medium">Governing Authority: <strong className="text-[#3B5BDB]">DUAL_BRAIN_AI_AND_POLICY</strong></span>
            <span className="font-bold font-mono text-[#059669] flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> AUTHORIZED EXECUTION
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
