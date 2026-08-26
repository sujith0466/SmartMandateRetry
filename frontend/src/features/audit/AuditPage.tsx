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
  Check,
  X,
  Filter,
} from 'lucide-react';
import { exportAuditCsv, fetchAuditEvents } from '../../services/api';
import { AuditEventItem, PaginationInfo } from '../../types';
import { TableSkeleton } from '../../components/ui/SkeletonLoader';
import { PayloadModal } from '../../components/ui/PayloadModal';
import { EmptyState } from '../../components/ui/EmptyState';
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
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(text);
    showToast(`Copied ${label} to clipboard!`);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const loadAudit = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchAuditEvents(page, 20, undefined, selectedEventType || undefined);
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
      const blob = await exportAuditCsv(undefined, selectedEventType || undefined);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `compliance_audit_ledger_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      showToast('Audit trail ledger exported successfully!', 'success');
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

  const handleFilterByCorrelation = (corrId: string) => {
    setSearchQuery(corrId);
    showToast(`Filtered audit ledger by correlation sequence: ${corrId.slice(0, 16)}...`, 'info');
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-6 text-left"
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
              className="text-xs pl-8 pr-7 py-2 rounded-xl bg-white border border-[#E5E7EB] text-[#111827] placeholder-[#64748B] focus:outline-none focus:border-[#3B5BDB] w-44 sm:w-60 shadow-2xs transition-colors"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#111827]"
              >
                <X className="w-3 h-3" />
              </button>
            )}
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
            title="Refresh Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#3B5BDB]' : ''}`} />
          </motion.button>
        </div>
      </motion.div>

      {/* Error Alert */}
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

      {/* Audit Table Container */}
      <motion.div variants={staggerItem} className="bg-white rounded-2xl overflow-hidden border border-[#E5E7EB] shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-xs">
            <thead className="bg-[#F7F9FC] text-[#64748B] font-extrabold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Event ID</th>
                <th className="px-5 py-3.5">Event Classification</th>
                <th className="px-5 py-3.5">Case Reference</th>
                <th className="px-5 py-3.5">Correlation Trace</th>
                <th className="px-5 py-3.5">Actor / Origin</th>
                <th className="px-5 py-3.5">Timestamp (UTC)</th>
                <th className="px-5 py-3.5 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] text-[#475569] font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-6">
                    <TableSkeleton rows={6} cols={7} />
                  </td>
                </tr>
              ) : filteredEvents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="p-8">
                    <EmptyState
                      icon={FileText}
                      title="No audit events found"
                      description={
                        searchQuery || selectedEventType
                          ? 'No compliance events match your active filters or correlation search.'
                          : 'No audit events have been logged to the ledger yet.'
                      }
                      actionLabel={searchQuery || selectedEventType ? 'Clear Search & Filters' : undefined}
                      onAction={() => {
                        setSearchQuery('');
                        setSelectedEventType('');
                      }}
                      actionIcon={Filter}
                    />
                  </td>
                </tr>
              ) : (
                <AnimatePresence mode="popLayout">
                  {filteredEvents.map((evt, index) => {
                    return (
                      <motion.tr
                        key={evt.id}
                        initial={reducedMotion ? {} : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15, delay: index * 0.02 }}
                        className="hover:bg-[#F7F9FC] transition-colors group"
                      >
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-[#111827]">{evt.id.slice(0, 16)}...</span>
                            <button
                              onClick={() => copyToClipboard(evt.id, 'Event ID')}
                              className="opacity-0 group-hover:opacity-100 p-1 hover:bg-[#EEF2FF] rounded text-[#64748B] hover:text-[#3B5BDB] transition-all"
                              title="Copy Event ID"
                            >
                              {copiedKey === evt.id ? <Check className="w-3 h-3 text-[#059669]" /> : <Copy className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>
                        <td className="px-5 py-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold font-mono bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE]">
                            {evt.event_type}
                          </span>
                          <p className="text-[11px] text-[#64748B] mt-0.5 font-sans">{formatAuditEventType(evt.event_type)}</p>
                        </td>
                        <td className="px-5 py-4">
                          {evt.recovery_case_id ? (
                            <span className="font-mono text-[#111827] font-semibold">
                              {evt.recovery_case_id.slice(0, 14)}...
                            </span>
                          ) : (
                            <span className="text-[#94A3B8]">Global Policy</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          {evt.correlation_id ? (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleFilterByCorrelation(evt.correlation_id!)}
                                className="font-mono text-[11px] text-[#0891B2] hover:text-[#3B5BDB] hover:underline font-bold"
                                title="Click to filter by this correlation ID"
                              >
                                {evt.correlation_id.slice(0, 16)}...
                              </button>
                              <button
                                onClick={() => copyToClipboard(evt.correlation_id!, 'Correlation ID')}
                                className="opacity-0 group-hover:opacity-100 p-0.5 hover:bg-[#ECFEFF] rounded text-[#0891B2]"
                              >
                                <Copy className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-[#94A3B8]">—</span>
                          )}
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs font-semibold text-[#111827]">{evt.actor}</span>
                        </td>
                        <td className="px-5 py-4 text-[#64748B] font-mono text-[11px]">
                          {new Date(evt.created_at).toLocaleString()}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <motion.button
                            whileHover={reducedMotion ? {} : { scale: 1.05 }}
                            whileTap={reducedMotion ? {} : { scale: 0.95 }}
                            onClick={() => setSelectedPayload(evt.payload || {})}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-white border border-[#E5E7EB] hover:border-[#C7D2FE] hover:bg-[#EEF2FF] text-[#3B5BDB] text-xs font-bold transition-all shadow-2xs"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Inspect
                          </motion.button>
                        </td>
                      </motion.tr>
                    );
                  })}
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
