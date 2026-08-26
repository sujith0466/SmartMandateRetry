import React from 'react';
import { CaseState } from '../../types';

interface BadgeProps {
  state?: CaseState | string;
  variant?: 'emerald' | 'indigo' | 'violet' | 'amber' | 'rose' | 'slate';
  dot?: boolean;
  children?: React.ReactNode;
}

export const Badge: React.FC<BadgeProps> = ({ state, variant, dot = true, children }) => {
  let resolvedVariant = variant || 'slate';

  if (state) {
    if (state === 'RECOVERED' || state === 'HEALTHY' || state === 'ACTIVE') resolvedVariant = 'emerald';
    else if (state === 'SCHEDULED' || state === 'ACTION_PENDING' || state === 'READY') resolvedVariant = 'indigo';
    else if (state === 'POLICY_REVIEW' || state === 'ESCALATED') resolvedVariant = 'violet';
    else if (state === 'IN_PROGRESS' || state === 'WAITING_FOR_OUTCOME' || state === 'ANALYZING') resolvedVariant = 'amber';
    else if (state === 'FAILED' || state === 'STOPPED' || state === 'EXPIRED' || state === 'UNHEALTHY') resolvedVariant = 'rose';
  }

  const styles = {
    emerald: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60 shadow-[0_0_10px_rgba(16,185,129,0.1)]',
    indigo: 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60 shadow-[0_0_10px_rgba(99,102,241,0.1)]',
    violet: 'bg-violet-950/60 text-violet-300 border-violet-800/60 shadow-[0_0_10px_rgba(139,92,246,0.1)]',
    amber: 'bg-amber-950/60 text-amber-300 border-amber-800/60 shadow-[0_0_10px_rgba(245,158,11,0.1)]',
    rose: 'bg-rose-950/60 text-rose-300 border-rose-800/60 shadow-[0_0_10px_rgba(244,63,94,0.1)]',
    slate: 'bg-slate-800/60 text-slate-300 border-slate-700/60',
  }[resolvedVariant];

  const dotColors = {
    emerald: 'bg-emerald-400 animate-pulse',
    indigo: 'bg-indigo-400',
    violet: 'bg-violet-400 animate-pulse',
    amber: 'bg-amber-400 animate-pulse',
    rose: 'bg-rose-400',
    slate: 'bg-slate-400',
  }[resolvedVariant];

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold tracking-wide border ${styles} transition-colors`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${dotColors}`} />}
      {children || state}
    </span>
  );
};
