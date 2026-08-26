import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Inbox,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ArrowUpRight,
  Search,
  Download,
  ShieldAlert,
  CheckCircle2,
  Clock,
  Layers,
} from 'lucide-react';
import { exportCasesCsv, fetchCases } from '../../services/api';
import { CaseState, PaginationInfo, RecoveryCase } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { TableSkeleton } from '../../components/ui/SkeletonLoader';
import { formatFailureCategory, formatState } from '../../utils/terminology';

type TabType = 'all' | 'active' | 'escalations' | 'recovered';

export const CasesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTabParam = (searchParams.get('tab') as TabType) || 'all';

  const [activeTab, setActiveTab] = useState<TabType>(activeTabParam);
  const [cases, setCases] = useState<RecoveryCase[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo>({ page: 1, limit: 20, total: 0, pages: 1 });
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
    setSearchParams(tab === 'all' ? {} : { tab });
  };

  const loadCases = async (page: number = 1) => {
    setLoading(true);
    setError(null);
    try {
      let stateFilter: string | undefined = undefined;
      let stageFilter: string | undefined = undefined;

      if (activeTab === 'active') {
        stageFilter = 'PENDING_OBSERVATION';
      } else if (activeTab === 'escalations') {
        stateFilter = 'ESCALATED';
      } else if (activeTab === 'recovered') {
        stateFilter = 'RECOVERED';
      }

      const response = await fetchCases(page, 20, {
        state: stateFilter,
        stage: stageFilter,
        failure_category: selectedCategory || undefined,
        search: searchQuery || undefined,
      });

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
  }, [activeTab, selectedCategory]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    loadCases(1);
  };

  const handleExportCsv = async () => {
    try {
      setIsExporting(true);
      let stateFilter: string | undefined = undefined;
      let stageFilter: string | undefined = undefined;

      if (activeTab === 'active') stageFilter = 'PENDING_OBSERVATION';
      else if (activeTab === 'escalations') stateFilter = 'ESCALATED';
      else if (activeTab === 'recovered') stateFilter = 'RECOVERED';

      const blob = await exportCasesCsv(stateFilter, stageFilter);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `recovery_cases_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to export CSV');
    } finally {
      setIsExporting(false);
    }
  };

  const getDerivedPriority = (amount: number, state: CaseState) => {
    if (state === 'ESCALATED' || amount >= 10000) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-950/80 text-rose-400 border border-rose-800/60 font-mono">
          HIGH VALUE
        </span>
      );
    }
    if (amount >= 3000) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800/60 font-mono">
          MEDIUM
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-800 text-slate-400 border border-slate-700 font-mono">
        STANDARD
      </span>
    );
  };

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
            Operational triage, lifecycle tracking & manual intervention queue
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              placeholder="Search invoice, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-44 sm:w-56 transition-colors"
            />
          </form>

          {/* Failure Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs border border-slate-800 rounded-xl px-3 py-2 bg-slate-900 text-slate-300 font-medium focus:outline-none focus:border-indigo-500"
          >
            <option value="">All Failure Types</option>
            <option value="TEMPORARY">Soft / Temporary Decline</option>
            <option value="ACTION_REQUIRED">Mandate / Card Update</option>
            <option value="PERMANENT">Hard Decline (Terminal)</option>
            <option value="RISK_FLAGGED">Risk Flagged</option>
          </select>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-bold transition-colors disabled:opacity-50"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </button>

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

      {/* Tabs Navigation */}
      <div className="flex items-center border-b border-slate-800 space-x-1">
        {[
          { id: 'all', label: 'All Ingested Cases', icon: Layers },
          { id: 'active', label: 'Active Pipeline', icon: Clock },
          { id: 'escalations', label: 'Escalation Queue (Needs Review)', icon: ShieldAlert },
          { id: 'recovered', label: 'Recovered & Settled', icon: CheckCircle2 },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id as TabType)}
              className={`flex items-center gap-2 px-4 py-3 text-xs font-bold border-b-2 transition-all ${
                isActive
                  ? 'border-indigo-500 text-indigo-300 bg-indigo-950/20'
                  : 'border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-900/40'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
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
                <th className="px-5 py-3.5">Invoice / Case</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Failure Classification</th>
                <th className="px-5 py-3.5">Amount</th>
                <th className="px-5 py-3.5">Attempts</th>
                <th className="px-5 py-3.5">Guardrail Tier</th>
                <th className="px-5 py-3.5">Created</th>
                <th className="px-5 py-3.5 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 text-slate-300 font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-6">
                    <TableSkeleton rows={6} cols={8} />
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-slate-500">
                    <Inbox className="w-10 h-10 mx-auto text-slate-600 mb-3" />
                    <p className="font-semibold text-slate-400">No recovery cases found in this view</p>
                    <p className="text-[11px] text-slate-600 mt-1">Try switching tabs or clearing search filters.</p>
                  </td>
                </tr>
              ) : (
                cases.map((c) => {
                  const stateInfo = formatState(c.state);
                  const catInfo = formatFailureCategory(c.failure_category);

                  return (
                    <tr key={c.id} className="hover:bg-slate-800/40 transition-colors group">
                      <td className="px-5 py-4">
                        <div className="font-mono font-bold text-white group-hover:text-indigo-400 transition-colors">
                          {c.invoice_id}
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">{c.id.slice(0, 16)}...</div>
                      </td>
                      <td className="px-5 py-4">
                        <Badge state={c.state} />
                        <p className="text-[10px] text-slate-400 mt-1">{stateInfo.label}</p>
                      </td>
                      <td className="px-5 py-4">
                        <span className="text-xs font-semibold text-slate-200">{catInfo.label}</span>
                        <p className="text-[10px] font-mono text-slate-500">{c.failure_code}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-100">
                          ₹{c.amount_inr?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        {(c.recovered_amount_inr ?? 0) > 0 && (
                          <div className="text-[10px] text-emerald-400 font-semibold font-mono">
                            Settled: ₹{(c.recovered_amount_inr ?? 0).toLocaleString('en-IN')}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-slate-400">
                        <span className="font-mono text-slate-200">{c.attempt_count}</span> retries /{' '}
                        <span className="font-mono text-slate-200">{c.contacts_count}</span> contacts
                      </td>
                      <td className="px-5 py-4">{getDerivedPriority(c.amount_inr, c.state)}</td>
                      <td className="px-5 py-4 text-slate-500 text-[11px]">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
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
                  );
                })
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
