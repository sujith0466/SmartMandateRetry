import React from 'react';
import { motion } from 'framer-motion';
import { FlaskConical } from 'lucide-react';

export const EvaluationPage: React.FC = () => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <div>
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-black text-white tracking-tight">Evaluation Lab</h1>
          <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-indigo-950/80 text-indigo-300 border border-indigo-800/60">
            BENCHMARK READY
          </span>
        </div>
        <p className="text-xs text-slate-400 mt-1">
          Empirical benchmarking environment comparing SmartMandateRetry against Razorpay native and rule-based baselines across 5,000 synthetic failure scenarios.
        </p>
      </div>

      <div className="glass-card rounded-2xl p-12 text-center border border-slate-800/80 shadow-2xl space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-indigo-950/80 border border-indigo-800/60 flex items-center justify-center mx-auto text-indigo-400 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
          <FlaskConical className="w-7 h-7" />
        </div>
        <div>
          <h3 className="text-base font-bold text-white">Comparative Benchmark Lab</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            Synthetic dataset runner, recovery uplift calculator, and confusion matrix visualizer will execute in Phase 16–18 per the evaluation plan.
          </p>
        </div>
      </div>
    </motion.div>
  );
};
