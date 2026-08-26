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
  Check,
  Send,
  XCircle,
  Sparkles,
  AlertTriangle,
  Layers,
  Clock,
  ShieldCheck,
  Zap,
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
import { formatActionType, formatFailureCategory, formatState } from '../../utils/terminology';
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

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
    setCopiedKey(label);
    showToast(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2000);
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
      showToast(`Action '${formatActionType(interventionAction)}' executed & logged to immutable audit ledger!`, 'success');
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
  const stateInfo = formatState(c.state);

  // 6-Stage End-to-End Narrative Lifecycle Tracker
  const lifecycleSteps = [
    {
      id: '1',
      title: '1. Failure Detected',
      desc: catInfo.label,
      active: true,
      icon: AlertTriangle,
      color: '#0891B2',
    },
    {
      id: '2',
      title: '2. Context Evaluated',
      desc: `Risk score ${((customer?.historical_success_rate || 0.85) * 100).toFixed(0)}%`,
      active: c.state !== 'DETECTED',
      icon: Clock,
      color: '#0891B2',
    },
    {
      id: '3',
      title: '3. AI Strategy Proposed',
      desc: 'Dual-brain reasoning',
      active: !['DETECTED', 'ANALYZING'].includes(c.state),
      icon: Sparkles,
      color: '#7C3AED',
    },
    {
      id: '4',
      title: '4. Safety Gate Enforced',
      desc: c.state === 'ESCALATED' ? 'Held for Review' : 'Policy Passed',
      active: !['DETECTED', 'ANALYZING', 'DECISION_PENDING'].includes(c.state),
      icon: ShieldCheck,
      color: c.state === 'ESCALATED' ? '#D97706' : '#059669',
    },
    {
      id: '5',
      title: '5. Action Dispatched',
      desc: c.state === 'RECOVERED' || actions.length > 0 ? 'Rail executing' : 'Scheduled window',
      active: ['ACTION_PENDING', 'IN_PROGRESS', 'WAITING_FOR_OUTCOME', 'RECOVERED', 'FAILED'].includes(c.state),
      icon: Zap,
      color: '#3B5BDB',
    },
    {
      id: '6',
      title: '6. Settlement Reconciled',
      desc: c.state === 'RECOVERED' ? `₹${(c.recovered_amount_inr || c.amount_inr).toLocaleString('en-IN')} paid` : c.state === 'FAILED' ? 'Exhausted' : 'Awaiting payment',
      active: ['RECOVERED', 'FAILED'].includes(c.state),
      icon: CheckCircle2,
      color: c.state === 'RECOVERED' ? '#059669' : '#94A3B8',
    },
  ];

  const canIntervene = ['ESCALATED', 'ACTION_PENDING', 'SCHEDULED', 'DETECTED'].includes(c.state);

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-6 text-left"
    >
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* Top Breadcrumb & Actions */}
      <motion.div variants={staggerItem} className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-3">
          <motion.div whileHover={reducedMotion ? {} : { scale: 1.05 }} whileTap={reducedMotion ? {} : { scale: 0.95 }}>
            <Link
              to="/cases"
              className="p-2 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F7F9FC] text-[#475569] hover:text-[#111827] transition-colors shadow-2xs block"
              title="Return to Cases List"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
          </motion.div>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-black text-[#111827] font-mono tracking-tight">{c.invoice_id}</h1>
              <Badge state={c.state} />
            </div>
            <p className="text-xs text-[#64748B] mt-1 flex items-center gap-2 flex-wrap">
              <span className="flex items-center gap-1">
                Case Reference: <strong className="font-mono text-[#475569]">{c.id.slice(0, 20)}...</strong>
                <button
                  onClick={() => copyToClipboard(c.id, 'Case ID')}
                  className="p-0.5 hover:bg-[#EEF2FF] rounded text-[#64748B] hover:text-[#3B5BDB]"
                >
                  {copiedKey === 'Case ID' ? <Check className="w-3 h-3 text-[#059669]" /> : <Copy className="w-3 h-3" />}
                </button>
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
            onClick={() => copyToClipboard(c.invoice_id || c.id, 'Invoice ID')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F7F9FC] text-[#475569] text-xs font-bold transition-colors shadow-2xs"
          >
            {copiedKey === 'Invoice ID' ? <Check className="w-3.5 h-3.5 text-[#059669]" /> : <Copy className="w-3.5 h-3.5 text-[#64748B]" />}
            Copy Invoice
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

      {/* Operator Intervention Banner */}
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
              <h4 className="text-sm font-bold text-[#1E3A8A] flex items-center gap-2">
                Operator Action Authorization
                {c.state === 'ESCALATED' && (
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] font-mono font-bold">
                    HELD BY SAFETY GUARDRAIL
                  </span>
                )}
              </h4>
              <p className="text-xs text-[#2B4C7E] mt-0.5">
                Authorize payment link checkout, approve immediate bank retry, or terminate automated recovery lifecycle.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <motion.button
              whileHover={reducedMotion ? {} : { translateY: -1 }}
              whileTap={reducedMotion ? {} : { scale: 0.98 }}
              onClick={() => setInterventionAction('SEND_PAYMENT_LINK')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#3B5BDB] hover:bg-[#3048B8] text-white text-xs font-bold transition-colors shadow-xs"
            >
              <Send className="w-3.5 h-3.5" />
              Dispatch Payment Link
            </motion.button>
            <motion.button
              whileHover={reducedMotion ? {} : { translateY: -1 }}
              whileTap={reducedMotion ? {} : { scale: 0.98 }}
              onClick={() => setInterventionAction('APPROVE_RETRY')}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-xs font-bold transition-colors shadow-xs"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Approve Mandate Retry
            </motion.button>
            <motion.button
              whileHover={reducedMotion ? {} : { translateY: -1 }}
              whileTap={reducedMotion ? {} : { scale: 0.98 }}
              onClick={() => setInterventionAction('DISMISS')}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-[#FFF1F2] text-[#475569] hover:text-[#E11D48] text-xs font-bold transition-colors border border-[#E5E7EB] hover:border-[#FECDD3] shadow-2xs"
            >
              <XCircle className="w-3.5 h-3.5" />
              Dismiss
            </motion.button>
          </div>
        </motion.div>
      )}

      {/* Impact-Aware Intervention Confirmation Dialog Modal */}
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
              className="bg-white border border-[#E5E7EB] rounded-2xl p-6 max-w-lg w-full shadow-fintech-modal space-y-4 text-left"
            >
              <div className="flex items-center gap-2.5 border-b border-[#E5E7EB] pb-3">
                <div className="p-2 rounded-xl bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE]">
                  <Sparkles className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-[#111827] font-sans">
                    Confirm Intervention: {formatActionType(interventionAction)}
                  </h3>
                  <p className="text-xs text-[#64748B]">Invoice {c.invoice_id} • Amount ₹{c.amount_inr.toLocaleString('en-IN')}</p>
                </div>
              </div>

              {/* Operational Consequence Notice */}
              <div className="p-3.5 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB] space-y-1.5 text-xs">
                <div className="font-bold text-[#111827] flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-[#D97706]" />
                  Operational Impact & Safety Consequences
                </div>
                <p className="text-[11px] text-[#475569] leading-relaxed">
                  {interventionAction === 'APPROVE_RETRY' &&
                    'Approving a retry authorizes an immediate mandate re-presentation request to NPCI clearing rails. Will count towards the merchant maximum attempt limit.'}
                  {interventionAction === 'SEND_PAYMENT_LINK' &&
                    'Dispatches a dynamic UPI payment link via WhatsApp and SMS directly to the customer. Cleared amounts settle instantly to merchant escrow.'}
                  {interventionAction === 'DISMISS' &&
                    'Terminates autonomous recovery for this mandate. No further retries or customer messages will be dispatched.'}
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-[#475569] uppercase tracking-wider">
                  Operator Authorization Reason (Logged to Audit Trail)
                </label>
                <textarea
                  value={interventionNotes}
                  onChange={(e) => setInterventionNotes(e.target.value)}
                  placeholder="e.g. Verified customer liquidity with relationship manager..."
                  rows={3}
                  className="w-full text-xs p-3 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB] text-[#111827] focus:outline-none focus:border-[#3B5BDB] focus:bg-white transition-colors"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-[#E5E7EB]">
                <button
                  onClick={() => setInterventionAction(null)}
                  className="px-4 py-2 rounded-xl bg-[#F1F5F9] hover:bg-[#E5E7EB] text-[#475569] text-xs font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleExecuteIntervention}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl bg-[#3B5BDB] hover:bg-[#3048B8] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
                >
                  {actionLoading && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>Authorize & Log Audit</span>
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* 6-Stage End-to-End Case Story Timeline */}
      <motion.div variants={staggerItem} className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-[#3B5BDB]" />
            <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider font-sans">
              End-to-End Recovery Case Story
            </h3>
          </div>
          <span className="text-[11px] font-mono font-bold text-[#3B5BDB]">
            Current State: {stateInfo.label}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-1">
          {lifecycleSteps.map((step) => {
            const Icon = step.icon;
            const isCompleted = step.active;

            return (
              <div
                key={step.id}
                className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
                  isCompleted
                    ? 'bg-white border-[#E5E7EB] shadow-2xs'
                    : 'bg-[#F7F9FC] border-[#F1F5F9] opacity-60'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold"
                    style={{
                      backgroundColor: isCompleted ? `${step.color}15` : '#E2E8F0',
                      color: isCompleted ? step.color : '#94A3B8',
                    }}
                  >
                    <Icon className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-[10px] font-mono font-bold text-[#64748B]">
                    {isCompleted ? '✓ Done' : 'Pending'}
                  </span>
                </div>
                <div>
                  <div className="text-xs font-bold text-[#111827] leading-snug">{step.title}</div>
                  <p className="text-[10px] text-[#64748B] mt-0.5">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Decision Explainability & Attribution Component */}
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
              <div className="flex items-center gap-1">
                <span className="font-mono font-bold text-[#111827]">{customer?.id || '—'}</span>
                {customer?.id && (
                  <button
                    onClick={() => copyToClipboard(customer.id, 'Customer ID')}
                    className="p-0.5 hover:bg-[#EEF2FF] rounded text-[#64748B] hover:text-[#3B5BDB]"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
              </div>
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
              <div className="flex items-center gap-1">
                <span className="font-mono font-bold text-[#0891B2]">
                  {reconciliation?.external_reference_id || '—'}
                </span>
                {reconciliation?.external_reference_id && (
                  <button
                    onClick={() => copyToClipboard(reconciliation.external_reference_id!, 'Gateway Reference ID')}
                    className="p-0.5 hover:bg-[#EEF2FF] rounded text-[#64748B] hover:text-[#3B5BDB]"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
              </div>
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
