import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  Activity,
  User,
  FileCheck,
  Copy,
  Send,
  XCircle,
  Sparkles,
} from 'lucide-react';
import {
  fetchCaseActions,
  fetchCaseDetail,
  fetchCaseReconciliation,
  resolveEscalatedCase,
} from '../../services/api';
import { CaseDetailResponse, ReconciliationStatusInfo, RecoveryActionItem } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/SkeletonLoader';
import { ToastContainer, ToastMessage } from '../../components/ui/Toast';
import { DecisionAttributionCard } from './DecisionAttributionCard';
import { formatActionType, formatFailureCategory } from '../../utils/terminology';

export const CaseDetailPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const [detail, setDetail] = useState<CaseDetailResponse | null>(null);
  const [actions, setActions] = useState<RecoveryActionItem[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationStatusInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  // Intervention modal state
  const [interventionAction, setInterventionAction] = useState<'APPROVE_RETRY' | 'SEND_PAYMENT_LINK' | 'DISMISS' | null>(null);
  const [interventionNotes, setInterventionNotes] = useState('');

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard!`);
  };

  const loadData = async () => {
    if (!caseId) return;
    setLoading(true);
    setError(null);
    try {
      const [detailRes, actionsRes, reconRes] = await Promise.all([
        fetchCaseDetail(caseId),
        fetchCaseActions(caseId).catch(() => ({ actions: [] })),
        fetchCaseReconciliation(caseId).catch(() => null),
      ]);
      setDetail(detailRes);
      setActions(actionsRes.actions);
      setReconciliation(reconRes);
    } catch (err: any) {
      setError(err.message || `Failed to load details for case ${caseId}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [caseId]);

  const handleExecuteIntervention = async () => {
    if (!caseId || !interventionAction) return;
    try {
      setActionLoading(true);
      await resolveEscalatedCase(caseId, interventionAction, interventionNotes);
      showToast(`Action '${interventionAction}' applied successfully!`, 'success');
      setInterventionAction(null);
      setInterventionNotes('');
      await loadData();
    } catch (err: any) {
      showToast(err?.message || 'Failed to apply intervention', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-2xl" />
          <Skeleton className="h-64 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <Link to="/cases" className="inline-flex items-center text-xs font-bold text-slate-500 hover:text-slate-900">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Cases
        </Link>
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-6 text-xs text-rose-800 shadow-sm">
          <p className="font-bold text-sm text-rose-900">Case Investigation Error</p>
          <p className="mt-1">{error || 'Case not found'}</p>
        </div>
      </div>
    );
  }

  const { case: c, customer, subscription } = detail;
  const catInfo = formatFailureCategory(c.failure_category);

  // Stages of the lifecycle
  const lifecycleSteps = [
    { label: 'Ingested', active: true },
    { label: 'AI Strategy', active: c.state !== 'DETECTED' },
    { label: 'Safety Gate', active: !['DETECTED', 'ANALYZING', 'DECISION_PENDING'].includes(c.state) },
    {
      label: c.state === 'ESCALATED' ? 'Escalated (Hold)' : (c.state === 'HALTED' || c.state === 'STOPPED') ? 'Hard Stopped' : 'Scheduled',
      active: !['DETECTED', 'ANALYZING', 'DECISION_PENDING', 'POLICY_REVIEW'].includes(c.state),
    },
    {
      label: 'Action Dispatched',
      active: ['ACTION_PENDING', 'IN_PROGRESS', 'WAITING_FOR_OUTCOME', 'RECOVERED', 'FAILED'].includes(c.state),
    },
    {
      label: c.state === 'RECOVERED' ? 'Settled (Paid)' : c.state === 'FAILED' ? 'Exhausted' : 'Awaiting Settlement',
      active: ['RECOVERED', 'FAILED'].includes(c.state),
    },
  ];

  const canIntervene = ['ESCALATED', 'ACTION_PENDING', 'SCHEDULED', 'DETECTED'].includes(c.state);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* Top Breadcrumb & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Link
            to="/cases"
            className="p-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 hover:text-slate-900 transition-colors shadow-2xs"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-black text-slate-900 font-mono tracking-tight">{c.invoice_id}</h1>
              <Badge state={c.state} />
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-2">
              <span>
                Case Reference: <strong className="font-mono text-slate-700">{c.id}</strong>
              </span>
              <span>•</span>
              <span>
                Failure: <strong className="text-blue-600 font-semibold">{catInfo.label}</strong>
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => copyToClipboard(c.id, 'Case ID')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors shadow-2xs"
          >
            <Copy className="w-3.5 h-3.5 text-slate-400" />
            Copy ID
          </button>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
            Refresh
          </button>
        </div>
      </div>

      {/* Operator Intervention Action Bar (Option B Royal Blue) */}
      {canIntervene && (
        <div className="p-5 rounded-2xl bg-blue-50/70 border border-blue-200 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-blue-600 text-white shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-blue-950">Operator Manual Intervention</h4>
              <p className="text-xs text-blue-800 mt-0.5">
                Override autonomous policy, dispatch direct checkout links, or authorize immediate bank retry
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setInterventionAction('SEND_PAYMENT_LINK')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              Dispatch Payment Link
            </button>
            <button
              onClick={() => setInterventionAction('APPROVE_RETRY')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approve Mandate Retry
            </button>
            <button
              onClick={() => setInterventionAction('DISMISS')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-bold transition-colors border border-slate-200 hover:border-rose-300 shadow-2xs"
            >
              <XCircle className="w-3.5 h-3.5" />
              Close Case
            </button>
          </div>
        </div>
      )}

      {/* Intervention Confirmation Dialog Modal */}
      {interventionAction && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-6 max-w-md w-full shadow-fintech-modal space-y-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-base font-bold text-slate-900">Confirm Operator Intervention</h3>
            </div>
            <p className="text-xs text-slate-600">
              Apply action <strong className="text-blue-600 font-bold">{formatActionType(interventionAction)}</strong> to case{' '}
              <strong className="font-mono text-slate-900 font-bold">{c.invoice_id}</strong>.
            </p>
            <div className="space-y-1.5">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">Operator Notes</label>
              <textarea
                value={interventionNotes}
                onChange={(e) => setInterventionNotes(e.target.value)}
                placeholder="Reason for manual override..."
                rows={3}
                className="w-full text-xs p-3 rounded-xl bg-slate-50 border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-500 focus:bg-white transition-colors"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                onClick={() => setInterventionAction(null)}
                className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleExecuteIntervention}
                disabled={actionLoading}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
              >
                {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                Confirm & Log Audit
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Visual Recovery Lifecycle Progression Track */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Recovery Lifecycle Track</h3>
          <span className="text-[11px] font-mono font-bold text-blue-600">Deterministic State Machine</span>
        </div>
        <div className="flex items-center justify-between overflow-x-auto py-3">
          {lifecycleSteps.map((step, idx) => (
            <React.Fragment key={step.label}>
              <div className="flex flex-col items-center min-w-[90px] text-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step.active
                      ? 'bg-emerald-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-400 border border-slate-200'
                  }`}
                >
                  {step.active ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                <span
                  className={`text-[11px] mt-2 font-bold tracking-tight ${
                    step.active ? 'text-slate-900' : 'text-slate-400'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < lifecycleSteps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 transition-all ${
                    step.active ? 'bg-emerald-500' : 'bg-slate-200'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Decision Explainability & Attribution */}
      {caseId && <DecisionAttributionCard caseId={caseId} />}

      {/* Grid: Customer Context & Settlement Reconciliation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Context (Sanitized) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-blue-600" />
              <h3 className="text-sm font-bold text-slate-900">Customer & Subscription Profile</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-mono">
              PII SANITIZED
            </span>
          </div>
          <div className="text-xs space-y-3">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Customer ID:</span>
              <span className="font-mono font-bold text-slate-900">{customer?.id || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Masked Email:</span>
              <span className="font-mono font-bold text-slate-900">{customer?.email || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Masked Phone:</span>
              <span className="font-mono font-bold text-slate-900">{customer?.contact || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Customer Track Record:</span>
              <span className="font-bold text-slate-900">
                {customer?.tenure_months || 12} months tenure • {((customer?.historical_success_rate || 0.95) * 100).toFixed(0)}% recovery rate
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">Subscription Plan:</span>
              <span className="font-bold text-slate-900">{subscription?.plan_id || '—'}</span>
            </div>
          </div>
        </div>

        {/* Settlement Reconciliation Status */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="text-sm font-bold text-slate-900">Settlement Reconciliation</h3>
            </div>
            <Badge
              state={reconciliation?.is_settled ? 'RECOVERED' : 'WAITING_FOR_OUTCOME'}
              variant={reconciliation?.is_settled ? 'emerald' : 'slate'}
            >
              {reconciliation?.is_settled ? 'RECONCILED (SETTLED)' : 'PENDING SETTLEMENT'}
            </Badge>
          </div>
          <div className="text-xs space-y-3">
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Recovered Revenue:</span>
              <span className="text-lg font-black text-emerald-700 font-sans">
                ₹{reconciliation?.recovered_amount_inr?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Reconciled Action ID:</span>
              <span className="font-mono font-bold text-slate-900">
                {reconciliation?.reconciled_action_id || '—'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-slate-100">
              <span className="text-slate-500 font-medium">Gateway Reference ID:</span>
              <span className="font-mono font-bold text-blue-700">
                {reconciliation?.external_reference_id || '—'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-500 font-medium">Settlement Timestamp:</span>
              <span className="text-slate-700 font-medium">
                {reconciliation?.resolved_at ? new Date(reconciliation.resolved_at).toLocaleString() : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Execution Actions History */}
      <div className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm">
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Execution Actions History</h3>
          </div>
          <span className="text-xs font-mono font-bold text-slate-500">{actions.length} Action(s) Logged</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 font-extrabold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Action ID</th>
                <th className="px-5 py-3.5">Recovery Channel</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Gateway Transaction Reference</th>
                <th className="px-5 py-3.5">Dispatched At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 font-medium">
              {actions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No execution actions recorded for this recovery case yet.
                  </td>
                </tr>
              ) : (
                actions.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-slate-900">{a.id}</td>
                    <td className="px-5 py-3.5 font-bold text-blue-700">{formatActionType(a.action_type)}</td>
                    <td className="px-5 py-3.5">
                      <Badge state={a.status} />
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-500">{a.external_reference_id || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-500 text-[11px]">
                      {a.executed_at ? new Date(a.executed_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </motion.div>
  );
};
