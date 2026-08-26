import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Inbox,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ArrowUpRight,
  Search,
} from 'lucide-react';
import { fetchCases } from '../../services/api';
import { CaseState, PaginationInfo, RecoveryCase } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { TableSkeleton } from '../../components/ui/SkeletonLoader';

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
  const [searchQuery, setSearchQuery] = useState<string>('');
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

  // Derived presentation priority
  const getDerivedPriority = (amount: number, state: CaseState) => {
    if (state === 'ESCALATED' || amount >= 10000) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-extrabold bg-rose-950/80 text-rose-400 border border-rose-800/60">
          HIGH
        </span>
      );
    }
    if (amount >= 3000) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800/60">
          MEDIUM
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold bg-slate-800 text-slate-400 border border-slate-700">
        STANDARD
      </span>
    );
  };

  const filteredCases = cases.filter(
    (c) =>
      c.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.subscription_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Header & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Recovery Cases Inbox</h1>
          <p className="text-xs text-slate-400 mt-1">
            Browse, filter, and inspect failed mandate subscriptions in recovery
          </p>
        </div>

        {/* Filter Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search case ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-40 sm:w-48 transition-colors"
            />
          </div>

          {/* State Filter */}
          <select
            value={selectedState}
            onChange={(e) => setSelectedState(e.target.value)}
            className="text-xs border border-slate-800 rounded-xl px-3 py-2 bg-slate-900 text-slate-300 font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="">All States</option>
            {CASE_STATES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {/* Stage Filter */}
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="text-xs border border-slate-800 rounded-xl px-3 py-2 bg-slate-900 text-slate-300 font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Stages</option>
            <option value="PENDING_OBSERVATION">Pending Observation</option>
            <option value="HALTED_RECOVERY">Halted Recovery</option>
          </select>

          {/* Refresh Button */}
          <button
            onClick={() => loadCases(pagination.page)}
            className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-400 hover:text-slate-200 transition-colors"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-indigo-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="glass-panel border-rose-800/80 rounded-2xl p-4 flex items-center justify-between text-xs text-rose-300 bg-rose-950/20">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400" />
            <span>{error}</span>
          </div>
          <button onClick={() => loadCases(pagination.page)} className="font-bold text-rose-300 underline">
            Retry
          </button>
        </div>
      )}

      {/* Cases Table Card */}
      <div className="glass-card rounded-2xl overflow-hidden border border-slate-800/80 shadow-2xl">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-800/80 text-left text-xs">
            <thead className="bg-[#090E1A] text-slate-400 font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Case ID</th>
                <th className="px-5 py-3.5">State</th>
                <th className="px-5 py-3.5">Stage</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Attempts</th>
                <th className="px-5 py-3.5">Priority</th>
                <th className="px-5 py-3.5">Created</th>
                <th className="px-5 py-3.5 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-6">
                    <TableSkeleton rows={5} cols={8} />
                  </td>
                </tr>
              ) : filteredCases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-500">
                    <Inbox className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                    <p className="font-semibold text-slate-400">No recovery cases found</p>
                    <p className="text-[11px] text-slate-600 mt-1">Try clearing your filters or check back later.</p>
                  </td>
                </tr>
              ) : (
                filteredCases.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40 transition-colors group">
                    <td className="px-5 py-4 font-mono font-bold text-white group-hover:text-indigo-400 transition-colors">
                      {c.id}
                    </td>
                    <td className="px-5 py-4">
                      <Badge state={c.state} />
                    </td>
                    <td className="px-5 py-4 text-slate-400 font-mono text-[11px]">{c.stage}</td>
                    <td className="px-5 py-4 font-bold text-slate-100">
                      ₹{c.amount_inr?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td className="px-5 py-4 text-slate-400">
                      <span className="font-mono text-slate-200">{c.attempt_count}</span> retries /{' '}
                      <span className="font-mono text-slate-200">{c.contacts_count}</span> contacts
                    </td>
                    <td className="px-5 py-4">{getDerivedPriority(c.amount_inr, c.state)}</td>
                    <td className="px-5 py-4 text-slate-500 text-[11px]">
                      {c.created_at ? new Date(c.created_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-5 py-4 text-right">
                      <Link
                        to={`/cases/${c.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-indigo-600 text-slate-200 hover:text-white font-bold text-xs transition-all shadow-sm"
                      >
                        Inspect
                        <ArrowUpRight className="w-3.5 h-3.5" />
                      </Link>
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
            <span className="font-bold text-white">{pagination.pages || 1}</span> ({pagination.total} total cases)
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => loadCases(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-xl border border-slate-800 bg-slate-900 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800 text-slate-300 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => loadCases(pagination.page + 1)}
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
