import React, { useEffect, useState } from 'react';
import { FileText, RefreshCw, ChevronLeft, ChevronRight, Eye, AlertCircle } from 'lucide-react';
import { fetchAuditEvents } from '../../services/api';
import { AuditEventItem, PaginationInfo } from '../../types';

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
  const [selectedPayload, setSelectedPayload] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Immutable Audit Trail</h1>
          <p className="text-xs text-gray-500 mt-1">
            Complete append-only audit history of lifecycle state transitions, AI decisions & policy evaluations
          </p>
        </div>

        {/* Filter */}
        <div className="flex items-center space-x-2">
          <select
            value={selectedEventType}
            onChange={(e) => setSelectedEventType(e.target.value)}
            className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-green-500"
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
            className="p-1.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-gray-600"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-green-600' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => loadAudit(pagination.page)} className="font-semibold text-red-800 underline">
            Retry
          </button>
        </div>
      )}

      {/* Audit Events Table */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Event ID</th>
                <th className="px-4 py-3">Event Type</th>
                <th className="px-4 py-3">Case ID</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Correlation ID</th>
                <th className="px-4 py-3">Timestamp</th>
                <th className="px-4 py-3 text-right">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <RefreshCw className="w-5 h-5 mx-auto animate-spin text-green-600 mb-2" />
                    Loading audit trail...
                  </td>
                </tr>
              ) : events.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-gray-400">
                    <FileText className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    No audit records found.
                  </td>
                </tr>
              ) : (
                events.map((ev) => (
                  <tr key={ev.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono text-gray-900">{ev.id}</td>
                    <td className="px-4 py-3 font-bold text-gray-800">{ev.event_type}</td>
                    <td className="px-4 py-3 font-mono text-gray-600">{ev.recovery_case_id || '—'}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-semibold">
                        {ev.actor}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{ev.correlation_id || '—'}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {ev.created_at ? new Date(ev.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedPayload(ev.payload)}
                        className="inline-flex items-center px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded text-xs transition-colors"
                      >
                        <Eye className="w-3.5 h-3.5 mr-1" />
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
        <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <div>
            Showing page <span className="font-semibold text-gray-900">{pagination.page}</span> of{' '}
            <span className="font-semibold text-gray-900">{pagination.pages || 1}</span> ({pagination.total} total events)
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => loadAudit(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1 rounded border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => loadAudit(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="p-1 rounded border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Payload Inspection Modal */}
      {selectedPayload && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-lg w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-sm font-bold text-gray-900">Audit Event Payload</h3>
              <button
                onClick={() => setSelectedPayload(null)}
                className="text-gray-400 hover:text-gray-600 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg text-xs overflow-auto max-h-80 font-mono">
              {JSON.stringify(selectedPayload, null, 2)}
            </pre>
            <div className="flex justify-end">
              <button
                onClick={() => setSelectedPayload(null)}
                className="px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-xs font-semibold"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
