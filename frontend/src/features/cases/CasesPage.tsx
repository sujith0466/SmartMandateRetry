import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Inbox,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ArrowUpRight,
} from 'lucide-react';
import { fetchCases } from '../../services/api';
import { CaseState, PaginationInfo, RecoveryCase } from '../../types';

const CASE_STATES: CaseState[] = [
  'DETECTED',
  'ANALYZING',
  'DECISION_PENDING',
  'POLICY_REVIEW',
  'SCHEDULED',
  'ACTION_PENDING',
  'IN_PROGRESS',
  'WAITING_FOR_OUTCOME',
  'ESCALATED',
  'RECOVERED',
  'FAILED',
  'STOPPED',
  'EXPIRED',
];

export const CasesPage: React.FC = () => {
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [selectedState, setSelectedState] = useState<string>('');
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCases = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetchCases(page, 20, selectedState || undefined, selectedStage || undefined);
      setCases(response.data);
      setPagination(response.pagination);
    } catch (err: any) {
      setError(err.message || 'Failed to load recovery cases');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCases(1);
  }, [selectedState, selectedStage]);

  const getStateBadge = (state: CaseState) => {
    switch (state) {
      case 'RECOVERED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-green-100 text-green-800">RECOVERED</span>;
      case 'FAILED':
      case 'STOPPED':
      case 'EXPIRED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-red-100 text-red-800">{state}</span>;
      case 'ESCALATED':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-purple-100 text-purple-800">ESCALATED</span>;
      case 'SCHEDULED':
      case 'ACTION_PENDING':
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-blue-100 text-blue-800">{state}</span>;
      default:
        return <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold bg-amber-100 text-amber-800">{state}</span>;
    }
  };

  // Derive presentation priority from amount and stage
  const getDerivedPriority = (amount: number, state: CaseState) => {
    if (state === 'ESCALATED' || amount >= 10000) {
      return <span className="text-xs font-bold text-red-600">HIGH</span>;
    }
    if (amount >= 3000) {
      return <span className="text-xs font-semibold text-amber-600">MEDIUM</span>;
    }
    return <span className="text-xs font-medium text-gray-500">STANDARD</span>;
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Recovery Cases Inbox</h1>
          <p className="text-xs text-gray-500 mt-1">
            Browse, filter, and inspect failed mandate subscriptions in recovery
          </p>
        </div>

        {/* Filters */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <select
              value={selectedState}
              onChange={(e) => setSelectedState(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              <option value="">All States</option>
              {CASE_STATES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div className="relative">
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="text-xs border border-gray-300 rounded-lg px-2.5 py-1.5 bg-white text-gray-700 font-medium focus:outline-none focus:ring-1 focus:ring-green-500"
            >
              <option value="">All Stages</option>
              <option value="PENDING_OBSERVATION">Pending Observation</option>
              <option value="HALTED_RECOVERY">Halted Recovery</option>
            </select>
          </div>

          <button
            onClick={() => loadCases(pagination.page)}
            className="p-1.5 border border-gray-300 rounded-lg bg-white hover:bg-gray-50 text-gray-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-green-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={() => loadCases(pagination.page)} className="font-semibold text-red-800 underline ml-4">
            Retry
          </button>
        </div>
      )}

      {/* Table Card */}
      <div className="bg-white border border-gray-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-left text-xs">
            <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider">
              <tr>
                <th className="px-4 py-3">Case ID</th>
                <th className="px-4 py-3">State</th>
                <th className="px-4 py-3">Stage</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Attempts</th>
                <th className="px-4 py-3">Priority</th>
                <th className="px-4 py-3">Created</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <RefreshCw className="w-5 h-5 mx-auto animate-spin text-green-600 mb-2" />
                    Loading cases...
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-400">
                    <Inbox className="w-8 h-8 mx-auto text-gray-300 mb-2" />
                    No recovery cases found matching selected criteria.
                  </td>
                </tr>
              ) : (
                cases.map((c) => (
                  <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-gray-900">{c.id}</td>
                    <td className="px-4 py-3">{getStateBadge(c.state)}</td>
                    <td className="px-4 py-3 text-gray-500">{c.stage}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">
                      ₹{c.amount_inr?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {c.attempt_count} retries / {c.contacts_count} contacts
                    </td>
                    <td className="px-4 py-3">{getDerivedPriority(c.amount_inr, c.state)}</td>
                    <td className="px-4 py-3 text-gray-500">
                      {c.created_at ? new Date(c.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        to={`/cases/${c.id}`}
                        className="inline-flex items-center px-2.5 py-1 rounded bg-green-50 text-green-700 hover:bg-green-100 font-semibold transition-colors"
                      >
                        Inspect
                        <ArrowUpRight className="w-3.5 h-3.5 ml-1" />
                      </Link>
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
            <span className="font-semibold text-gray-900">{pagination.pages || 1}</span> ({pagination.total} total cases)
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => loadCases(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1 rounded border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => loadCases(pagination.page + 1)}
              disabled={pagination.page >= pagination.pages}
              className="p-1 rounded border border-gray-300 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-50"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
