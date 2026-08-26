import React from 'react';
import { CaseState } from '../../types';

interface BadgeProps {
  state?: CaseState | string;
  variant?: 'emerald' | 'indigo' | 'violet' | 'amber' | 'rose' | 'slate' | 'cyan';
  dot?: boolean;
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ state, variant, dot = true, children }) => {
  let resolvedVariant = variant || 'slate';

  if (state) {
    const s = state.toUpperCase();
    if (['RECOVERED', 'HEALTHY', 'ACTIVE', 'CONNECTED', 'SUCCESS', 'ALLOWED'].includes(s)) resolvedVariant = 'emerald';
    else if (['SCHEDULED', 'ACTION_PENDING', 'READY', 'OPENROUTER'].includes(s)) resolvedVariant = 'indigo';
    else if (['POLICY_REVIEW', 'ESCALATED', 'MODIFIED'].includes(s)) resolvedVariant = 'amber';
    else if (['IN_PROGRESS', 'WAITING_FOR_OUTCOME', 'ANALYZING', 'DETECTED', 'DECISION_PENDING'].includes(s)) resolvedVariant = 'cyan';
    else if (['FAILED', 'HALTED', 'STOPPED', 'EXPIRED', 'UNHEALTHY', 'BLOCKED', 'OFFLINE'].includes(s)) resolvedVariant = 'rose';
  }

  const styles = {
    emerald: 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-sm',
    indigo: 'bg-indigo-50 text-indigo-800 border-indigo-200 shadow-sm',
    violet: 'bg-purple-50 text-purple-800 border-purple-200 shadow-sm',
    amber: 'bg-amber-50 text-amber-800 border-amber-200 shadow-sm',
    rose: 'bg-rose-50 text-rose-800 border-rose-200 shadow-sm',
    cyan: 'bg-sky-50 text-sky-800 border-sky-200 shadow-sm',
    slate: 'bg-slate-100 text-slate-700 border-slate-200',
  }[resolvedVariant] || 'bg-slate-100 text-slate-700 border-slate-200';

  const dotColors = {
    emerald: 'bg-emerald-500',
    indigo: 'bg-indigo-500',
    violet: 'bg-purple-500',
    amber: 'bg-amber-500',
    rose: 'bg-rose-500',
    cyan: 'bg-sky-500',
    slate: 'bg-slate-400',
  }[resolvedVariant] || 'bg-slate-400';

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold tracking-tight border ${styles} transition-colors`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors}`} />}
      {children || state}
    </span>
  );
};
