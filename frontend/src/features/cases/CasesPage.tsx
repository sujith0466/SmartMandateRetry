import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
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
import { useReducedMotion } from '../../motion/useReducedMotion';
import { staggerContainer, staggerItem } from '../../motion/motionTokens';

type TabType = 'all' | 'active' | 'escalations' | 'recovered';

export const CasesPage: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTabParam = (searchParams.get('tab') as TabType) || 'all';
  const reducedMotion = useReducedMotion();

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
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3]">
          HIGH VALUE
        </span>
      );
    }
    if (amount >= 3000) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A]">
          MEDIUM
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#F1F5F9] text-[#475569] border border-[#E5E7EB]">
        STANDARD
      </span>
    );
  };

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      {/* Header & Controls */}
      <motion.div
        variants={staggerItem}
        className="flex flex-col md:flex-row md:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-black text-[#111827] tracking-tight font-sans">
            Recovery Cases Workspace
          </h1>
          <p className="text-xs text-[#64748B] mt-1">
            Operational mandate recovery triage, failure classification & human intervention queue
          </p>
        </div>

        {/* Action Toolbar */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Search Form */}
          <form onSubmit={handleSearchSubmit} className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-[#64748B]" />
            <input
              type="text"
              placeholder="Search invoice, customer..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="text-xs pl-8 pr-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-[#111827] placeholder-[#64748B] focus:outline-none focus:border-[#3B5BDB] w-44 sm:w-56 shadow-2xs transition-colors"
            />
          </form>

          {/* Failure Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-xs border border-[#E5E7EB] rounded-xl px-3 py-2 bg-white text-[#475569] font-bold focus:outline-none focus:border-[#3B5BDB] shadow-2xs"
          >
            <option value="">All Failure Types</option>
            <option value="TEMPORARY">Soft Decline (Insufficient Funds)</option>
            <option value="ACTION_REQUIRED">Mandate / Card Update Needed</option>
            <option value="PERMANENT">Hard Decline (Terminal Stop)</option>
            <option value="RISK_FLAGGED">Risk Flagged</option>
          </select>

          {/* Export CSV Button */}
          <motion.button
            whileTap={reducedMotion ? {} : { scale: 0.95 }}
            onClick={handleExportCsv}
            disabled={isExporting}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F7F9FC] text-[#475569] text-xs font-bold transition-colors shadow-2xs disabled:opacity-50"
            title="Export CSV"
          >
            <Download className="w-3.5 h-3.5 text-[#3B5BDB]" />
            <span>{isExporting ? 'Exporting...' : 'Export CSV'}</span>
          </motion.button>

          {/* Refresh Button */}
          <motion.button
            whileTap={reducedMotion ? {} : { scale: 0.95 }}
            onClick={() => loadCases(pagination.page)}
            className="p-2 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F7F9FC] text-[#64748B] hover:text-[#111827] transition-colors shadow-2xs"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-[#3B5BDB]' : ''}`} />
          </motion.button>
        </div>
      </motion.div>

      {/* Filter Tabs Navigation with Fluid Active Pill */}
      <motion.div variants={staggerItem} className="flex items-center border-b border-[#E5E7EB] space-x-1">
        {[
          { id: 'all', label: 'All Ingested Cases', icon: Layers },
          { id: 'active', label: 'Active Pipeline', icon: Clock },
          { id: 'escalations', label: 'Needs Review (Escalated)', icon: ShieldAlert },
          { id: 'recovered', label: 'Recovered & Settled', icon: CheckCircle2 },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => handleTabChange(t.id as TabType)}
              className={`relative flex items-center gap-2 px-4 py-3 text-xs font-bold transition-colors z-0 ${
                isActive ? 'text-[#3B5BDB]' : 'text-[#64748B] hover:text-[#111827]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="casesActiveTabPill"
                  className="absolute inset-0 bg-white border-b-2 border-[#3B5BDB] rounded-t-xl -z-10 shadow-2xs"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#3B5BDB]' : 'text-[#64748B]'}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
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
          <button onClick={() => loadCases(pagination.page)} className="font-bold text-[#BE123C] underline">
            Retry
          </button>
        </motion.div>
      )}

      {/* Cases Table Container */}
      <motion.div variants={staggerItem} className="bg-white rounded-2xl overflow-hidden border border-[#E5E7EB] shadow-sm">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-[#E5E7EB] text-left text-xs">
            <thead className="bg-[#F7F9FC] text-[#64748B] font-extrabold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-5 py-3.5">Invoice / Case ID</th>
                <th className="px-5 py-3.5">Recovery Status</th>
                <th className="px-5 py-3.5">Failure Category</th>
                <th className="px-5 py-3.5">Invoice Amount</th>
                <th className="px-5 py-3.5">Attempts & Contacts</th>
                <th className="px-5 py-3.5">Priority</th>
                <th className="px-5 py-3.5">Ingested</th>
                <th className="px-5 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] text-[#475569] font-medium">
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-6">
                    <TableSkeleton rows={6} cols={8} />
                  </td>
                </tr>
              ) : cases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-16 text-center text-[#64748B]">
                    <Inbox className="w-10 h-10 mx-auto text-[#94A3B8] mb-3" />
                    <p className="font-bold text-[#111827] text-sm">No recovery cases found in this view</p>
                    <p className="text-xs text-[#64748B] mt-1">Try switching tabs or resetting search filters.</p>
                  </td>
                </tr>
              ) : (
                <AnimatePresence mode="popLayout">
                  {cases.map((c, index) => {
                    const stateInfo = formatState(c.state);
                    const catInfo = formatFailureCategory(c.failure_category);

                    return (
                      <motion.tr
                        key={c.id}
                        initial={reducedMotion ? {} : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.15, delay: index * 0.02 }}
                        className="hover:bg-[#F7F9FC] transition-colors group"
                      >
                        <td className="px-5 py-4">
                          <div className="font-mono font-bold text-[#111827] group-hover:text-[#3B5BDB] transition-colors">
                            {c.invoice_id}
                          </div>
                          <div className="text-[11px] text-[#64748B] font-mono">{c.id.slice(0, 16)}...</div>
                        </td>
                        <td className="px-5 py-4">
                          <Badge state={c.state} />
                          <p className="text-[10px] text-[#64748B] font-medium mt-1">{stateInfo.label}</p>
                        </td>
                        <td className="px-5 py-4">
                          <span className="text-xs font-bold text-[#111827]">{catInfo.label}</span>
                          <p className="text-[10px] font-mono text-[#64748B]">{c.failure_code}</p>
                        </td>
                        <td className="px-5 py-4">
                          <div className="font-black text-[#111827] text-sm font-sans">
                            ₹{c.amount_inr?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </div>
                          {(c.recovered_amount_inr ?? 0) > 0 && (
                            <div className="text-[11px] text-[#059669] font-bold font-mono mt-0.5">
                              ✓ Settled ₹{(c.recovered_amount_inr ?? 0).toLocaleString('en-IN')}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-4 text-[#475569]">
                          <span className="font-mono font-bold text-[#111827]">{c.attempt_count}</span> retries •{' '}
                          <span className="font-mono font-bold text-[#111827]">{c.contacts_count}</span> contacts
                        </td>
                        <td className="px-5 py-4">{getDerivedPriority(c.amount_inr, c.state)}</td>
                        <td className="px-5 py-4 text-[#64748B] text-[11px]">
                          {c.created_at ? new Date(c.created_at).toLocaleDateString() : '—'}
                        </td>
                        <td className="px-5 py-4 text-right">
                          <Link
                            to={`/cases/${c.id}`}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#111827] hover:bg-[#3B5BDB] text-white font-bold text-xs transition-all shadow-2xs group-hover:shadow-xs"
                          >
                            Inspect
                            <ArrowUpRight className="w-3.5 h-3.5" />
                          </Link>
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
            <span className="font-bold text-[#111827]">{pagination.pages || 1}</span> ({pagination.total} total cases)
          </div>
          <div className="flex items-center gap-2">
            <motion.button
              whileTap={reducedMotion ? {} : { scale: 0.95 }}
              onClick={() => loadCases(pagination.page - 1)}
              disabled={pagination.page <= 1}
              className="p-1.5 rounded-xl border border-[#E5E7EB] bg-white disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#F1F5F9] text-[#475569] transition-colors shadow-2xs"
            >
              <ChevronLeft className="w-4 h-4" />
            </motion.button>
            <motion.button
              whileTap={reducedMotion ? {} : { scale: 0.95 }}
              onClick={() => loadCases(pagination.page + 1)}
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
