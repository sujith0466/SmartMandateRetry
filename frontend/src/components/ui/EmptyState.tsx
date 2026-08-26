import React from 'react';
import { LucideIcon } from 'lucide-react';
import { motion } from 'framer-motion';
import { useReducedMotion } from '../../motion/useReducedMotion';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  actionIcon?: LucideIcon;
  className?: string;
}

export const EmptyState: React.FC<EmptyStateProps> = ({
  icon: Icon,
  title,
  description,
  actionLabel,
  onAction,
  actionIcon: ActionIcon,
  className = '',
}) => {
  const reducedMotion = useReducedMotion();

  return (
    <div
      className={`flex flex-col items-center justify-center p-12 text-center rounded-2xl bg-white border border-[#E5E7EB] shadow-2xs ${className}`}
    >
      <div className="w-12 h-12 rounded-2xl bg-[#F7F9FC] border border-[#E5E7EB] flex items-center justify-center text-[#64748B] mb-4 shadow-2xs">
        <Icon className="w-6 h-6" />
      </div>

      <h3 className="text-sm font-bold text-[#111827] font-sans tracking-tight mb-1">{title}</h3>
      <p className="text-xs text-[#64748B] max-w-sm leading-relaxed mb-5">{description}</p>

      {actionLabel && onAction && (
        <motion.button
          whileHover={reducedMotion ? {} : { translateY: -1 }}
          whileTap={reducedMotion ? {} : { scale: 0.98 }}
          onClick={onAction}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B5BDB] hover:bg-[#3048B8] text-white text-xs font-bold shadow-xs transition-colors"
        >
          {ActionIcon && <ActionIcon className="w-3.5 h-3.5" />}
          <span>{actionLabel}</span>
        </motion.button>
      )}
    </div>
  );
};
