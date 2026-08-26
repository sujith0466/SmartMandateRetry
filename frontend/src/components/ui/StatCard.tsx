import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'emerald' | 'indigo' | 'violet' | 'amber' | 'slate' | 'rose' | 'cyan';
  delay?: number;
  highlight?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  variant = 'indigo',
  delay = 0,
  highlight = false,
}) => {
  const iconThemes = {
    emerald: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    indigo: 'bg-indigo-50 text-indigo-700 border-indigo-200',
    violet: 'bg-purple-50 text-purple-700 border-purple-200',
    amber: 'bg-amber-50 text-amber-700 border-amber-200',
    rose: 'bg-rose-50 text-rose-700 border-rose-200',
    cyan: 'bg-sky-50 text-sky-700 border-sky-200',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  }[variant];

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-all duration-150 relative overflow-hidden group ${
        highlight ? 'border-indigo-300 ring-2 ring-indigo-50/50' : 'border-slate-200/90'
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{title}</p>
          <div className="text-2xl font-black tracking-tight text-slate-900 font-sans">{value}</div>
        </div>
        <div className={`p-2.5 rounded-xl border ${iconThemes} transition-transform group-hover:scale-105 duration-150 shrink-0`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {subtitle && (
        <div className="text-xs font-medium text-slate-500 mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-between">
          <span>{subtitle}</span>
        </div>
      )}
    </motion.div>
  );
};
