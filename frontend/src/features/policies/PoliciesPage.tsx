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
  Sparkles,
} from 'lucide-react';
import { fetchPolicies, fetchPolicyHistory } from '../../services/api';
import { MerchantPolicy, PolicyHistoryItem } from '../../types';
import { Skeleton } from '../../components/ui/SkeletonLoader';
import { ToastContainer, ToastMessage } from '../../components/ui/Toast';
import { PolicyEditorModal } from './PolicyEditorModal';
import { PolicySimulationModal } from './PolicySimulationModal';

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
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
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
    setIsEditorOpen(false);
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
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {policy && (
        <>
          <PolicyEditorModal
            currentPolicy={policy}
            isOpen={isEditorOpen}
            onClose={() => setIsEditorOpen(false)}
            onSuccess={handlePolicySaved}
          />
          <PolicySimulationModal
            currentPolicy={policy}
            isOpen={isSimulationOpen}
            onClose={() => setIsSimulationOpen(false)}
            onApplyToDraft={() => {
              setIsSimulationOpen(false);
              setIsEditorOpen(true);
            }}
          />
        </>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-sans">
              Merchant Safety Policies & Governance
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              Safety Control Center
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Configure deterministic recovery guardrails, contact limits, and inspect immutable policy revision history
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsSimulationOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-50 border border-purple-200 hover:bg-purple-100 text-purple-700 text-xs font-bold transition-all shadow-xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-purple-600" />
            What-If Studio
          </button>
          <button
            onClick={() => setIsEditorOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Edit Policy
          </button>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors shadow-xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between text-xs text-rose-800 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={loadData} className="font-bold text-rose-900 underline">
            Retry
          </button>
        </div>
      )}

      {/* Policy Parameters Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Max Retries */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Max Retries Per Case</span>
            <div className="p-2 rounded-xl bg-slate-50 text-slate-600 border border-slate-200">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono">{policy?.max_retries_per_case || 3} Attempts</div>
          <p className="text-xs text-slate-500">Maximum execution attempts before auto-stopping a failed mandate.</p>
          <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500">
            <span>Rule: `MAX_RETRIES_CAP`</span>
            <span className="text-emerald-700 font-bold">Active</span>
          </div>
        </div>

        {/* Retry Interval */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Min Retry Spacing</span>
            <div className="p-2 rounded-xl bg-slate-50 text-slate-600 border border-slate-200">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono">{policy?.min_retry_interval_hours || 24} Hours</div>
          <p className="text-xs text-slate-500">Minimum spacing interval between successive recovery actions.</p>
          <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500">
            <span>Rule: `MIN_RETRY_INTERVAL`</span>
            <span className="text-emerald-700 font-bold">Active</span>
          </div>
        </div>

        {/* Recovery Window */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Recovery Window</span>
            <div className="p-2 rounded-xl bg-slate-50 text-slate-600 border border-slate-200">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono">{policy?.max_recovery_window_days || 14} Days</div>
          <p className="text-xs text-slate-500">Maximum lifespan before an unrecovered case expires.</p>
          <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500">
            <span>Rule: `RECOVERY_WINDOW_LIMIT`</span>
            <span className="text-emerald-700 font-bold">Active</span>
          </div>
        </div>

        {/* High Value Threshold */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">High-Value Threshold</span>
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
              <Award className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-indigo-700 font-sans">
            ₹{policy?.high_value_threshold_inr?.toLocaleString('en-IN') || '10,000'}
          </div>
          <p className="text-xs text-slate-500">Invoices at or above this amount require human escalation.</p>
          <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500">
            <span>Rule: `HIGH_VALUE_ESCALATION`</span>
            <span className="text-indigo-700 font-bold">Protected</span>
          </div>
        </div>

        {/* AI Confidence Minimum */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Min AI Confidence</span>
            <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-emerald-700 font-mono">
            {((policy?.min_confidence_threshold || 0.75) * 100).toFixed(0)}%
          </div>
          <p className="text-xs text-slate-500">AI decisions below this confidence score are automatically vetoed.</p>
          <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500">
            <span>Rule: `LOW_CONFIDENCE_VETO`</span>
            <span className="text-emerald-700 font-bold">Active</span>
          </div>
        </div>

        {/* Max Customer Contacts */}
        <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Max Contacts Per Cycle</span>
            <div className="p-2 rounded-xl bg-slate-50 text-slate-600 border border-slate-200">
              <Users className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl font-black text-slate-900 font-mono">
            {policy?.max_customer_contacts_per_cycle || 3} Contacts
          </div>
          <p className="text-xs text-slate-500">Cap on customer communication triggers per subscription cycle.</p>
          <div className="pt-3 border-t border-slate-100 flex justify-between items-center text-[11px] text-slate-500">
            <span>Rule: `CUSTOMER_CONTACT_FREQUENCY`</span>
            <span className="text-emerald-700 font-bold">Active</span>
          </div>
        </div>
      </div>

      {/* Deterministic Safety Rules */}
      <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm space-y-4 p-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-600" />
            <h3 className="text-sm font-bold text-slate-900">Active Deterministic Safety Rules</h3>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500">Policy Engine Safety Gates</span>
        </div>

        <div className="divide-y divide-slate-100">
          {DETERMINISTIC_RULES.map((rule) => (
            <div key={rule.id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">{rule.name}</span>
                  <span className="text-[10px] font-mono text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full font-bold">
                    {rule.id}
                  </span>
                  <span className="text-[10px] font-bold text-slate-500">[{rule.priority}]</span>
                </div>
                <p className="text-xs text-slate-500 mt-0.5">{rule.desc}</p>
              </div>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 self-start sm:self-auto">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Enforced
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Policy Revision History */}
      <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-indigo-600" />
            <h3 className="text-sm font-bold text-slate-900">Policy Revision History</h3>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500">{history.length} Revisions Recorded</span>
        </div>

        {history.length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 font-medium">
            No policy revision events recorded yet. Updates made via the editor will appear here in the append-only audit trail.
          </div>
        ) : (
          <div className="space-y-3">
            {history.map((h, idx) => (
              <div key={h.id || idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-900">Policy Updated</span>
                    <span className="px-2 py-0.5 rounded-full bg-white border border-slate-200 font-mono text-[10px] text-slate-700 font-bold">
                      Actor: {h.actor}
                    </span>
                    {h.correlation_id && (
                      <span className="font-mono text-[10px] text-slate-400">({h.correlation_id})</span>
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
                        className="px-2 py-0.5 rounded-full text-[10px] font-mono bg-indigo-50 text-indigo-800 border border-indigo-200 font-bold"
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
