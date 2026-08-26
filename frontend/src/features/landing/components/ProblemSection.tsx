import React from 'react';
import { motion } from 'framer-motion';
import { XCircle, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';
import { useReducedMotion } from '../../../motion/useReducedMotion';

export const ProblemSection: React.FC = () => {
  const reducedMotion = useReducedMotion();

  return (
    <section id="problem" className="py-24 bg-white border-y border-[#E5E7EB] relative">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-16">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#FFF1F2] border border-[#FECDD3] text-xs font-bold text-[#E11D48]">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>The Mandate Churn Problem</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#111827] tracking-tight font-sans">
            Why Generic Retries Destroy Subscription Revenue
          </h2>
          <p className="text-sm sm:text-base text-[#64748B] font-medium leading-relaxed">
            Standard payment gateways retry failed recurring payments on fixed calendar schedules without understanding
            why the mandate failed.
          </p>
        </div>

        {/* Comparison Grid: Traditional Retries vs SmartMandateRetry */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Traditional Fixed Retries (Red/Amber Theme) */}
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, x: -16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.35 }}
            className="p-8 rounded-3xl bg-[#F7F9FC] border border-[#FECDD3] flex flex-col justify-between space-y-6 shadow-2xs"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3]">
                    <XCircle className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-[#111827]">Traditional Gateway Retries</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3]">
                  Blind Schedule
                </span>
              </div>

              <p className="text-xs text-[#64748B] leading-relaxed">
                Retrying an expired card or closed account 3 times achieves nothing while hitting customers with bank bounce penalties.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  { title: 'Blind Retry Timing', desc: 'Retries midday when balances are depleted rather than clearing windows.' },
                  { title: 'Customer Penalty Fees', desc: 'Repeated insufficient funds retries trigger ₹250+ bank bounce charges.' },
                  { title: 'No Alternate Rail', desc: 'If debit fails, the subscription halts with no self-serve UPI checkout link.' },
                  { title: 'Permanent Subscriber Churn', desc: '31.25% baseline recovery means nearly 70% of failed mandates are lost forever.' },
                ].map((item) => (
                  <div key={item.title} className="p-3.5 rounded-xl bg-white border border-[#E5E7EB] space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#E11D48]">
                      <XCircle className="w-3.5 h-3.5 shrink-0" />
                      <span>{item.title}</span>
                    </div>
                    <p className="text-[11px] text-[#64748B] pl-5.5">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#FFF1F2] border border-[#FECDD3] text-xs font-bold text-[#9F1239] flex items-center justify-between">
              <span>Average Baseline Recovery:</span>
              <span className="font-mono text-sm font-black text-[#E11D48]">~31.25%</span>
            </div>
          </motion.div>

          {/* SmartMandateRetry Autonomous Recovery (Emerald/Sapphire Theme) */}
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, x: 16 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-50px' }}
            transition={{ duration: 0.35 }}
            className="p-8 rounded-3xl bg-white border-2 border-[#C7D2FE] flex flex-col justify-between space-y-6 shadow-md shadow-[#3B5BDB]/5 ring-4 ring-[#EEF2FF]"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E5E7EB]">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE]">
                    <Zap className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-[#111827]">SmartMandate Autonomous Recovery</h3>
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                  Dual-Brain AI
                </span>
              </div>

              <p className="text-xs text-[#64748B] leading-relaxed">
                Every failure is classified in real time. AI proposes the optimal channel while deterministic policies enforce strict safety.
              </p>

              <div className="space-y-3 pt-2">
                {[
                  { title: 'Intelligent Clearing Timing', desc: 'Schedules debit retries at 06:00 IST to align with bank liquidity windows.' },
                  { title: 'Hard-Decline Auto-Stop', desc: 'Immediately halts closed accounts & stolen cards with 0 penalty attempts.' },
                  { title: 'Smart Payment Links', desc: 'Dispatches friction-free WhatsApp & SMS payment links for expired cards (66.7% yield).' },
                  { title: 'Zero-Tolerance Safety', desc: 'Strict frequency caps and high-value escalation holds protect customer trust.' },
                ].map((item) => (
                  <div key={item.title} className="p-3.5 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB] space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-[#059669]">
                      <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-[#059669]" />
                      <span className="text-[#111827]">{item.title}</span>
                    </div>
                    <p className="text-[11px] text-[#475569] pl-5.5">{item.desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-xs font-bold text-[#065F46] flex items-center justify-between">
              <span>Platform Recovery Yield:</span>
              <span className="font-mono text-sm font-black text-[#059669]">48.31% (+17.1 pp Uplift)</span>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
