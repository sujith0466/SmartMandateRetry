import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, LayoutDashboard, Sparkles, ShieldCheck } from 'lucide-react';
import { useReducedMotion } from '../../../motion/useReducedMotion';

export const CtaSection: React.FC = () => {
  const reducedMotion = useReducedMotion();

  return (
    <section className="py-24 bg-gradient-to-b from-white to-[#F7F9FC] relative overflow-hidden">
      <div className="max-w-5xl mx-auto px-6 sm:px-8">
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, scale: 0.98 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.35 }}
          className="p-10 sm:p-14 rounded-3xl bg-gradient-to-br from-[#111827] via-[#1E293B] to-[#0F172A] text-white text-center space-y-8 shadow-xl relative overflow-hidden"
        >
          {/* Subtle Background Radial */}
          <div className="absolute top-0 right-0 w-96 h-96 bg-[#3B5BDB]/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-0 w-96 h-96 bg-[#7C3AED]/20 rounded-full blur-3xl pointer-events-none" />

          <div className="space-y-4 max-w-2xl mx-auto relative z-10">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/20 text-xs font-bold text-[#A5F3FC]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Commercial Ready • Production Certified</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight font-sans text-white">
              Make Every Failed Mandate a Recovery Opportunity.
            </h2>
            <p className="text-sm sm:text-base text-slate-300 font-medium leading-relaxed">
              Transform lost recurring subscriptions into settled revenue with autonomous AI decisions and deterministic safety governance.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10 pt-2">
            <Link
              to="/"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-[#3B5BDB] hover:bg-[#3048B8] text-white text-sm font-bold shadow-lg shadow-[#3B5BDB]/30 transition-all duration-150"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Open Merchant Console</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <Link
              to="/evaluation"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-white/10 hover:bg-white/15 text-white text-sm font-bold border border-white/20 transition-all duration-150"
            >
              <ShieldCheck className="w-4 h-4 text-[#059669]" />
              <span>Inspect Evaluation Benchmark</span>
            </Link>
          </div>

          <div className="pt-4 flex items-center justify-center gap-6 text-xs text-slate-400 font-mono relative z-10">
            <span>✓ 5,000 Certified Scenarios</span>
            <span>•</span>
            <span>✓ Zero Safety Violations</span>
            <span>•</span>
            <span>✓ +17.1 pp Uplift</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
