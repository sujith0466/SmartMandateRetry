import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  RefreshCw,
  AlertCircle,
  Lock,
  ShieldAlert,
  ShieldCheck,
  Scale,
  Clock,
  Award,
  Edit3,
  History,
  CheckCircle2,
  Users,
} from 'lucide-react';
import { fetchPolicies, fetchPolicyHistory } from '../../services/api';
import { MerchantPolicy, PolicyHistoryItem } from '../../types';
import { Skeleton } from '../../components/ui/SkeletonLoader';
import { ToastContainer, ToastMessage } from '../../components/ui/Toast';
import { PolicyEditorModal } from './PolicyEditorModal';

const DETERMINISTIC_RULES = [
  {
    id: 'HARD_DECLINE_VETO',
    name: 'Hard Decline Safety Veto',
    priority: 'P0 (Highest)',
    desc: 'Immediately halts recovery on non-recoverable error codes (account closed, stolen card).',
    status: 'ACTIVE',
  },
  {
    id: 'MAX_RETRIES_CAP',
    name: 'Maximum Retries Cap',
    priority: 'P1',
    desc: 'Vetoes execution if case attempt count reaches merchant threshold.',
    status: 'ACTIVE',
  },
  {
    id: 'MIN_RETRY_INTERVAL',
    name: 'Minimum Spacing Interval',
    priority: 'P2',
    desc: 'Delays retry dispatch until minimum elapsed hours have passed.',
    status: 'ACTIVE',
  },
  {
    id: 'HIGH_VALUE_ESCALATION',
    name: 'High-Value Escalation',
    priority: 'P2',
    desc: 'Routes high-value invoices to manual merchant review.',
    status: 'ACTIVE',
  },
  {
    id: 'LOW_CONFIDENCE_VETO',
    name: 'Low Confidence AI Gate',
    priority: 'P3',
    desc: 'Overrides low-confidence AI proposals with safe deterministic fallbacks.',
    status: 'ACTIVE',
  },
];

export const PoliciesPage: React.FC = () => {
  const [policy, setPolicy] = useState<MerchantPolicy | null>(null);
  const [history, setHistory] = useState<PolicyHistoryItem[]>([]);
  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type: 'success' }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2500);
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [policyData, histData] = await Promise.all([
        fetchPolicies(),
        fetchPolicyHistory().catch(() => ({ history: [] })),
      ]);
      setPolicy(policyData);
      setHistory(histData.history);
    } catch (err: any) {
      setError(err.message || 'Failed to load merchant safety policies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handlePolicySaved = (updated: MerchantPolicy) => {
    setPolicy(updated);
    showToast('Merchant safety policy updated successfully!');
    fetchPolicyHistory()
      .then((h) => setHistory(h.history))
      .catch(() => {});
  };

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
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {policy && (
        <PolicyEditorModal
          currentPolicy={policy}
          isOpen={isEditorOpen}
          onClose={() => setIsEditorOpen(false)}
          onSuccess={handlePolicySaved}
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Merchant Safety Policies & Governance</h1>
            <span className="text-[11px] font-bold px-2 py-0.5 rounded bg-violet-950/80 text-violet-300 border border-violet-800/60">
              GOVERNANCE CONSOLE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Configure deterministic recovery guardrails, contact limits, and inspect immutable policy revision history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEditorOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-md transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit Policy
          </button>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-panel border-rose-800/80 rounded-2xl p-4 flex items-center justify-between text-xs text-rose-300 bg-rose-950/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={loadData} className="font-bold text-rose-300 underline">
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
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Min Retry Spacing</span>
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

        {/* Max Customer Contacts */}
        <div className="glass-card p-6 rounded-2xl space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Max Contacts Per Cycle</span>
            <div className="p-1.5 rounded-lg bg-slate-800 text-slate-400">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-white font-mono">
            {policy?.max_customer_contacts_per_cycle || 3} Contacts
          </div>
          <p className="text-xs text-slate-400">Cap on customer communication triggers per subscription cycle.</p>
          <div className="pt-2 border-t border-slate-800/60 flex justify-between items-center text-[11px] text-slate-500">
            <span>Rule: `CUSTOMER_CONTACT_FREQUENCY`</span>
            <span className="text-emerald-400 font-semibold">Active</span>
          </div>
        </div>
      </div>

      {/* Deterministic Safety Rules Grid */}
      <div className="glass-card rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-white">Active Deterministic Safety Rules</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">Policy Engine Gate</span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {DETERMINISTIC_RULES.map((rule) => (
            <div key={rule.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-200">{rule.name}</span>
                  <span className="text-[10px] font-mono text-indigo-400 bg-slate-800 px-2 py-0.5 rounded">
                    {rule.id}
                  </span>
                  <span className="text-[10px] font-semibold text-slate-500">[{rule.priority}]</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{rule.desc}</p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60 self-start sm:self-auto">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Enforced
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Policy Revision History Timeline */}
      <div className="glass-card rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Policy Revision History</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">{history.length} Revisions Recorded</span>
        </div>

        {history.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 font-medium">
            No policy revision events recorded yet. Updates made via the editor will appear here in the append-only audit trail.
          </div>
        ) : (
          <div className="space-y-4">
            {history.map((h, idx) => (
              <div key={h.id || idx} className="p-4 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-200">Policy Updated</span>
                    <span className="px-2 py-0.5 rounded bg-slate-800 font-mono text-[10px] text-slate-300">
                      Actor: {h.actor}
                    </span>
                    {h.correlation_id && (
                      <span className="font-mono text-[10px] text-slate-500">({h.correlation_id})</span>
                    )}
                  </div>
                  <span className="text-slate-500 text-[11px] font-mono">
                    {new Date(h.created_at).toLocaleString()}
                  </span>
                </div>

                {h.payload?.changed_fields && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {h.payload.changed_fields.map((f: string) => (
                      <span
                        key={f}
                        className="px-2 py-0.5 rounded text-[10px] font-mono bg-indigo-950/80 text-indigo-300 border border-indigo-800/60"
                      >
                        {f}: {h.payload.previous_state?.[f]} → {h.payload.new_state?.[f]}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
