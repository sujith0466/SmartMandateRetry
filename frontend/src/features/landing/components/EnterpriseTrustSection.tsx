import React from 'react';
import { motion } from 'framer-motion';
import { ShieldCheck, Lock, FileText, Server, KeyRound, Database } from 'lucide-react';
import { useReducedMotion } from '../../../motion/useReducedMotion';

export const EnterpriseTrustSection: React.FC = () => {
  const reducedMotion = useReducedMotion();

  const trustFeatures = [
    {
      title: 'Deterministic Safety Guardrails',
      desc: 'P0–P4 zero-tolerance hard rules strictly intercept unsafe retries before execution.',
      icon: ShieldCheck,
      color: 'text-[#059669] bg-[#ECFDF5] border-[#A7F3D0]',
    },
    {
      title: 'Immutable Audit Ledger',
      desc: 'Cryptographic correlation tracking for every AI proposal, safety check, and settlement.',
      icon: FileText,
      color: 'text-[#3B5BDB] bg-[#EEF2FF] border-[#C7D2FE]',
    },
    {
      title: 'PII Sanitization & Masking',
      desc: 'Sensitive customer email and phone contacts are redacted prior to AI reasoning.',
      icon: Lock,
      color: 'text-[#7C3AED] bg-[#F5F3FF] border-[#DDD6FE]',
    },
    {
      title: 'Tenant Isolation & IDOR Protection',
      desc: 'Multi-tenant database isolation prevents cross-merchant data leakage.',
      icon: Server,
      color: 'text-[#0891B2] bg-[#ECFEFF] border-[#A5F3FC]',
    },
    {
      title: 'HMAC Webhook Verification',
      desc: 'SHA256 signature verification authenticates incoming Razorpay failure payloads.',
      icon: KeyRound,
      color: 'text-[#D97706] bg-[#FFFBEB] border-[#FDE68A]',
    },
    {
      title: 'Empirical Benchmarking Lab',
      desc: 'Statistically verified across 5,000 synthetic failure scenarios across 14 families.',
      icon: Database,
      color: 'text-[#3B5BDB] bg-[#EEF2FF] border-[#C7D2FE]',
    },
  ];

  return (
    <section id="trust" className="py-24 bg-white border-b border-[#E5E7EB] relative">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-xs font-bold text-[#059669]">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Enterprise Security & Trust</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#111827] tracking-tight font-sans">
            Built on Enterprise Fintech Infrastructure
          </h2>
          <p className="text-sm sm:text-base text-[#64748B] font-medium leading-relaxed">
            Enterprise trust is engineered into every layer: deterministic safety, PII protection, and immutable auditability.
          </p>
        </div>

        {/* 6 Trust Feature Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {trustFeatures.map((tf, i) => (
            <motion.div
              key={tf.title}
              initial={reducedMotion ? {} : { opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.3, delay: i * 0.05 }}
              className="p-6 rounded-3xl bg-[#F7F9FC] border border-[#E5E7EB] space-y-3 shadow-2xs"
            >
              <div className={`p-2.5 rounded-xl border w-fit shadow-2xs ${tf.color}`}>
                <tf.icon className="w-5 h-5" />
              </div>
              <h3 className="text-sm font-bold text-[#111827]">{tf.title}</h3>
              <p className="text-xs text-[#64748B] leading-relaxed">{tf.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
};
