import React from 'react';
import { CaseState } from '../../types';

interface BadgeProps {
  state?: CaseState | string;
  variant?: 'emerald' | 'blue' | 'indigo' | 'cyan' | 'amber' | 'rose' | 'slate' | 'violet';
  dot?: boolean;
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ state, variant, dot = true, children }) => {
  let resolvedVariant = variant || 'slate';

  if (state) {
    const s = state.toUpperCase();
    if (['RECOVERED', 'HEALTHY', 'ACTIVE', 'CONNECTED', 'SUCCESS', 'ALLOWED', 'PASSED'].includes(s)) resolvedVariant = 'emerald';
    else if (['SCHEDULED', 'ACTION_PENDING', 'READY'].includes(s)) resolvedVariant = 'blue';
    else if (['OPENROUTER', 'AI_PROPOSED', 'AI_DECISION'].includes(s)) resolvedVariant = 'indigo';
    else if (['POLICY_REVIEW', 'ESCALATED', 'MODIFIED', 'REVIEW_REQUIRED'].includes(s)) resolvedVariant = 'amber';
    else if (['IN_PROGRESS', 'WAITING_FOR_OUTCOME', 'ANALYZING', 'DETECTED', 'DECISION_PENDING'].includes(s)) resolvedVariant = 'cyan';
    else if (['FAILED', 'HALTED', 'STOPPED', 'EXPIRED', 'UNHEALTHY', 'BLOCKED', 'OFFLINE', 'REJECTED'].includes(s)) resolvedVariant = 'rose';
  }

  const styles: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs',
    blue: 'bg-blue-50 text-blue-800 border-blue-200 shadow-2xs',
    indigo: 'bg-indigo-50 text-indigo-800 border-indigo-200 shadow-2xs',
    violet: 'bg-purple-50 text-purple-800 border-purple-200 shadow-2xs',
    amber: 'bg-amber-50 text-amber-800 border-amber-200 shadow-2xs',
    rose: 'bg-rose-50 text-rose-800 border-rose-200 shadow-2xs',
    cyan: 'bg-cyan-50 text-cyan-800 border-cyan-200 shadow-2xs',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  };

  const dotColors: Record<string, string> = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-600',
    indigo: 'bg-indigo-500',
    violet: 'bg-purple-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    cyan: 'bg-cyan-500',
    slate: 'bg-slate-400',
  };

  const activeStyle = styles[resolvedVariant] || styles.slate;
  const activeDot = dotColors[resolvedVariant] || dotColors.slate;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-tight border ${activeStyle} transition-colors`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${activeDot}`} />}
      {children || state}
    </span>
  );
};
