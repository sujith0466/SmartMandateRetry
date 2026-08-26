import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, AlertCircle, Lock, ShieldAlert, ShieldCheck, Scale, Clock, Award } from 'lucide-react';
import { fetchPolicies } from '../../services/api';
import { MerchantPolicy } from '../../types';
import { Skeleton } from '../../components/ui/SkeletonLoader';

export const PoliciesPage: React.FC = () => {
  const [policy, setPolicy] = useState<MerchantPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPolicies = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPolicies();
      setPolicy(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load merchant safety policies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-44 rounded-2xl" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Merchant Safety Policies</h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-violet-950/80 text-violet-300 border border-violet-800/60">
              IMMUTABLE RULES
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Deterministic recovery safety rules, contact frequency limits & hard-decline protections
          </p>
        </div>
        <button
          onClick={loadPolicies}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="glass-panel border-rose-800/80 rounded-2xl p-4 flex items-center justify-between text-xs text-rose-300 bg-rose-950/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={loadPolicies} className="font-bold text-rose-300 underline">
            Retry
          </button>
        </div>
      )}

      {/* Policy Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Max Retries */}
        <div className="glass-card p-6 rounded-2xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Max Retries Per Case</span>
            <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono">{policy?.max_retries_per_case || 3} Attempts</div>
          <p className="text-xs text-slate-400">Maximum execution attempts before auto-stopping a failed mandate.</p>
          <div className="pt-2 border-t border-slate-800/60 flex justify-between items-center text-[11px] text-slate-500">
            <span>Rule: `MAX_RETRIES_CAP`</span>
            <span className="text-emerald-400 font-semibold">Active</span>
          </div>
        </div>

        {/* Retry Interval */}
        <div className="glass-card p-6 rounded-2xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Min Retry Interval</span>
            <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono">{policy?.min_retry_interval_hours || 24} Hours</div>
          <p className="text-xs text-slate-400">Minimum spacing interval between successive recovery actions.</p>
          <div className="pt-2 border-t border-slate-800/60 flex justify-between items-center text-[11px] text-slate-500">
            <span>Rule: `MIN_RETRY_INTERVAL`</span>
            <span className="text-emerald-400 font-semibold">Active</span>
          </div>
        </div>

        {/* Recovery Window */}
        <div className="glass-card p-6 rounded-2xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recovery Window</span>
            <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono">{policy?.max_recovery_window_days || 14} Days</div>
          <p className="text-xs text-slate-400">Maximum lifespan before an unrecovered case expires.</p>
          <div className="pt-2 border-t border-slate-800/60 flex justify-between items-center text-[11px] text-slate-500">
            <span>Rule: `RECOVERY_WINDOW_LIMIT`</span>
            <span className="text-emerald-400 font-semibold">Active</span>
          </div>
        </div>

        {/* High Value Threshold */}
        <div className="glass-card p-6 rounded-2xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">High-Value Threshold</span>
            <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-indigo-400 font-mono">
            ₹{policy?.high_value_threshold_inr?.toLocaleString('en-IN') || '10,000'}
          </div>
          <p className="text-xs text-slate-400">Invoices at or above this amount require human escalation.</p>
          <div className="pt-2 border-t border-slate-800/60 flex justify-between items-center text-[11px] text-slate-500">
            <span>Rule: `HIGH_VALUE_ESCALATION`</span>
            <span className="text-indigo-400 font-semibold">Protected</span>
          </div>
        </div>

        {/* AI Confidence Minimum */}
        <div className="glass-card p-6 rounded-2xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Min AI Confidence</span>
            <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono">
            {((policy?.min_confidence_threshold || 0.75) * 100).toFixed(0)}%
          </div>
          <p className="text-xs text-slate-400">AI decisions below this confidence score are automatically vetoed.</p>
          <div className="pt-2 border-t border-slate-800/60 flex justify-between items-center text-[11px] text-slate-500">
            <span>Rule: `LOW_CONFIDENCE_VETO`</span>
            <span className="text-emerald-400 font-semibold">Active</span>
          </div>
        </div>

        {/* Hard Decline Auto-Stop */}
        <div className="glass-card p-6 rounded-2xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hard Decline Auto-Stop</span>
            <div className="p-1.5 rounded-lg bg-rose-950/80 text-rose-400">
              <ShieldAlert className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-400 font-mono">ENABLED</div>
          <p className="text-xs text-slate-400">
            Mandate cancellations or stolen card errors permanently stop recovery.
          </p>
          <div className="pt-2 border-t border-slate-800/60 flex justify-between items-center text-[11px] text-slate-500">
            <span>Rule: `HARD_DECLINE_VETO`</span>
            <span className="text-emerald-400 font-semibold">Enforced</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
