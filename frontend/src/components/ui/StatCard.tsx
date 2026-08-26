import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'emerald' | 'indigo' | 'violet' | 'amber' | 'slate';
  delay?: number;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'indigo',
  delay = 0,
}) => {
  const iconThemes = {
    emerald: 'bg-emerald-950/80 text-emerald-400 border-emerald-800/60 shadow-[0_0_15px_rgba(16,185,129,0.15)]',
    indigo: 'bg-indigo-950/80 text-indigo-400 border-indigo-800/60 shadow-[0_0_15px_rgba(99,102,241,0.15)]',
    violet: 'bg-violet-950/80 text-violet-400 border-violet-800/60 shadow-[0_0_15px_rgba(139,92,246,0.15)]',
    amber: 'bg-amber-950/80 text-amber-400 border-amber-800/60 shadow-[0_0_15px_rgba(245,158,11,0.15)]',
    slate: 'bg-slate-800/80 text-slate-400 border-slate-700/60',
  }[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.25, delay, ease: [0.16, 1, 0.3, 1] }}
      className="glass-card p-5 rounded-2xl relative overflow-hidden group"
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1.5">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{title}</p>
          <div className="text-2xl font-extrabold tracking-tight text-white">{value}</div>
        </div>
        <div className={`p-2.5 rounded-xl border ${iconThemes} transition-transform group-hover:scale-105 duration-200`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {subtitle && <p className="text-xs font-medium text-slate-400 mt-3 flex items-center gap-1">{subtitle}</p>}
    </motion.div>
  );
};
