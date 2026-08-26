import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, Sparkles, LayoutDashboard, Terminal } from 'lucide-react';
import { Hero3DVisual } from './Hero3DVisual';
import { useReducedMotion } from '../../../motion/useReducedMotion';

export const HeroSection: React.FC = () => {
  const reducedMotion = useReducedMotion();

  const scrollToArchitecture = () => {
    const el = document.getElementById('architecture');
    if (el) el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <section className="relative pt-32 pb-20 overflow-hidden">
      {/* Background Accent Gradients */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-[radial-gradient(ellipse_at_top,rgba(59,91,219,0.08)_0%,transparent_70%)] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-12">
        {/* Top Trust Pill */}
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="flex justify-center"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-[#C7D2FE] shadow-2xs text-xs font-bold text-[#3B5BDB]">
            <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" />
            <span>Autonomous Dual-Brain Mandate Recovery Engine</span>
            <span className="w-1.5 h-1.5 rounded-full bg-[#059669]" />
            <span className="text-[#059669] font-mono font-bold">+17.1 pp Uplift</span>
          </div>
        </motion.div>

        {/* Main Headline & Supporting Statement */}
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <motion.h1
            initial={reducedMotion ? {} : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="text-4xl sm:text-5xl lg:text-6xl font-black text-[#111827] tracking-tight font-sans leading-[1.12]"
          >
            Turn Failed Recurring Payments Into{' '}
            <span className="bg-gradient-to-r from-[#3B5BDB] via-[#7C3AED] to-[#0891B2] bg-clip-text text-transparent">
              Recovered Revenue.
            </span>
          </motion.h1>

          <motion.p
            initial={reducedMotion ? {} : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.1 }}
            className="text-base sm:text-lg text-[#475569] max-w-2xl mx-auto leading-relaxed font-medium"
          >
            Autonomous mandate recovery combining probabilistic AI decision intelligence with deterministic
            zero-tolerance safety guardrails. Never blind-retry. Never churn subscribers.
          </motion.p>

          {/* Action CTAs */}
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2"
          >
            <Link
              to="/"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#3B5BDB] hover:bg-[#3048B8] text-white text-sm font-bold shadow-md shadow-[#3B5BDB]/20 hover:shadow-lg transition-all"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Launch Merchant Console</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={scrollToArchitecture}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-[#F7F9FC] text-[#475569] hover:text-[#111827] text-sm font-bold border border-[#E5E7EB] shadow-2xs transition-all"
            >
              <Terminal className="w-4 h-4 text-[#7C3AED]" />
              <span>Explore Dual-Brain Architecture</span>
            </button>
          </motion.div>
        </div>

        {/* 3D Recovery Rail Visualization Container */}
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="max-w-5xl mx-auto"
        >
          <Hero3DVisual />
        </motion.div>

        {/* Trust Badges Strip */}
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-2"
        >
          <div className="p-4 rounded-2xl bg-white border border-[#E5E7EB] shadow-2xs text-center space-y-1">
            <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">Recovery Uplift</span>
            <div className="text-xl font-black text-[#059669] font-sans">+17.1 pp</div>
            <p className="text-[11px] text-[#475569]">Over native fixed retries</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#E5E7EB] shadow-2xs text-center space-y-1">
            <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">Platform Recovery</span>
            <div className="text-xl font-black text-[#3B5BDB] font-sans">48.3%</div>
            <p className="text-[11px] text-[#475569]">On eligible failure cohorts</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#E5E7EB] shadow-2xs text-center space-y-1">
            <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">Deterministic Safety</span>
            <div className="text-xl font-black text-[#059669] font-sans">0 Violations</div>
            <p className="text-[11px] text-[#475569]">Across 5,000 scenarios</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#E5E7EB] shadow-2xs text-center space-y-1">
            <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">Average Recovery</span>
            <div className="text-xl font-black text-[#0891B2] font-sans">14.2 Hours</div>
            <p className="text-[11px] text-[#475569]">Optimal clearing window</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
