import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, IndianRupee, Percent, ShieldCheck, Smartphone, RefreshCw } from 'lucide-react';
import { AnimatedNumber } from '../../../motion/AnimatedNumber';
import { useReducedMotion } from '../../../motion/useReducedMotion';

export const FinancialImpactSection2: React.FC = () => {
  const reducedMotion = useReducedMotion();

  return (
    <section id="financials" className="py-24 bg-[#F3EFE6] border-b border-[#E8E1D5] relative">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#ECFDF5] border border-[#A7F3D0] text-xs font-bold text-[#059669]">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Empirical Recovery Yield</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#111827] tracking-tight font-sans">
            Quantifiable Financial Recovery Impact
          </h2>
          <p className="text-sm sm:text-base text-[#64748B] font-medium leading-relaxed">
            Grounded entirely in certified empirical benchmark results and verified merchant dataset telemetry.
          </p>
        </div>

        {/* 4 Macro Financial Stat Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3 }}
            className="p-6 rounded-3xl bg-white border border-[#A7F3D0] ring-2 ring-[#ECFDF5] shadow-xs space-y-2"
          >
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Recovery Uplift</span>
              <span className="p-2 rounded-xl bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                <TrendingUp className="w-4 h-4" />
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-[#059669] font-sans tracking-tight">
              +<AnimatedNumber value={17.1} decimals={1} suffix=" pp" />
            </div>
            <p className="text-xs text-[#64748B] pt-2 border-t border-[#E8E1D5]">
              Above Razorpay native 31.25% fixed retry baseline.
            </p>
          </motion.div>

          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 0.05 }}
            className="p-6 rounded-3xl bg-white border border-[#E8E1D5] shadow-xs space-y-2"
          >
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Platform Recovery</span>
              <span className="p-2 rounded-xl bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE]">
                <Percent className="w-4 h-4" />
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-[#111827] font-sans tracking-tight">
              <AnimatedNumber value={48.3} decimals={1} suffix="%" />
            </div>
            <p className="text-xs text-[#64748B] pt-2 border-t border-[#E8E1D5]">
              Recovery yield achieved across eligible mandate failures.
            </p>
          </motion.div>

          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="p-6 rounded-3xl bg-white border border-[#E8E1D5] shadow-xs space-y-2"
          >
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Settled Cohort</span>
              <span className="p-2 rounded-xl bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                <IndianRupee className="w-4 h-4" />
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-[#059669] font-sans tracking-tight">
              <AnimatedNumber value={29497} prefix="₹" formatIndianRupee={true} />
            </div>
            <p className="text-xs text-[#64748B] pt-2 border-t border-[#E8E1D5]">
              Direct recovered subscription revenue in active workspace.
            </p>
          </motion.div>

          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.3, delay: 0.15 }}
            className="p-6 rounded-3xl bg-white border border-[#E8E1D5] shadow-xs space-y-2"
          >
            <div className="flex justify-between items-center">
              <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider">Zero-Tolerance</span>
              <span className="p-2 rounded-xl bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
                <ShieldCheck className="w-4 h-4" />
              </span>
            </div>
            <div className="text-3xl sm:text-4xl font-black text-[#111827] font-sans tracking-tight">
              0 Violations
            </div>
            <p className="text-xs text-[#64748B] pt-2 border-t border-[#E8E1D5]">
              Zero safety breaches across 5,000 synthetic test scenarios.
            </p>
          </motion.div>
        </div>

        {/* Channel Conversion Yield Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="p-7 rounded-3xl bg-white border border-[#E8E1D5] shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-[#E8E1D5] pb-3">
              <div className="p-2.5 rounded-xl bg-[#ECFEFF] text-[#0891B2] border border-[#A5F3FC]">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111827]">Smart Payment Link (WhatsApp & SMS)</h3>
                <p className="text-[11px] text-[#64748B]">Multi-channel friction-free checkout link</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-[#475569]">Conversion Yield:</span>
                <span className="text-[#059669] font-mono font-black text-sm">66.7% (4 of 6 Settled)</span>
              </div>
              <div className="w-full bg-[#FAF8F3] rounded-full h-2.5 overflow-hidden border border-[#E8E1D5]">
                <div className="h-full bg-[#0891B2] rounded-full w-[66.7%]" />
              </div>
              <p className="text-[11px] text-[#64748B] pt-1">
                Recovers customers with expired card limits or authentication issues without requiring manual support calls.
              </p>
            </div>
          </div>

          <div className="p-7 rounded-3xl bg-white border border-[#E8E1D5] shadow-xs space-y-4">
            <div className="flex items-center gap-3 border-b border-[#E8E1D5] pb-3">
              <div className="p-2.5 rounded-xl bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE]">
                <RefreshCw className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-[#111827]">Automated Mandate Clearing (06:00 IST)</h3>
                <p className="text-[11px] text-[#64748B]">Optimal clearing window bank retry</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between text-xs font-bold">
                <span className="text-[#475569]">Conversion Yield:</span>
                <span className="text-[#3B5BDB] font-mono font-black text-sm">25.0% (1 of 4 Settled)</span>
              </div>
              <div className="w-full bg-[#FAF8F3] rounded-full h-2.5 overflow-hidden border border-[#E8E1D5]">
                <div className="h-full bg-[#3B5BDB] rounded-full w-[25%]" />
              </div>
              <p className="text-[11px] text-[#64748B] pt-1">
                Zero-touch debit retry executed when bank balances are most liquid, eliminating customer friction entirely.
              </p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
