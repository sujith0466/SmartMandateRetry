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
  ShieldCheck,
  ShieldAlert,
} from 'lucide-react';
import { fetchAuditEvents, fetchCaseActions, fetchCaseDetail, fetchCaseReconciliation } from '../../services/api';
import { AuditEventItem, CaseDetailResponse, ReconciliationStatusInfo, RecoveryActionItem } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/SkeletonLoader';
import { ToastContainer, ToastMessage } from '../../components/ui/Toast';

export const CaseDetailPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const [detail, setDetail] = useState<CaseDetailResponse | null>(null);
  const [actions, setActions] = useState<RecoveryActionItem[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationStatusInfo | null>(null);
  const [policyDecisions, setPolicyDecisions] = useState<AuditEventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

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
      const [detailRes, actionsRes, reconRes, auditRes] = await Promise.all([
        fetchCaseDetail(caseId),
        fetchCaseActions(caseId).catch(() => ({ actions: [] })),
        fetchCaseReconciliation(caseId).catch(() => null),
        fetchAuditEvents(1, 10, caseId, 'POLICY_DECISION_EVALUATED').catch(() => ({ data: [], pagination: { page: 1, limit: 10, total: 0, pages: 1 } })),
      ]);
      setDetail(detailRes);
      setActions(actionsRes.actions);
      setReconciliation(reconRes);
      setPolicyDecisions(auditRes.data);
    } catch (err: any) {
      setError(err.message || `Failed to load details for case ${caseId}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [caseId]);

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
        <Link to="/cases" className="inline-flex items-center text-xs font-bold text-slate-400 hover:text-white">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Cases
        </Link>
        <div className="glass-panel border-rose-800/80 rounded-2xl p-6 text-xs text-rose-300 bg-rose-950/20">
          <p className="font-bold text-sm text-rose-200">Case Investigation Error</p>
          <p className="mt-1">{error || 'Case not found'}</p>
        </div>
      </div>
    );
  }

  const { case: c, customer, subscription } = detail;

  // Stages of the lifecycle
  const lifecycleSteps = [
    { label: 'Detected', active: true },
    { label: 'Analyzing', active: c.state !== 'DETECTED' },
    { label: 'Decision Pending', active: !['DETECTED', 'ANALYZING'].includes(c.state) },
    { label: 'Policy Review', active: !['DETECTED', 'ANALYZING', 'DECISION_PENDING'].includes(c.state) },
    {
      label: c.state === 'ESCALATED' ? 'Escalated' : c.state === 'STOPPED' ? 'Stopped' : 'Scheduled',
      active: !['DETECTED', 'ANALYZING', 'DECISION_PENDING', 'POLICY_REVIEW'].includes(c.state),
    },
    {
      label: 'Action In Flight',
      active: ['ACTION_PENDING', 'IN_PROGRESS', 'WAITING_FOR_OUTCOME', 'RECOVERED', 'FAILED'].includes(c.state),
    },
    {
      label: c.state === 'RECOVERED' ? 'Recovered' : c.state === 'FAILED' ? 'Failed' : 'Outcome Pending',
      active: ['RECOVERED', 'FAILED'].includes(c.state),
    },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
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
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-black text-white font-mono tracking-tight">{c.id}</h1>
              <Badge state={c.state} />
            </div>
            <p className="text-xs text-slate-400 mt-1 flex items-center gap-2">
              <span>
                Subscription: <strong className="font-mono text-slate-300">{c.subscription_id}</strong>
              </span>
              <span>•</span>
              <span>
                Stage: <strong className="text-slate-300">{c.stage}</strong>
              </span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => copyToClipboard(c.id, 'Case ID')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            Copy ID
          </button>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Visual Recovery Lifecycle Progression Track */}
      <div className="glass-card p-6 rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Recovery Lifecycle Track</h3>
          <span className="text-[11px] font-mono text-indigo-400">Deterministic Progression</span>
        </div>
        <div className="flex items-center justify-between overflow-x-auto py-3">
          {lifecycleSteps.map((step, idx) => (
            <React.Fragment key={step.label}>
              <div className="flex flex-col items-center min-w-[90px] text-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black transition-all ${
                    step.active
                      ? 'bg-emerald-500 text-slate-950 shadow-[0_0_15px_rgba(16,185,129,0.5)]'
                      : 'bg-slate-800 text-slate-500 border border-slate-700'
                  }`}
                >
                  {step.active ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                <span
                  className={`text-[11px] mt-2 font-bold tracking-tight ${
                    step.active ? 'text-white' : 'text-slate-500'
                  }`}
                >
                  {step.label}
                </span>
              </div>
              {idx < lifecycleSteps.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 transition-all ${
                    step.active ? 'bg-emerald-500 shadow-[0_0_8px_#10B981]' : 'bg-slate-800'
                  }`}
                />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Grid: Customer Context & Settlement Reconciliation */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer Context (Sanitized) */}
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <User className="w-4 h-4 text-indigo-400" />
              <h3 className="text-sm font-bold text-white">Customer & Subscription Profile</h3>
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-400">SANITIZED</span>
          </div>
          <div className="text-xs space-y-3">
            <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Customer ID:</span>
              <span className="font-mono font-bold text-slate-200">{customer?.id || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Masked Email:</span>
              <span className="font-mono font-bold text-slate-200">{customer?.email || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Masked Contact:</span>
              <span className="font-mono font-bold text-slate-200">{customer?.contact || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Subscription Plan:</span>
              <span className="font-bold text-slate-200">{subscription?.plan_id || '—'}</span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Subscription Cycle:</span>
              <span className="font-mono font-bold text-slate-200">{subscription?.current_cycle || 1}</span>
            </div>
          </div>
        </div>

        {/* Settlement Reconciliation Status */}
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Settlement Reconciliation</h3>
            </div>
            <Badge
              state={reconciliation?.is_settled ? 'RECOVERED' : 'WAITING_FOR_OUTCOME'}
              variant={reconciliation?.is_settled ? 'emerald' : 'slate'}
            >
              {reconciliation?.is_settled ? 'RECONCILED (PAID)' : 'UNRECONCILED'}
            </Badge>
          </div>
          <div className="text-xs space-y-3">
            <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Recovered Amount:</span>
              <span className="text-base font-extrabold text-emerald-400 font-mono">
                ₹{reconciliation?.recovered_amount_inr?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Reconciled Action:</span>
              <span className="font-mono font-bold text-slate-200">
                {reconciliation?.reconciled_action_id || '—'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1 border-b border-slate-800/40">
              <span className="text-slate-400">Gateway Reference:</span>
              <span className="font-mono font-bold text-indigo-300">
                {reconciliation?.external_reference_id || '—'}
              </span>
            </div>
            <div className="flex justify-between items-center py-1">
              <span className="text-slate-400">Resolution Timestamp:</span>
              <span className="text-slate-300">
                {reconciliation?.resolved_at ? new Date(reconciliation.resolved_at).toLocaleString() : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Governance & Policy Decisions Explanation */}
      {policyDecisions.length > 0 && (
        <div className="glass-card p-6 rounded-2xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-violet-400" />
              <h3 className="text-sm font-bold text-white">Governance & Safety Policy Evaluation</h3>
            </div>
            <span className="text-xs font-mono text-slate-400">Deterministic Safety Gate</span>
          </div>

          <div className="space-y-3">
            {policyDecisions.map((p) => {
              const payload = p.payload || {};
              const status = payload.status || 'ALLOWED';
              const rules = payload.policy_rules_applied || [];
              const reasons = payload.policy_reasons || [];
              const allowed = payload.execution_allowed;

              return (
                <div key={p.id} className="p-4 bg-slate-900/90 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 text-xs">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-slate-200">Policy Outcome:</span>
                      <Badge state={status} variant={allowed ? 'emerald' : status === 'BLOCKED' ? 'rose' : 'violet'}>
                        {status}
                      </Badge>
                      <span className="text-slate-400 font-mono text-[11px]">
                        Action: {payload.final_action || payload.original_action}
                      </span>
                    </div>
                    <span className="text-slate-500 font-mono text-[11px]">
                      {new Date(p.created_at).toLocaleString()}
                    </span>
                  </div>

                  {rules.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <span className="text-[11px] text-slate-400 self-center">Rules Enforced:</span>
                      {rules.map((r: string) => (
                        <span
                          key={r}
                          className="px-2 py-0.5 rounded text-[10px] font-mono bg-violet-950/80 text-violet-300 border border-violet-800/60"
                        >
                          {r}
                        </span>
                      ))}
                    </div>
                  )}

                  {reasons.length > 0 && (
                    <div className="text-xs text-slate-300 pt-1 space-y-1">
                      {reasons.map((r: string, idx: number) => (
                        <div key={idx} className="flex items-center gap-1.5 text-rose-400">
                          <ShieldAlert className="w-3.5 h-3.5 shrink-0" />
                          <span>{r}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Execution Actions History */}
      <div className="glass-card rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Execution Actions History</h3>
          </div>
          <span className="text-xs font-mono text-slate-400">{actions.length} Action(s)</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800/80 text-left text-xs">
            <thead className="bg-[#090E1A] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Action ID</th>
                <th className="px-5 py-3.5">Type</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">External Reference</th>
                <th className="px-5 py-3.5">Executed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
              {actions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-500">
                    No execution actions recorded for this recovery case yet.
                  </td>
                </tr>
              ) : (
                actions.map((a) => (
                  <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                    <td className="px-5 py-3.5 font-mono font-bold text-white">{a.id}</td>
                    <td className="px-5 py-3.5 font-bold text-indigo-300">{a.action_type}</td>
                    <td className="px-5 py-3.5">
                      <Badge state={a.status} />
                    </td>
                    <td className="px-5 py-3.5 font-mono text-slate-400">{a.external_reference_id || '—'}</td>
                    <td className="px-5 py-3.5 text-slate-400 text-[11px]">
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
