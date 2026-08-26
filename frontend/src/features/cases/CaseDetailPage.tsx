import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
import { useReducedMotion } from '../../motion/useReducedMotion';
import { modalVariants, backdropVariants, staggerContainer, staggerItem } from '../../motion/motionTokens';

export const CaseDetailPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const reducedMotion = useReducedMotion();
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
        <Link to="/cases" className="inline-flex items-center text-xs font-bold text-[#64748B] hover:text-[#111827]">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Cases
        </Link>
        <div className="bg-[#FFF1F2] border border-[#FECDD3] rounded-2xl p-6 text-xs text-[#9F1239] shadow-sm">
          <p className="font-bold text-sm text-[#9F1239]">Case Investigation Error</p>
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
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* Top Breadcrumb & Controls */}
      <motion.div variants={staggerItem} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <motion.div whileHover={reducedMotion ? {} : { scale: 1.05 }} whileTap={reducedMotion ? {} : { scale: 0.95 }}>
            <Link
              to="/cases"
              className="p-2 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F7F9FC] text-[#475569] hover:text-[#111827] transition-colors shadow-2xs block"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </motion.div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-black text-[#111827] font-mono tracking-tight">{c.invoice_id}</h1>
              <Badge state={c.state} />
            </div>
            <p className="text-xs text-[#64748B] mt-1 flex items-center gap-2">
              <span>
                Case Reference: <strong className="font-mono text-[#475569]">{c.id}</strong>
              </span>
              <span>•</span>
              <span>
                Failure: <strong className="text-[#3B5BDB] font-semibold">{catInfo.label}</strong>
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <motion.button
            whileTap={reducedMotion ? {} : { scale: 0.95 }}
            onClick={() => copyToClipboard(c.id, 'Case ID')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F7F9FC] text-[#475569] text-xs font-bold transition-colors shadow-2xs"
          >
            <Copy className="w-3.5 h-3.5 text-[#64748B]" />
            Copy ID
          </motion.button>
          <motion.button
            whileTap={reducedMotion ? {} : { scale: 0.95 }}
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F7F9FC] text-[#475569] text-xs font-bold transition-colors shadow-2xs"
          >
            <RefreshCw className="w-3.5 h-3.5 text-[#64748B]" />
            Refresh
          </motion.button>
        </div>
      </motion.div>

      {/* Operator Intervention Action Bar (Sapphire Theme) */}
      {canIntervene && (
        <motion.div
          variants={staggerItem}
          className="p-5 rounded-2xl bg-[#EEF2FF] border border-[#C7D2FE] flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs"
        >
          <div className="flex items-center gap-3.5">
            <div className="p-2.5 rounded-xl bg-[#3B5BDB] text-white shadow-2xs">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-[#1E3A8A]">Operator Manual Intervention</h4>
              <p className="text-xs text-[#2B4C7E] mt-0.5">
                Override autonomous policy, dispatch direct checkout links, or authorize immediate bank retry
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <motion.button
              whileHover={reducedMotion ? {} : { scale: 1.02 }}
              whileTap={reducedMotion ? {} : { scale: 0.98 }}
              onClick={() => setInterventionAction('SEND_PAYMENT_LINK')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3B5BDB] hover:bg-[#3048B8] text-white text-xs font-bold transition-colors shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              Dispatch Payment Link
            </motion.button>
            <motion.button
              whileHover={reducedMotion ? {} : { scale: 1.02 }}
              whileTap={reducedMotion ? {} : { scale: 0.98 }}
              onClick={() => setInterventionAction('APPROVE_RETRY')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approve Mandate Retry
            </motion.button>
            <motion.button
              whileHover={reducedMotion ? {} : { scale: 1.02 }}
              whileTap={reducedMotion ? {} : { scale: 0.98 }}
              onClick={() => setInterventionAction('DISMISS')}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#FFF1F2] text-[#475569] hover:text-[#E11D48] text-xs font-bold transition-colors border border-[#E5E7EB] hover:border-[#FECDD3] shadow-2xs"
            >
              <XCircle className="w-3.5 h-3.5" />
              Close Case
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Intervention Confirmation Dialog Modal */}
      <AnimatePresence>
        {interventionAction && (
          <motion.div
            variants={backdropVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4"
          >
            <motion.div
              variants={modalVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              className="bg-white border border-[#E5E7EB] rounded-2xl p-6 max-w-md w-full shadow-fintech-modal space-y-4"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <h3 className="text-base font-bold text-[#111827]">Confirm Operator Intervention</h3>
              </div>
              <p className="text-xs text-[#475569]">
                Apply action <strong className="text-[#3B5BDB] font-bold">{formatActionType(interventionAction)}</strong> to case{' '}
                <strong className="font-mono text-[#111827] font-bold">{c.invoice_id}</strong>.
              </p>
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">Operator Notes</label>
                <textarea
                  value={interventionNotes}
                  onChange={(e) => setInterventionNotes(e.target.value)}
                  placeholder="Reason for manual override..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB] text-[#111827] focus:outline-none focus:border-[#3B5BDB] focus:bg-white transition-colors"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-[#E5E7EB]">
                <button
                  onClick={() => setInterventionAction(null)}
                  className="px-4 py-2 rounded-xl bg-[#F1F5F9] hover:bg-[#E5E7EB] text-[#475569] text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteIntervention}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-[#3B5BDB] hover:bg-[#3048B8] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors"
                >
                  {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  Confirm & Log Audit
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Visual Recovery Lifecycle Progression Track with Motion */}
      <motion.div variants={staggerItem} className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
          <h3 className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Recovery Lifecycle Track</h3>
          <span className="text-[11px] font-mono font-bold text-[#3B5BDB]">Deterministic State Machine</span>
        </div>
        <div className="flex items-center justify-between overflow-x-auto py-3">
          {lifecycleSteps.map((step, idx) => (
            <React.Fragment key={step.label}>
              <div className="flex flex-col items-center min-w-[90px] text-center">
                <motion.div
                  initial={reducedMotion ? {} : { scale: 0.8 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2, delay: idx * 0.05 }}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    step.active
                      ? 'bg-[#059669] text-white shadow-2xs ring-2 ring-[#ECFDF5]'
                      : 'bg-[#F1F5F9] text-[#94A3B8] border border-[#E5E7EB]'
                  }`}
                >
                  {step.active ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </motion.div>
                <span
                  className={`text-[11px] mt-2 font-bold tracking-tight ${
                    step.active ? 'text-[#111827]' : 'text-[#94A3B8]'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < lifecycleSteps.length - 1 && (
                <div className="flex-1 h-0.5 mx-1 relative overflow-hidden bg-[#E5E7EB]">
                  {step.active && lifecycleSteps[idx + 1].active && (
                    <motion.div
                      initial={reducedMotion ? { width: '100%' } : { width: 0 }}
                      animate={{ width: '100%' }}
                      transition={{ duration: 0.4, delay: idx * 0.08, ease: [0.16, 1, 0.3, 1] }}
                      className="h-full bg-[#059669]"
                    />
                  )}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>
      </motion.div>

      {/* Decision Explainability & Attribution */}
      {caseId && (
        <motion.div variants={staggerItem}>
          <DecisionAttributionCard caseId={caseId} />
        </motion.div>
      )}

      {/* Grid: Customer Context & Settlement Reconciliation */}
      <motion.div variants={staggerItem} className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Context (Sanitized) */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-[#3B5BDB]" />
              <h3 className="text-sm font-bold text-[#111827]">Customer & Subscription Profile</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#F1F5F9] text-[#475569] border border-[#E5E7EB] font-mono">
              PII SANITIZED
            </span>
          </div>
          <div className="text-xs space-y-3">
            <div className="flex justify-between items-center py-1.5 border-b border-[#E5E7EB]">
              <span className="text-[#64748B] font-medium">Customer ID:</span>
              <span className="font-mono font-bold text-[#111827]">{customer?.id || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-[#E5E7EB]">
              <span className="text-[#64748B] font-medium">Masked Email:</span>
              <span className="font-mono font-bold text-[#111827]">{customer?.email || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-[#E5E7EB]">
              <span className="text-[#64748B] font-medium">Masked Phone:</span>
              <span className="font-mono font-bold text-[#111827]">{customer?.contact || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-[#E5E7EB]">
              <span className="text-[#64748B] font-medium">Customer Track Record:</span>
              <span className="font-bold text-[#111827]">
                {customer?.tenure_months || 12} months tenure • {((customer?.historical_success_rate || 0.95) * 100).toFixed(0)}% recovery rate
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-[#64748B] font-medium">Subscription Plan:</span>
              <span className="font-bold text-[#111827]">{subscription?.plan_id || '—'}</span>
            </div>
          </div>
        </div>

        {/* Settlement Reconciliation Status */}
        <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-[#059669]" />
              <h3 className="text-sm font-bold text-[#111827]">Settlement Reconciliation</h3>
            </div>
            <Badge
              state={reconciliation?.is_settled ? 'RECOVERED' : 'WAITING_FOR_OUTCOME'}
              variant={reconciliation?.is_settled ? 'emerald' : 'slate'}
            >
              {reconciliation?.is_settled ? 'RECONCILED (SETTLED)' : 'PENDING SETTLEMENT'}
            </Badge>
          </div>
          <div className="text-xs space-y-3">
            <div className="flex justify-between items-center py-1.5 border-b border-[#E5E7EB]">
              <span className="text-[#64748B] font-medium">Recovered Revenue:</span>
              <span className="text-lg font-black text-[#059669] font-sans">
                ₹{reconciliation?.recovered_amount_inr?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-[#E5E7EB]">
              <span className="text-[#64748B] font-medium">Reconciled Action ID:</span>
              <span className="font-mono font-bold text-[#111827]">
                {reconciliation?.reconciled_action_id || '—'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1.5 border-b border-[#E5E7EB]">
              <span className="text-[#64748B] font-medium">Gateway Reference ID:</span>
              <span className="font-mono font-bold text-[#0891B2]">
                {reconciliation?.external_reference_id || '—'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-[#64748B] font-medium">Settlement Timestamp:</span>
              <span className="text-[#475569] font-medium">
                {reconciliation?.resolved_at ? new Date(reconciliation.resolved_at).toLocaleString() : '—'}
              </span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Execution Actions History */}
      <motion.div variants={staggerItem} className="bg-white rounded-2xl overflow-hidden border border-[#E5E7EB] shadow-sm">
        <div className="p-5 border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-[#3B5BDB]" />
            <h3 className="text-sm font-bold text-[#111827]">Execution Actions History</h3>
          </div>
          <span className="text-xs font-mono font-bold text-[#64748B]">{actions.length} Action(s) Logged</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-xs">
            <thead className="bg-[#F7F9FC] text-[#64748B] font-extrabold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Action ID</th>
                <th className="px-5 py-3.5">Recovery Channel</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Gateway Transaction Reference</th>
                <th className="px-5 py-3.5">Dispatched At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] text-[#475569] font-medium">
              {actions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#64748B]">
                    No execution actions recorded for this recovery case yet.
                  </td>
                </tr>
              ) : (
                actions.map((a) => (
                  <tr key={a.id} className="hover:bg-[#F7F9FC] transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-[#111827]">{a.id}</td>
                    <td className="px-5 py-3.5 font-bold text-[#3B5BDB]">{formatActionType(a.action_type)}</td>
                    <td className="px-5 py-3.5">
                      <Badge state={a.status} />
                    </td>
                    <td className="px-5 py-3.5 font-mono text-[#0891B2] font-bold">{a.external_reference_id || '—'}</td>
                    <td className="px-5 py-3.5 text-[#64748B] text-[11px]">
                      {a.executed_at ? new Date(a.executed_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </motion.div>
  );
};
