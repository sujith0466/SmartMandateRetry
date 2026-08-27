import React from 'react';
import { motion } from 'framer-motion';
import { LucideIcon, ArrowUpRight } from 'lucide-react';
import { AnimatedNumber } from '../../motion/AnimatedNumber';
import { InsightTooltip } from './InsightTooltip';

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
  tooltip?: string;
  isInspectable?: boolean;
  onClick?: () => void;
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
  tooltip,
  isInspectable = false,
  onClick,
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

  const highlightThemes: Record<string, string> = {
    emerald: 'border-[#6EE7B7] ring-2 ring-[#ECFDF5] bg-gradient-to-br from-white via-white to-[#ECFDF5]/50 shadow-md',
    sapphire: 'border-[#C7D2FE] ring-2 ring-[#EEF2FF] bg-gradient-to-br from-white via-white to-[#EEF2FF]/50 shadow-md',
    aqua: 'border-[#A5F3FC] ring-2 ring-[#ECFEFF] shadow-md',
    violet: 'border-[#DDD6FE] ring-2 ring-[#F5F3FF] shadow-md',
    amber: 'border-[#FDE68A] ring-2 ring-[#FFFBEB] shadow-md',
    rose: 'border-[#FECDD3] ring-2 ring-[#FFF1F2] shadow-md',
    slate: 'border-[#CBD5E1] ring-2 ring-[#F1F5F9] shadow-md',
  };

  const themeClass = iconThemes[resolvedVariant] || iconThemes.sapphire;
  const highlightClass = highlightThemes[resolvedVariant] || 'border-[#C7D2FE] ring-2 ring-[#EEF2FF]';

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={onClick || isInspectable ? { y: -2, transition: { duration: 0.15, ease: [0.16, 1, 0.3, 1] } } : {}}
      whileTap={onClick || isInspectable ? { scale: 0.99 } : {}}
      transition={{ duration: 0.22, delay, ease: [0.16, 1, 0.3, 1] }}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      className={`border rounded-2xl p-5 transition-all duration-150 relative overflow-hidden group text-left ${
        onClick ? 'cursor-pointer hover:shadow-md' : 'shadow-sm'
      } ${
        highlight ? highlightClass : 'bg-white border-[#E5E7EB]'
      }`}
    >
      <div className="flex justify-between items-start">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#64748B]">{title}</p>
            {highlight && resolvedVariant === 'emerald' && (
              <span className="text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] font-mono">
                Primary
              </span>
            )}
            {tooltip && <InsightTooltip content={tooltip} title={title} />}
          </div>

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

        <div className="flex items-center gap-2">
          {isInspectable && (
            <div className="p-1 rounded-lg bg-[#F7F9FC] text-[#94A3B8] group-hover:text-[#3B5BDB] group-hover:bg-[#EEF2FF] transition-colors">
              <ArrowUpRight className="w-3.5 h-3.5" />
            </div>
          )}
          <div className={`p-2.5 rounded-xl border ${themeClass} transition-transform group-hover:scale-105 duration-150 shrink-0 shadow-2xs`}>
            <Icon className="w-5 h-5" />
          </div>
        </div>
      </div>

      {subtitle && (
        <div className="text-xs font-medium text-[#64748B] mt-3 pt-2.5 border-t border-[#E5E7EB] flex items-center justify-between">
          <span>{subtitle}</span>
          {isInspectable && (
            <span className="text-[10px] font-bold text-[#3B5BDB] opacity-0 group-hover:opacity-100 transition-opacity font-mono">
              Inspect →
            </span>
          )}
        </div>
      )}
    </motion.div>
  );
};
