import React from 'react';
import { motion } from 'framer-motion';
import { XCircle, CheckCircle2, AlertTriangle, Zap } from 'lucide-react';
import { useReducedMotion } from '../../../motion/useReducedMotion';

export const ProblemTransformationSection: React.FC = () => {
  const reducedMotion = useReducedMotion();

  const traditionalSteps = [
    { title: 'Payment Fails', sub: 'Mandate debit rejected' },
    { title: 'Blind Retry #1', sub: 'Fixed midday schedule' },
    { title: 'Blind Retry #2', sub: 'Customer penalty charges' },
    { title: 'Subscription Halts', sub: 'Permanent subscriber churn' },
  ];

  const smartSteps = [
    { title: 'Payment Fails', sub: 'Webhook captured in 5ms' },
    { title: 'Context & AI', sub: 'Liquidity window scheduled' },
    { title: 'Deterministic Safety', sub: 'P0–P4 zero-tolerance pass' },
    { title: 'Revenue Recovered', sub: 'Settlement reconciled' },
  ];

  return (
    <section id="problem" className="py-24 bg-[#FAF8F3] border-y border-[#E8E1D5] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-16">
        {/* Section Header */}
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-60px' }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="text-center max-w-3xl mx-auto space-y-3"
        >
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#FFF1F2] border border-[#FECDD3] text-xs font-bold text-[#E11D48]">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>The Mandate Churn Problem</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#111827] tracking-tight font-sans">
            Why Generic Retries Destroy Subscription Revenue
          </h2>
          <p className="text-sm sm:text-base text-[#64748B] font-medium leading-relaxed">
            Standard payment gateways blindly retry failed mandates on fixed calendar schedules without understanding
            why the debit failed.
          </p>
        </motion.div>

        {/* Side-by-Side Animated Comparison Matrix */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-stretch">
          {/* Traditional Fixed Retries */}
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="p-8 rounded-3xl bg-white border border-[#FECDD3] flex flex-col justify-between space-y-6 shadow-xs"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E1D5]">
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

              {/* Animated 4-Step Failure Cascade */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                {traditionalSteps.map((step, idx) => (
                  <div key={step.title} className="p-3 rounded-xl bg-[#FAF8F3] border border-[#FECDD3] text-center space-y-1">
                    <span className="text-[9px] font-mono text-[#E11D48] font-bold">STEP 0{idx + 1}</span>
                    <div className="text-[11px] font-bold text-[#111827]">{step.title}</div>
                    <div className="text-[9px] text-[#64748B]">{step.sub}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-2">
                {[
                  { title: 'Blind Midday Timing', desc: 'Retries debit attempts midday when balances are depleted rather than clearing windows.' },
                  { title: 'Customer Penalty Fees', desc: 'Repeated insufficient funds retries trigger ₹250+ bank bounce charges for the subscriber.' },
                  { title: 'No Alternate Rail', desc: 'If debit fails, the subscription halts with no self-serve UPI checkout link.' },
                ].map((item) => (
                  <div key={item.title} className="p-3.5 rounded-xl bg-[#FAF8F3] border border-[#E8E1D5] space-y-1">
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

          {/* SmartMandate Autonomous Recovery */}
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true, margin: '-60px' }}
            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
            className="p-8 rounded-3xl bg-white border-2 border-[#C7D2FE] flex flex-col justify-between space-y-6 shadow-md shadow-[#3B5BDB]/5 ring-4 ring-[#EEF2FF]"
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8E1D5]">
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

              {/* Animated 4-Step Recovery Cascade */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                {smartSteps.map((step, idx) => (
                  <div key={step.title} className="p-3 rounded-xl bg-[#FAF8F3] border border-[#A7F3D0] text-center space-y-1">
                    <span className="text-[9px] font-mono text-[#059669] font-bold">PHASE 0{idx + 1}</span>
                    <div className="text-[11px] font-bold text-[#111827]">{step.title}</div>
                    <div className="text-[9px] text-[#64748B]">{step.sub}</div>
                  </div>
                ))}
              </div>

              <div className="space-y-3 pt-2">
                {[
                  { title: 'Intelligent Clearing Timing', desc: 'Schedules debit retries at 06:00 IST to align with bank liquidity windows.' },
                  { title: 'Hard-Decline Auto-Stop', desc: 'Immediately halts closed accounts & stolen cards with 0 penalty attempts.' },
                  { title: 'Smart Payment Links', desc: 'Dispatches friction-free WhatsApp & SMS payment links for expired cards (66.7% yield).' },
                ].map((item) => (
                  <div key={item.title} className="p-3.5 rounded-xl bg-[#FAF8F3] border border-[#E8E1D5] space-y-1">
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
