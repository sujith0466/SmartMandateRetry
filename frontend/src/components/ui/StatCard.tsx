import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';
import { AnimatedNumber } from '../../motion/AnimatedNumber';

interface StatCardProps {
  title: string;
  value?: string | number;
  numericValue?: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  formatIndianRupee?: boolean;
  subtitle?: string;
  icon: LucideIcon;
  variant?: 'emerald' | 'sapphire' | 'aqua' | 'violet' | 'amber' | 'slate' | 'rose' | 'blue' | 'indigo';
  delay?: number;
  highlight?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  numericValue,
  prefix = '',
  suffix = '',
  decimals = 0,
  formatIndianRupee = false,
  subtitle,
  icon: Icon,
  variant = 'sapphire',
  delay = 0,
  highlight = false,
}) => {
  let resolvedVariant = variant;
  if (resolvedVariant === 'blue') resolvedVariant = 'sapphire';
  if (resolvedVariant === 'indigo') resolvedVariant = 'violet';

  const iconThemes: Record<string, string> = {
    emerald: 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]',
    sapphire: 'bg-[#EEF2FF] text-[#3B5BDB] border-[#C7D2FE]',
    aqua: 'bg-[#ECFEFF] text-[#0891B2] border-[#A5F3FC]',
    violet: 'bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]',
    amber: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]',
    rose: 'bg-[#FFF1F2] text-[#E11D48] border-[#FECDD3]',
    slate: 'bg-[#F1F5F9] text-[#475569] border-[#E5E7EB]',
  };

  const themeClass = iconThemes[resolvedVariant] || iconThemes.sapphire;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -2, transition: { duration: 0.15, ease: [0.16, 1, 0.3, 1] } }}
      transition={{ duration: 0.22, delay, ease: [0.16, 1, 0.3, 1] }}
      className={`bg-white border rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow duration-150 relative overflow-hidden group ${
        highlight ? 'border-[#C7D2FE] ring-2 ring-[#EEF2FF]' : 'border-[#E5E7EB]'
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">{title}</p>
          <div className="text-2xl font-black tracking-tight text-[#111827] font-sans">
            {numericValue !== undefined ? (
              <AnimatedNumber
                value={numericValue}
                prefix={prefix}
                suffix={suffix}
                decimals={decimals}
                formatIndianRupee={formatIndianRupee}
              />
            ) : (
              value
            )}
          </div>
        </div>
        <div className={`p-2.5 rounded-xl border ${themeClass} transition-transform group-hover:scale-105 duration-150 shrink-0 shadow-2xs`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>
      {subtitle && (
        <div className="text-xs font-medium text-[#64748B] mt-3 pt-2.5 border-t border-[#E5E7EB] flex items-center justify-between">
          <span>{subtitle}</span>
        </div>
      )}
    </motion.div>
  );
};
