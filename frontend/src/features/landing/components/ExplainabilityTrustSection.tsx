import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles, Cpu, ShieldCheck, Lock, FileText, Server, KeyRound, Database, CheckCircle2 } from 'lucide-react';
import { useReducedMotion } from '../../../motion/useReducedMotion';

export const ExplainabilityTrustSection: React.FC = () => {
  const reducedMotion = useReducedMotion();

  const factors = [
    { label: 'Customer Tenure (12+ Months)', weight: 35, impact: 'POSITIVE', desc: 'Long-standing subscriber with 95% historical recovery rate.' },
    { label: 'Soft Decline Error Code', weight: 45, impact: 'POSITIVE', desc: 'Insufficient funds classified as temporary liquidity dip.' },
    { label: 'High Value Threshold (>₹10k)', weight: 20, impact: 'MODIFIED', desc: 'Safety gate requires operator approval before debit retry.' },
  ];

  const trustPillars = [
    { title: 'Deterministic Safety Rules', desc: 'P0–P4 zero-tolerance hard rules strictly intercept unsafe retries before execution.', icon: ShieldCheck, color: 'text-[#059669] bg-[#ECFDF5] border-[#A7F3D0]' },
    { title: 'Immutable Audit Ledger', desc: 'Cryptographic correlation tracking for every AI proposal, safety check, and settlement.', icon: FileText, color: 'text-[#3B5BDB] bg-[#EEF2FF] border-[#C7D2FE]' },
    { title: 'PII Sanitization & Masking', desc: 'Sensitive customer email and phone contacts are redacted prior to AI reasoning.', icon: Lock, color: 'text-[#7C3AED] bg-[#F5F3FF] border-[#DDD6FE]' },
    { title: 'Tenant Isolation & IDOR Defense', desc: 'Multi-tenant database isolation prevents cross-merchant data leakage.', icon: Server, color: 'text-[#0891B2] bg-[#ECFEFF] border-[#A5F3FC]' },
    { title: 'HMAC Webhook Verification', desc: 'SHA256 signature verification authenticates incoming Razorpay failure payloads.', icon: KeyRound, color: 'text-[#D97706] bg-[#FFFBEB] border-[#FDE68A]' },
    { title: 'Empirical Benchmarking Lab', desc: 'Statistically verified across 5,000 synthetic failure scenarios across 14 families.', icon: Database, color: 'text-[#3B5BDB] bg-[#EEF2FF] border-[#C7D2FE]' },
  ];

  return (
    <section id="trust" className="py-24 bg-[#FAF8F3] border-b border-[#E8E1D5] relative">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-20">
        {/* Sub-Section 1: Explainability Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#F5F3FF] border border-[#DDD6FE] text-xs font-bold text-[#7C3AED]">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Explainability & Trust</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#111827] tracking-tight font-sans">
            Transparent Decision Attribution. Zero Black Boxes.
          </h2>
          <p className="text-sm sm:text-base text-[#64748B] font-medium leading-relaxed">
            Every recovery decision is completely transparent with explainable factor weights and deterministic safety audit trails.
          </p>
        </div>

        {/* Explainability Interactive Card */}
        <div className="max-w-4xl mx-auto p-8 rounded-3xl bg-white border border-[#E8E1D5] shadow-sm space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E8E1D5] pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2.5 rounded-xl bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE]">
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

          <div className="space-y-3">
            {factors.map((f, i) => (
              <div key={f.label} className="p-4 rounded-xl bg-[#FAF8F3] border border-[#E8E1D5] space-y-2">
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
                <div className="w-full bg-[#E8E1D5] rounded-full h-1.5 overflow-hidden">
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

          <div className="p-4 rounded-2xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-between text-xs text-[#1E3A8A]">
            <span className="font-medium">Governing Authority: <strong className="text-[#3B5BDB]">DUAL_BRAIN_AI_AND_POLICY</strong></span>
            <span className="font-bold font-mono text-[#059669] flex items-center gap-1">
              <CheckCircle2 className="w-4 h-4" /> AUTHORIZED EXECUTION
            </span>
          </div>
        </div>

        {/* Sub-Section 2: 6 Enterprise Security Pillars */}
        <div className="space-y-8 pt-6">
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <h3 className="text-2xl font-black text-[#111827] tracking-tight font-sans">
              Enterprise Fintech Security Architecture
            </h3>
            <p className="text-xs text-[#64748B]">
              Every safeguard is strictly implemented and verified in the production application.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trustPillars.map((tp, i) => (
              <motion.div
                key={tp.title}
                initial={reducedMotion ? {} : { opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.05 }}
                className="p-6 rounded-3xl bg-white border border-[#E8E1D5] space-y-3 shadow-2xs"
              >
                <div className={`p-2.5 rounded-xl border w-fit shadow-2xs ${tp.color}`}>
                  <tp.icon className="w-5 h-5" />
                </div>
                <h4 className="text-sm font-bold text-[#111827]">{tp.title}</h4>
                <p className="text-xs text-[#64748B] leading-relaxed">{tp.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
