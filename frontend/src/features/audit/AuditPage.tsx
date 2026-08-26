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
  Download,
  ShieldCheck,
} from 'lucide-react';
import { exportAuditCsv, fetchAuditEvents } from '../../services/api';
import { AuditEventItem, PaginationInfo } from '../../types';
import { PayloadModal } from '../../components/ui/PayloadModal';
import { TableSkeleton } from '../../components/ui/SkeletonLoader';
import { ToastContainer, ToastMessage } from '../../components/ui/Toast';
import { formatAuditEventType } from '../../utils/terminology';

const AUDIT_EVENT_TYPES = [
  'PAYMENT_FAILURE_CLASSIFIED',
  'CUSTOMER_CONTEXT_AGGREGATED',
  'AI_DECISION_PRODUCED',
  'POLICY_DECISION_EVALUATED',
  'RECOVERY_ACTION_EXECUTED',
  'RECOVERY_ACTION_SCHEDULED',
  'PAYMENT_OUTCOME_RECONCILED',
  'RECOVERY_STATE_TRANSITIONED',
  'POLICY_CONFIG_UPDATED',
  'CASE_MANUALLY_ESCALATED',
  'CASE_HUMAN_INTERVENTION_RESOLVED',
];

export const AuditPage: React.FC = () => {
  const [events, setEvents] = useState<AuditEventItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedPayload, setSelectedPayload] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
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

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      const blob = await exportAuditCsv(undefined, selectedEventType || undefined);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `audit_trail_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      showToast(err.message || 'Failed to export audit CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const filteredEvents = events.filter(
    (ev) =>
      ev.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (ev.recovery_case_id && ev.recovery_case_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (ev.correlation_id && ev.correlation_id.toLowerCase().includes(searchQuery.toLowerCase())) ||
      ev.actor.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />
      <PayloadModal data={selectedPayload} onClose={() => setSelectedPayload(null)} />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-[#111827] tracking-tight font-sans">
              Immutable Compliance Audit Trail
            </h1>
            <span className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] font-mono">
              <ShieldCheck className="w-3.5 h-3.5 text-[#059669]" />
              Append-Only Ledger
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Verifiable compliance log of state transitions, AI decisions, safety policy evaluations & settlement reconciliation
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search case, correlation..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-[#111827] placeholder-[#64748B] focus:outline-none focus:border-[#3B5BDB] w-44 sm:w-56 shadow-2xs transition-colors"
            />
          </div>

          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            className="text-xs border border-[#E5E7EB] rounded-xl px-3 py-2 bg-white text-[#475569] font-bold focus:outline-none focus:border-[#3B5BDB] shadow-2xs"
          >
            <option value="">All Event Types</option>
            {AUDIT_EVENT_TYPES.map((t) => (
              <option key={t} value={t}>
                {formatAuditEventType(t)}
              </option>
            ))}
          </select>

          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F7F9FC] text-[#475569] text-xs font-bold transition-colors shadow-2xs disabled:opacity-50"
            title="Export Audit CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#3B5BDB]" />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>

          <button
            onClick={() => loadAudit(pagination.page)}
            className="p-2 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F7F9FC] text-[#64748B] hover:text-[#111827] transition-colors shadow-2xs"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#3B5BDB]' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-[#FFF1F2] border border-[#FECDD3] rounded-2xl p-4 flex items-center justify-between text-xs text-[#9F1239] shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#E11D48] shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => loadAudit(pagination.page)} className="font-bold text-[#BE123C] underline">
            Retry
          </button>
        </div>
      )}

      {/* Audit Events Table */}
      <div className="bg-white rounded-2xl overflow-hidden border border-[#E5E7EB] shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-xs">
            <thead className="bg-[#F7F9FC] text-[#64748B] font-extrabold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Event ID</th>
                <th className="px-5 py-3.5">Event Type</th>
                <th className="px-5 py-3.5">Case Reference</th>
                <th className="px-5 py-3.5">Actor</th>
                <th className="px-5 py-3.5">Correlation ID</th>
                <th className="px-5 py-3.5">Timestamp</th>
                <th className="px-5 py-3.5 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] text-[#475569] font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-6">
                    <TableSkeleton rows={5} cols={7} />
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-[#64748B]">
                    <FileText className="w-10 h-10 mx-auto text-[#94A3B8] mb-3" />
                    <p className="font-bold text-[#111827] text-sm">No audit records found</p>
                    <p className="text-xs text-[#64748B] mt-1">Events will appear as recovery decisions execute.</p>
                  </td>
                </tr>
              ) : (
                filteredEvents.map((ev) => (
                  <tr key={ev.id} className="hover:bg-[#F7F9FC] transition-colors group">
                    <td className="px-5 py-4 font-mono font-bold text-[#111827]">{ev.id.slice(0, 16)}...</td>
                    <td className="px-5 py-4">
                      <div className="font-bold text-[#111827]">{formatAuditEventType(ev.event_type)}</div>
                      <div className="text-[10px] font-mono text-[#64748B]">{ev.event_type}</div>
                    </td>
                    <td className="px-5 py-4 font-mono text-[#3B5BDB] font-bold">{ev.recovery_case_id || '—'}</td>
                    <td className="px-5 py-4">
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#F1F5F9] text-[#475569] border border-[#E5E7EB] font-mono">
                        {ev.actor}
                      </span>
                    </td>
                    <td className="px-5 py-4 font-mono text-[#64748B] text-[11px]">
                      {ev.correlation_id ? (
                        <button
                          onClick={() => copyToClipboard(ev.correlation_id!, 'Correlation ID')}
                          className="hover:text-[#3B5BDB] transition-colors flex items-center gap-1"
                        >
                          {ev.correlation_id}
                          <Copy className="w-3 h-3 opacity-60" />
                        </button>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-5 py-4 text-[#64748B] text-[11px]">
                      {ev.created_at ? new Date(ev.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <button
                        onClick={() => setSelectedPayload(ev.payload)}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#111827] hover:bg-[#3B5BDB] text-white font-bold text-xs transition-all shadow-2xs"
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
        <div className="px-5 py-3.5 border-t border-[#E5E7EB] bg-[#F7F9FC] flex items-center justify-between text-xs text-[#475569] font-medium">
          <div>
            Showing page <span className="font-bold text-[#111827]">{pagination.page}</span> of{' '}
            <span className="font-bold text-[#111827]">{pagination.pages || 1}</span> ({pagination.total} total events)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadAudit(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-xl border border-[#E5E7EB] bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F1F5F9] text-[#475569] transition-colors shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => loadAudit(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="p-1.5 rounded-xl border border-[#E5E7EB] bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F1F5F9] text-[#475569] transition-colors shadow-2xs"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
