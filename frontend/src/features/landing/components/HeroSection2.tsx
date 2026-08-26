import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowRight, LayoutDashboard, Terminal, CheckCircle2, ShieldCheck, Zap, Sparkles, Activity } from 'lucide-react';
import { RecoveryEngineCanvas } from './3d/RecoveryEngineCanvas';
import { useReducedMotion } from '../../../motion/useReducedMotion';

export const HeroSection2: React.FC = () => {
  const reducedMotion = useReducedMotion();

  const scrollToArchitecture = () => {
    const el = document.getElementById('architecture');
    if (el) el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  return (
    <section className="relative min-h-[96vh] pt-28 pb-20 flex flex-col justify-center overflow-hidden bg-[#FAF8F3]">
      {/* Background Subtle Ambiance Gradients */}
      <div className="absolute top-0 left-1/4 w-[750px] h-[500px] bg-[radial-gradient(circle_at_top,rgba(59,91,219,0.06)_0%,rgba(124,58,237,0.035)_40%,transparent_70%)] pointer-events-none -z-10" />
      <div className="absolute top-1/3 right-0 w-[550px] h-[550px] bg-[radial-gradient(circle_at_center,rgba(8,145,178,0.04)_0%,transparent_60%)] pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-6 sm:px-8 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-8 items-center">
          {/* Left Column (approx 42-45% width): Editorial Authority & Clear Message */}
          <div className="lg:col-span-5 xl:col-span-5 space-y-6 text-left">
            {/* Small Product Eyebrow (150ms entrance) */}
            <motion.div
              initial={reducedMotion ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, delay: 0.15 }}
            >
              <div className="inline-flex items-center gap-2.5 px-3.5 py-1.5 rounded-full bg-white border border-[#E8E1D5] shadow-2xs text-xs font-bold text-[#111827]">
                <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
                <span className="text-[#64748B] font-medium tracking-wider text-[11px]">AUTONOMOUS MANDATE RECOVERY</span>
                <span className="w-1 h-1 rounded-full bg-[#CBD5E1]" />
                <span className="text-[#059669] font-mono font-bold text-[11px]">+17.1 pp Uplift</span>
              </div>
            </motion.div>

            {/* Core Display Headline (250ms line-by-line reveal) */}
            <motion.h1
              initial={reducedMotion ? {} : { opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.25 }}
              className="text-4xl sm:text-5xl xl:text-6xl font-black text-[#111827] tracking-tight font-sans leading-[1.08]"
            >
              Every Failed Mandate Is a{' '}
              <span className="bg-gradient-to-r from-[#3B5BDB] via-[#7C3AED] to-[#0891B2] bg-clip-text text-transparent">
                Recovery Opportunity.
              </span>
            </motion.h1>

            {/* Concise Supporting Copy (400ms reveal) */}
            <motion.p
              initial={reducedMotion ? {} : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.4 }}
              className="text-sm sm:text-base text-[#475569] leading-relaxed font-medium max-w-xl"
            >
              When a recurring payment fails, SmartMandateRetry evaluates the failure, chooses the right recovery
              strategy, applies deterministic safety policies, and executes the safest path back to settlement.
            </motion.p>

            {/* CTA Row (500ms reveal) */}
            <motion.div
              initial={reducedMotion ? {} : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.5 }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1"
            >
              <Link
                to="/dashboard"
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#3B5BDB] hover:bg-[#3048B8] text-white text-xs sm:text-sm font-bold shadow-md shadow-[#3B5BDB]/25 hover:shadow-lg transition-all duration-200"
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Open Merchant Console</span>
                <ArrowRight className="w-4 h-4" />
              </Link>

              <button
                onClick={scrollToArchitecture}
                className="flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-[#F3EFE6] text-[#111827] text-xs sm:text-sm font-bold border border-[#E8E1D5] shadow-2xs transition-all duration-200"
              >
                <Terminal className="w-4 h-4 text-[#7C3AED]" />
                <span>See How Recovery Works</span>
              </button>
            </motion.div>

            {/* Restrained Verified Trust Strip */}
            <motion.div
              initial={reducedMotion ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: 0.6 }}
              className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-[#E8E1D5]"
            >
              <div className="space-y-0.5">
                <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">Recovery Uplift</span>
                <div className="text-lg font-black text-[#059669] font-sans">+17.1 pp</div>
                <p className="text-[10px] text-[#64748B]">vs fixed retries</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">Platform Rate</span>
                <div className="text-lg font-black text-[#3B5BDB] font-sans">48.3%</div>
                <p className="text-[10px] text-[#64748B]">Eligible cohorts</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">Deterministic</span>
                <div className="text-lg font-black text-[#059669] font-sans">0 Violations</div>
                <p className="text-[10px] text-[#64748B]">P0–P4 enforced</p>
              </div>

              <div className="space-y-0.5">
                <span className="text-[10px] text-[#64748B] font-bold uppercase tracking-wider">Benchmarking</span>
                <div className="text-lg font-black text-[#0891B2] font-sans">5,000</div>
                <p className="text-[10px] text-[#64748B]">Certified scenarios</p>
              </div>
            </motion.div>
          </div>

          {/* Right Column (approx 55-58% width): Autonomous Recovery 3D Cockpit (600ms sequence) */}
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, scale: 0.97 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.45, delay: 0.3 }}
            className="lg:col-span-7 xl:col-span-7 relative"
          >
            {/* Deep Slate / Ink Container */}
            <div className="relative w-full h-[540px] sm:h-[600px] rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#111827] to-[#1E293B] border border-slate-700/80 shadow-2xl shadow-[#0F172A]/30 overflow-hidden flex flex-col justify-between p-4 sm:p-5 text-white select-none">
              {/* Volumetric Radial Glows */}
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#3B5BDB]/20 rounded-full blur-3xl pointer-events-none" />
              <div className="absolute bottom-0 left-0 w-80 h-80 bg-[#7C3AED]/20 rounded-full blur-3xl pointer-events-none" />

              {/* Cockpit Top Bar */}
              <div className="relative z-10 flex items-center justify-between px-3 py-2 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-xs">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-[#059669] animate-pulse" />
                  <span className="font-mono font-bold text-slate-200 text-[11px] tracking-wider">
                    AUTONOMOUS RECOVERY CIRCUIT
                  </span>
                </div>
                <div className="flex items-center gap-2 font-mono text-[10px] text-slate-400">
                  <span className="text-[#A5F3FC]">LIVE CIRCUIT</span>
                  <span>•</span>
                  <span>6 STAGES ACTIVE</span>
                </div>
              </div>

              {/* Central 3D Canvas with 6 Product Stage HUD Badges */}
              <div className="relative w-full flex-1 my-2">
                <RecoveryEngineCanvas />

                {/* Stage 1: Payment Failed (800ms reveal) */}
                <motion.div
                  initial={reducedMotion ? {} : { opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.8 }}
                  className="absolute top-3 left-3 hidden sm:flex flex-col gap-0.5 p-2.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-[#0891B2]/50 shadow-lg text-[10px] max-w-[170px]"
                >
                  <div className="flex items-center justify-between text-[#0891B2] font-bold font-mono">
                    <span className="flex items-center gap-1">
                      <Activity className="w-3 h-3" /> 1. PAYMENT FAILED
                    </span>
                  </div>
                  <div className="text-slate-200 font-mono font-bold">Event Detected</div>
                  <div className="text-slate-400 text-[9px]">Insufficient Funds</div>
                </motion.div>

                {/* Stage 2: Context Evaluation (1100ms reveal) */}
                <motion.div
                  initial={reducedMotion ? {} : { opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 1.1 }}
                  className="absolute top-3 right-3 hidden sm:flex flex-col gap-0.5 p-2.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-[#7C3AED]/50 shadow-lg text-[10px] max-w-[170px]"
                >
                  <div className="flex items-center justify-between text-[#A78BFA] font-bold font-mono">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-[#7C3AED]" /> 2. CONTEXT
                    </span>
                  </div>
                  <div className="text-slate-200 font-mono font-bold">Evaluated</div>
                  <div className="text-slate-400 text-[9px]">History • Liquidity Window</div>
                </motion.div>

                {/* Stage 3 & 4: AI Strategy + Deterministic Safety Gate (1400ms & 1700ms reveal) */}
                <motion.div
                  initial={reducedMotion ? {} : { opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 1.4 }}
                  className="absolute bottom-3 left-3 hidden sm:flex flex-col gap-0.5 p-2.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-[#059669]/50 shadow-lg text-[10px] max-w-[180px]"
                >
                  <div className="flex items-center justify-between text-[#059669] font-bold font-mono">
                    <span className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" /> 4. SAFETY GATE
                    </span>
                    <span className="text-[#059669] font-bold text-[9px]">PASSED</span>
                  </div>
                  <div className="text-slate-200 font-mono font-bold">Deterministic Policy</div>
                  <div className="text-slate-400 text-[9px]">Validates what AI can execute</div>
                </motion.div>

                {/* Stage 5 & 6: Recovery Dispatch & Settlement (2000ms & 2300ms reveal) */}
                <motion.div
                  initial={reducedMotion ? {} : { opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 2.0 }}
                  className="absolute bottom-3 right-3 hidden sm:flex flex-col gap-0.5 p-2.5 rounded-xl bg-slate-900/90 backdrop-blur-md border border-[#3B5BDB]/50 shadow-lg text-[10px] max-w-[180px]"
                >
                  <div className="flex items-center justify-between text-[#60A5FA] font-bold font-mono">
                    <span className="flex items-center gap-1">
                      <Zap className="w-3 h-3 text-[#3B5BDB]" /> 5. RECOVERY
                    </span>
                    <span className="text-[#059669] font-bold text-[9px]">DISPATCHED</span>
                  </div>
                  <div className="text-slate-200 font-mono font-bold truncate">Payment Link / Retry</div>
                  <div className="text-slate-400 text-[9px]">Active Rail Execution</div>
                </motion.div>
              </div>

              {/* Bottom Cockpit Live Ribbon: Stage 6 Settlement Reconciled */}
              <motion.div
                initial={reducedMotion ? {} : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 2.3 }}
                className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-2 px-3.5 py-2.5 rounded-2xl bg-white/5 backdrop-blur-md border border-white/10 text-xs font-mono"
              >
                <div className="flex items-center gap-2 text-slate-300 text-[11px]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#059669] shrink-0" />
                  <span>STAGE 6: SETTLEMENT RECONCILED (₹29,497.00)</span>
                </div>
                <div className="text-[10px] text-[#A5F3FC]">
                  LEDGER LOGGED • 0 POLICY VETOES
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};
