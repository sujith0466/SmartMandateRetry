import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  FileText,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Eye,
  AlertCircle,
  Copy,
  Search,
} from 'lucide-react';
import { fetchAuditEvents } from '../../services/api';
import { AuditEventItem, PaginationInfo } from '../../types';
import { PayloadModal } from '../../components/ui/PayloadModal';
import { TableSkeleton } from '../../components/ui/SkeletonLoader';
import { ToastContainer, ToastMessage } from '../../components/ui/Toast';

const AUDIT_EVENT_TYPES = [
  'PAYMENT_FAILURE_CLASSIFIED',
  'CUSTOMER_CONTEXT_AGGREGATED',
  'AI_DECISION_PRODUCED',
  'POLICY_DECISION_EVALUATED',
  'RECOVERY_ACTION_EXECUTED',
  'RECOVERY_ACTION_SCHEDULED',
  'RECOVERY_ACTION_BLOCKED',
  'RECOVERY_ACTION_FAILED',
  'PAYMENT_OUTCOME_RECONCILED',
  'PAYMENT_OUTCOME_FAILED',
  'PAYMENT_OUTCOME_MISMATCH',
  'RECOVERY_STATE_TRANSITIONED',
];

export const AuditPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEventItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPayload, setSelectedPayload] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = (message: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type: 'success' }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 2500);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Copied ${label} to clipboard!`);
  };

  const loadAudit = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetchAuditEvents(page, 20, undefined, selectedEventType || undefined);
      setEvents(res.data);
      setPagination(res.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAudit(1);
  }, [selectedEventType]);

  const filteredEvents = events.filter(
    (ev) =>
      ev.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.recovery_case_id && ev.recovery_case_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ev.correlation_id && ev.correlation_id.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
      <PayloadModal data={selectedPayload} onClose={() => setSelectedPayload(null)} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Immutable Audit Trail</h1>
          <p className="text-xs text-slate-400 mt-1">
            Complete append-only audit history of lifecycle state transitions, AI decisions & policy evaluations
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search case/correlation ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-48 transition-colors"
            />
          </div>

          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            className="text-xs border border-slate-800 rounded-xl px-3 py-2 bg-slate-900 text-slate-300 font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Event Types</option>
            {AUDIT_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          <button
            onClick={() => loadAudit(pagination.page)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="glass-panel border-rose-800/80 rounded-2xl p-4 flex items-center justify-between text-xs text-rose-300 bg-rose-950/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => loadAudit(pagination.page)} className="font-bold text-rose-300 underline">
            Retry
          </button>
        </div>
      )}

      {/* Audit Events Table */}
      <div className="glass-card rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800/80 text-left text-xs">
            <thead className="bg-[#090E1A] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Event ID</th>
                <th className="px-5 py-3.5">Event Type</th>
                <th className="px-5 py-3.5">Case ID</th>
                <th className="px-5 py-3.5">Actor</th>
                <th className="px-5 py-3.5">Correlation ID</th>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-6">
                    <TableSkeleton rows={5} cols={7} />
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-slate-500">
                    <FileText className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                    <p className="font-semibold text-slate-400">No audit records found</p>
                    <p className="text-[11px] text-slate-600 mt-1">Events will appear as recovery decisions execute.</p>
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="px-5 py-4 font-mono font-bold text-white">{ev.id}</td>
                    <td className="px-5 py-4 font-bold text-slate-200">{ev.event_type}</td>
                    <td className="px-5 py-4 font-mono text-indigo-400">{ev.recovery_case_id || '—'}</td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {ev.actor}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-slate-400 text-[11px]">
                      {ev.correlation_id ? (
                        <button
                          onClick={() => copyToClipboard(ev.correlation_id!, 'Correlation ID')}
                          className="hover:text-indigo-400 transition-colors flex items-center gap-1"
                        >
                          {ev.correlation_id}
                          <Copy className="w-3 h-3 opacity-60" />
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-5 py-4 text-slate-500 text-[11px]">
                      {ev.created_at ? new Date(ev.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setSelectedPayload(ev.payload)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white font-bold text-xs transition-all shadow-sm"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        Inspect
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="px-5 py-3.5 border-t border-slate-800/80 bg-[#090D15] flex items-center justify-between text-xs text-slate-400">
          <div>
            Showing page <span className="font-bold text-white">{pagination.page}</span> of{' '}
            <span className="font-bold text-white">{pagination.pages || 1}</span> ({pagination.total} total events)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadAudit(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-xl border border-slate-800 bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => loadAudit(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="p-1.5 rounded-xl border border-slate-800 bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-300 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
