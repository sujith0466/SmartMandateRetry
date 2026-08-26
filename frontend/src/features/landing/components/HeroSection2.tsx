import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, LayoutDashboard, Terminal, Sparkles, Activity, CheckCircle2, Lock } from 'lucide-react';
import { RecoveryEngineCanvas } from './3d/RecoveryEngineCanvas';
import { useReducedMotion } from '../../../motion/useReducedMotion';

export const HeroSection2: React.FC = () => {
  const reducedMotion = useReducedMotion();

  const scrollToArchitecture = () => {
    const el = document.getElementById('architecture');
    if (el) el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <section className="relative min-h-[92vh] pt-32 pb-16 flex flex-col justify-between overflow-hidden bg-[#FAF8F3]">
      {/* Background Subtle Warm Radial */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-[600px] bg-[radial-gradient(ellipse_at_top,rgba(59,91,219,0.06)_0%,rgba(124,58,237,0.03)_40%,transparent_70%)] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 w-full space-y-10">
        {/* Top Trust Badge */}
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="flex justify-center"
        >
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-white/80 backdrop-blur-md border border-[#E8E1D5] shadow-2xs text-xs font-bold text-[#111827]">
            <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
            <span className="text-[#64748B] font-medium">AUTONOMOUS MANDATE RECOVERY ENGINE</span>
            <span className="w-1 h-1 rounded-full bg-[#CBD5E1]" />
            <span className="text-[#059669] font-mono font-bold">+17.1 pp Verified Uplift</span>
          </div>
        </motion.div>

        {/* Main Headline & Supporting Paragraph */}
        <div className="text-center max-w-4xl mx-auto space-y-5">
          <motion.h1
            initial={reducedMotion ? {} : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.05 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-black text-[#111827] tracking-tight font-sans leading-[1.08]"
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
            AI proposes the optimal recovery strategy. Deterministic zero-tolerance policies govern what is allowed.
            The system executes safely on active payment rails.
          </motion.p>

          {/* Action CTAs */}
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: 0.15 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-3.5 pt-2"
          >
            <Link
              to="/dashboard"
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-7 py-3.5 rounded-2xl bg-[#3B5BDB] hover:bg-[#3048B8] text-white text-sm font-bold shadow-md shadow-[#3B5BDB]/25 hover:shadow-lg transition-all"
            >
              <LayoutDashboard className="w-4 h-4" />
              <span>Open Merchant Console</span>
              <ArrowRight className="w-4 h-4" />
            </Link>

            <button
              onClick={scrollToArchitecture}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-[#F3EFE6] text-[#111827] text-sm font-bold border border-[#E8E1D5] shadow-2xs transition-all"
            >
              <Terminal className="w-4 h-4 text-[#7C3AED]" />
              <span>Explore Dual-Brain Architecture</span>
            </button>
          </motion.div>
        </div>

        {/* Cinematic 3D Autonomous Recovery Engine Container with Floating Telemetry */}
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.45, delay: 0.2 }}
          className="relative max-w-5xl mx-auto h-[460px] sm:h-[520px] bg-gradient-to-b from-white/90 via-[#FAF8F3] to-white/70 rounded-3xl border border-[#E8E1D5] shadow-md shadow-[#111827]/5 overflow-hidden"
        >
          {/* Three.js R3F Canvas */}
          <RecoveryEngineCanvas />

          {/* Floating Glass Telemetry Badges */}
          <div className="absolute top-5 left-5 hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/85 backdrop-blur-md border border-[#E8E1D5] shadow-2xs text-[11px] font-bold text-[#7C3AED]">
            <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" />
            <span>AI DECISION: Context-Aware (91% Confidence)</span>
          </div>

          <div className="absolute top-5 right-5 hidden sm:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/85 backdrop-blur-md border border-[#A7F3D0] shadow-2xs text-[11px] font-bold text-[#059669]">
            <Lock className="w-3.5 h-3.5 text-[#059669]" />
            <span>SAFETY GATE: 0 Policy Violations</span>
          </div>

          <div className="absolute bottom-5 left-5 hidden md:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/85 backdrop-blur-md border border-[#C7D2FE] shadow-2xs text-[11px] font-bold text-[#3B5BDB]">
            <Activity className="w-3.5 h-3.5 text-[#3B5BDB]" />
            <span>RECOVERY UPLIFT: +17.1 pp over Baseline</span>
          </div>

          <div className="absolute bottom-5 right-5 hidden md:flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white/85 backdrop-blur-md border border-[#A7F3D0] shadow-2xs text-[11px] font-bold text-[#059669]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#059669]" />
            <span>SETTLEMENT: Reconciled Cohort</span>
          </div>
        </motion.div>

        {/* 4 Macro Key Metrics Strip on Cream Surface */}
        <motion.div
          initial={reducedMotion ? {} : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto pt-2"
        >
          <div className="p-4 rounded-2xl bg-white border border-[#E8E1D5] shadow-2xs text-center space-y-1">
            <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">Recovery Uplift</span>
            <div className="text-xl font-black text-[#059669] font-sans">+17.1 pp</div>
            <p className="text-[11px] text-[#475569]">Over native fixed retries</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#E8E1D5] shadow-2xs text-center space-y-1">
            <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">Platform Recovery</span>
            <div className="text-xl font-black text-[#3B5BDB] font-sans">48.3%</div>
            <p className="text-[11px] text-[#475569]">On eligible failure cohorts</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#E8E1D5] shadow-2xs text-center space-y-1">
            <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">Deterministic Safety</span>
            <div className="text-xl font-black text-[#059669] font-sans">0 Violations</div>
            <p className="text-[11px] text-[#475569]">Across 5,000 scenarios</p>
          </div>

          <div className="p-4 rounded-2xl bg-white border border-[#E8E1D5] shadow-2xs text-center space-y-1">
            <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">Average Recovery</span>
            <div className="text-xl font-black text-[#0891B2] font-sans">14.2 Hours</div>
            <p className="text-[11px] text-[#475569]">Optimal clearing window</p>
          </div>
        </motion.div>
      </div>
    </section>
  );
};
