import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  RefreshCw,
  CheckCircle2,
  Activity,
  User,
  FileCheck,
} from 'lucide-react';
import { fetchCaseActions, fetchCaseDetail, fetchCaseReconciliation } from '../../services/api';
import { CaseDetailResponse, ReconciliationStatusInfo, RecoveryActionItem } from '../../types';

export const CaseDetailPage: React.FC = () => {
  const { caseId } = useParams<{ caseId: string }>();
  const [detail, setDetail] = useState<CaseDetailResponse | null>(null);
  const [actions, setActions] = useState<RecoveryActionItem[]>([]);
  const [reconciliation, setReconciliation] = useState<ReconciliationStatusInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-green-600 animate-spin" />
        <span className="ml-2 text-sm text-gray-500 font-medium">Loading case details...</span>
      </div>
    );
  }

  if (error || !detail) {
    return (
      <div className="space-y-4">
        <Link to="/cases" className="inline-flex items-center text-xs font-semibold text-gray-600 hover:text-gray-900">
          <ArrowLeft className="w-4 h-4 mr-1" /> Back to Cases
        </Link>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-xs text-red-700">
          <p className="font-semibold text-sm text-red-800">Case Details Error</p>
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
      label: 'Action In Progress',
      active: ['ACTION_PENDING', 'IN_PROGRESS', 'WAITING_FOR_OUTCOME', 'RECOVERED', 'FAILED'].includes(c.state),
    },
    {
      label: c.state === 'RECOVERED' ? 'Recovered' : c.state === 'FAILED' ? 'Failed' : 'Outcome Pending',
      active: ['RECOVERED', 'FAILED'].includes(c.state),
    },
  ];

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Link to="/cases" className="p-1.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-gray-600">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">{c.id}</h1>
              <span
                className={`px-2.5 py-0.5 rounded text-xs font-bold ${
                  c.state === 'RECOVERED'
                    ? 'bg-green-100 text-green-800'
                    : c.state === 'ESCALATED'
                    ? 'bg-purple-100 text-purple-800'
                    : c.state === 'FAILED'
                    ? 'bg-red-100 text-red-800'
                    : 'bg-blue-100 text-blue-800'
                }`}
              >
                {c.state}
              </span>
            </div>
            <p className="text-xs text-gray-500 mt-0.5">
              Subscription: <span className="font-mono text-gray-700">{c.subscription_id}</span> | Stage:{' '}
              <span className="font-medium text-gray-700">{c.stage}</span>
            </p>
          </div>
        </div>

        <button
          onClick={loadData}
          className="flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1 text-gray-500" />
          Refresh
        </button>
      </div>

      {/* Visual Recovery Lifecycle Progression */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Recovery State Progression</h3>
        <div className="flex items-center justify-between overflow-x-auto py-2">
          {lifecycleSteps.map((step, idx) => (
            <React.Fragment key={step.label}>
              <div className="flex flex-col items-center min-w-[90px] text-center">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    step.active ? 'bg-green-600 text-white' : 'bg-gray-100 text-gray-400 border border-gray-200'
                  }`}
                >
                  {step.active ? <CheckCircle2 className="w-4 h-4" /> : idx + 1}
                </div>
                <span className={`text-xs mt-1.5 font-medium ${step.active ? 'text-gray-900' : 'text-gray-400'}`}>
                  {step.label}
                </span>
              </div>
              {idx < lifecycleSteps.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 ${step.active ? 'bg-green-500' : 'bg-gray-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Grid: Context & Settlement Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Customer & Subscription Context (Sanitized) */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <User className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">Sanitized Customer Context</h3>
          </div>
          <div className="text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Customer ID:</span>
              <span className="font-mono text-gray-800">{customer?.id || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Sanitized Email:</span>
              <span className="font-medium text-gray-800">{customer?.email || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Sanitized Contact:</span>
              <span className="font-medium text-gray-800">{customer?.contact || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Subscription Plan:</span>
              <span className="font-medium text-gray-800">{subscription?.plan_id || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Current Cycle:</span>
              <span className="font-medium text-gray-800">{subscription?.current_cycle || 1}</span>
            </div>
          </div>
        </div>

        {/* Settlement Reconciliation Status */}
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-3">
          <div className="flex items-center space-x-2 border-b border-gray-100 pb-3">
            <FileCheck className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">Settlement Reconciliation</h3>
          </div>
          <div className="text-xs space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-gray-500">Settlement Status:</span>
              <span
                className={`px-2 py-0.5 rounded font-bold ${
                  reconciliation?.is_settled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-600'
                }`}
              >
                {reconciliation?.is_settled ? 'RECONCILED (PAID)' : 'UNRECONCILED'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Recovered Amount:</span>
              <span className="font-bold text-green-700">
                ₹{reconciliation?.recovered_amount_inr?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Reconciled Action ID:</span>
              <span className="font-mono text-gray-800">{reconciliation?.reconciled_action_id || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Payment Reference:</span>
              <span className="font-mono text-gray-800">{reconciliation?.external_reference_id || '—'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Resolved Timestamp:</span>
              <span className="text-gray-800">
                {reconciliation?.resolved_at ? new Date(reconciliation.resolved_at).toLocaleString() : '—'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Execution Actions List */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-gray-100 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Activity className="w-4 h-4 text-gray-500" />
            <h3 className="text-sm font-semibold text-gray-900">Execution Actions History</h3>
          </div>
          <span className="text-xs text-gray-500">{actions.length} action(s) executed</span>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2.5">Action ID</th>
                <th className="px-4 py-2.5">Type</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">External Reference</th>
                <th className="px-4 py-2.5">Executed At</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700">
              {actions.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-gray-400">
                    No recovery actions recorded for this case yet.
                  </td>
                </tr>
              ) : (
                actions.map((a) => (
                  <tr key={a.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-mono text-gray-900">{a.id}</td>
                    <td className="px-4 py-2.5 font-semibold text-gray-800">{a.action_type}</td>
                    <td className="px-4 py-2.5">
                      <span
                        className={`inline-block px-2 py-0.5 rounded text-xs font-bold ${
                          a.status === 'RECONCILED'
                            ? 'bg-green-100 text-green-800'
                            : a.status === 'FAILED'
                            ? 'bg-red-100 text-red-800'
                            : 'bg-blue-100 text-blue-800'
                        }`}
                      >
                        {a.status}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 font-mono text-gray-600">{a.external_reference_id || '—'}</td>
                    <td className="px-4 py-2.5 text-gray-500">
                      {a.executed_at ? new Date(a.executed_at).toLocaleString() : '—'}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
