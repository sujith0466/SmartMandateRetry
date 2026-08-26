import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  FileText,
  RefreshCw,
  Search,
  Download,
  AlertCircle,
  Copy,
  ChevronLeft,
  ChevronRight,
  Eye,
  ShieldCheck,
} from 'lucide-react';
import { exportAuditCsv, fetchAuditEvents } from '../../services/api';
import { AuditEventItem, PaginationInfo } from '../../types';
import { TableSkeleton } from '../../components/ui/SkeletonLoader';
import { PayloadModal } from '../../components/ui/PayloadModal';
import { ToastContainer, ToastMessage } from '../../components/ui/Toast';
import { formatAuditEventType } from '../../utils/terminology';
import { useReducedMotion } from '../../motion/useReducedMotion';
import { staggerContainer, staggerItem } from '../../motion/motionTokens';

const AUDIT_EVENT_TYPES = [
  'CASE_CREATED',
  'AI_DECISION_PROPOSED',
  'POLICY_VALIDATION_PASSED',
  'POLICY_VALIDATION_VIOLATION',
  'ACTION_EXECUTED',
  'RECOVERY_SUCCEEDED',
  'RECOVERY_FAILED',
  'STATE_TRANSITION',
  'OPERATOR_OVERRIDE',
  'POLICY_UPDATED',
];

export const AuditPage: React.FC = () => {
  const reducedMotion = useReducedMotion();
  const [events, setEvents] = useState<AuditEventItem[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [selectedEventType, setSelectedEventType] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedPayload, setSelectedPayload] = useState<any | null>(null);
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

  const loadAudit = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAuditEvents(page, 20, selectedEventType || undefined);
      setEvents(response.data);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load audit logs');
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
      const blob = await exportAuditCsv(selectedEventType || undefined);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance_audit_ledger_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      showToast(err.message || 'Failed to export CSV', 'error');
    } finally {
      setIsExporting(false);
    }
  };

  const filteredEvents = events.filter((e) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      e.id.toLowerCase().includes(q) ||
      (e.recovery_case_id && e.recovery_case_id.toLowerCase().includes(q)) ||
      (e.correlation_id && e.correlation_id.toLowerCase().includes(q)) ||
      e.event_type.toLowerCase().includes(q)
    );
  });

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      <PayloadModal
        title="Event State Transition Payload & Cryptographic Context"
        data={selectedPayload}
        onClose={() => setSelectedPayload(null)}
      />

      {/* Header */}
      <motion.div variants={staggerItem} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-[#111827] tracking-tight font-sans">
              Compliance & Safety Audit Trail
            </h1>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0] font-bold flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" /> Immutable Append-Only Ledger
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Complete cryptographic audit trail for every AI decision proposal, policy gate verification & settlement event
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

          <motion.button
            whileTap={reducedMotion ? {} : { scale: 0.95 }}
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F7F9FC] text-[#475569] text-xs font-bold transition-colors shadow-2xs disabled:opacity-50"
            title="Export Audit CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#3B5BDB]" />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </motion.button>

          <motion.button
            whileTap={reducedMotion ? {} : { scale: 0.95 }}
            onClick={() => loadAudit(pagination.page)}
            className="p-2 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F7F9FC] text-[#64748B] hover:text-[#111827] transition-colors shadow-2xs"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#3B5BDB]' : ''}`} />
          </motion.button>
        </div>
      </motion.div>

      {error && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[#FFF1F2] border border-[#FECDD3] rounded-2xl p-4 flex items-center justify-between text-xs text-[#9F1239] shadow-sm"
        >
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#E11D48] shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={() => loadAudit(pagination.page)} className="font-bold text-[#BE123C] underline">
            Retry
          </button>
        </motion.div>
      )}

      {/* Audit Events Table */}
      <motion.div variants={staggerItem} className="bg-white rounded-2xl overflow-hidden border border-[#E5E7EB] shadow-sm">
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
                <AnimatePresence mode="popLayout">
                  {filteredEvents.map((ev, index) => (
                    <motion.tr
                      key={ev.id}
                      initial={reducedMotion ? {} : { opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.15, delay: index * 0.02 }}
                      className="hover:bg-[#F7F9FC] transition-colors group"
                    >
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
                        <motion.button
                          whileHover={reducedMotion ? {} : { scale: 1.05 }}
                          whileTap={reducedMotion ? {} : { scale: 0.95 }}
                          onClick={() => setSelectedPayload(ev.payload)}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#111827] hover:bg-[#3B5BDB] text-white font-bold text-xs transition-all shadow-2xs"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Inspect
                        </motion.button>
                      </td>
                    </motion.tr>
                  ))}
                </AnimatePresence>
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
            <motion.button
              whileTap={reducedMotion ? {} : { scale: 0.95 }}
              onClick={() => loadAudit(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-xl border border-[#E5E7EB] bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F1F5F9] text-[#475569] transition-colors shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileTap={reducedMotion ? {} : { scale: 0.95 }}
              onClick={() => loadAudit(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="p-1.5 rounded-xl border border-[#E5E7EB] bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F1F5F9] text-[#475569] transition-colors shadow-2xs"
            >
              <ChevronRight className="w-4 h-4" />
            </motion.button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};
