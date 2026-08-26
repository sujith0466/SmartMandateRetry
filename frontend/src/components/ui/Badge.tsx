import React from 'react';
import { CaseState } from '../../types';

interface BadgeProps {
  state?: CaseState | string;
  variant?: 'emerald' | 'sapphire' | 'aqua' | 'violet' | 'amber' | 'rose' | 'slate' | 'blue' | 'indigo';
  dot?: boolean;
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ state, variant, dot = true, children }) => {
  let resolvedVariant = variant || 'slate';

  if (state) {
    const s = state.toUpperCase();
    if (['RECOVERED', 'HEALTHY', 'ACTIVE', 'CONNECTED', 'SUCCESS', 'ALLOWED', 'PASSED'].includes(s)) resolvedVariant = 'emerald';
    else if (['SCHEDULED', 'ACTION_PENDING', 'READY'].includes(s)) resolvedVariant = 'sapphire';
    else if (['OPENROUTER', 'AI_PROPOSED', 'AI_DECISION'].includes(s)) resolvedVariant = 'violet';
    else if (['POLICY_REVIEW', 'ESCALATED', 'MODIFIED', 'REVIEW_REQUIRED'].includes(s)) resolvedVariant = 'amber';
    else if (['IN_PROGRESS', 'WAITING_FOR_OUTCOME', 'ANALYZING', 'DETECTED', 'DECISION_PENDING'].includes(s)) resolvedVariant = 'aqua';
    else if (['FAILED', 'HALTED', 'STOPPED', 'EXPIRED', 'UNHEALTHY', 'BLOCKED', 'OFFLINE', 'REJECTED'].includes(s)) resolvedVariant = 'rose';
  }

  // Fallback aliases
  if (resolvedVariant === 'blue') resolvedVariant = 'sapphire';
  if (resolvedVariant === 'indigo') resolvedVariant = 'violet';

  const styles: Record<string, string> = {
    emerald: 'bg-[#ECFDF5] text-[#059669] border-[#A7F3D0]',
    sapphire: 'bg-[#EEF2FF] text-[#3B5BDB] border-[#C7D2FE]',
    aqua: 'bg-[#ECFEFF] text-[#0891B2] border-[#A5F3FC]',
    violet: 'bg-[#F5F3FF] text-[#7C3AED] border-[#DDD6FE]',
    amber: 'bg-[#FFFBEB] text-[#D97706] border-[#FDE68A]',
    rose: 'bg-[#FFF1F2] text-[#E11D48] border-[#FECDD3]',
    slate: 'bg-[#F1F5F9] text-[#475569] border-[#E5E7EB]',
  };

  const dotColors: Record<string, string> = {
    emerald: 'bg-[#059669]',
    sapphire: 'bg-[#3B5BDB]',
    aqua: 'bg-[#0891B2]',
    violet: 'bg-[#7C3AED]',
    amber: 'bg-[#D97706]',
    rose: 'bg-[#E11D48]',
    slate: 'bg-[#94A3B8]',
  };

  const activeStyle = styles[resolvedVariant] || styles.slate;
  const activeDot = dotColors[resolvedVariant] || dotColors.slate;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-tight border ${activeStyle} transition-colors shadow-2xs`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${activeDot}`} />}
      {children || state}
    </span>
  );
};
