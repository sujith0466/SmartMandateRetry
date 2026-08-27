import React, { useState } from 'react';
import { Search, CheckCircle2, XCircle, AlertTriangle, ArrowRight, ShieldCheck } from 'lucide-react';
import { EvaluationScenarioResultItem } from '../../../types';

interface ScenarioResultTableProps {
  results: EvaluationScenarioResultItem[];
  isLoading: boolean;
  onSelectScenario: (scenario: EvaluationScenarioResultItem) => void;
  page: number;
  totalPages: number;
  onPageChange: (newPage: number) => void;
  onFilterChange: (filters: ScenarioFilters) => void;
}

export interface ScenarioFilters {
  search?: string;
  family?: string;
  tier?: string;
  label?: string;
  is_correct?: boolean;
  is_violation?: boolean;
}

export const ScenarioResultTable: React.FC<ScenarioResultTableProps> = ({
  results,
  isLoading,
  onSelectScenario,
  page,
  totalPages,
  onPageChange,
  onFilterChange,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFamily, setSelectedFamily] = useState('');
  const [selectedTier, setSelectedTier] = useState('');
  const [selectedLabel, setSelectedLabel] = useState('');
  const [correctFilter, setCorrectFilter] = useState<'ALL' | 'CORRECT' | 'ERROR'>('ALL');
  const [violationOnly, setViolationOnly] = useState(false);

  const handleApplyFilters = () => {
    onFilterChange({
      search: searchTerm.trim() || undefined,
      family: selectedFamily || undefined,
      tier: selectedTier || undefined,
      label: selectedLabel || undefined,
      is_correct: correctFilter === 'ALL' ? undefined : correctFilter === 'CORRECT',
      is_violation: violationOnly ? true : undefined,
    });
  };

  const handleResetFilters = () => {
    setSearchTerm('');
    setSelectedFamily('');
    setSelectedTier('');
    setSelectedLabel('');
    setCorrectFilter('ALL');
    setViolationOnly(false);
    onFilterChange({});
  };

  return (
    <div className="space-y-4">
      {/* Filter Bar */}
      <div className="p-4 rounded-2xl bg-white/90 backdrop-blur-md border border-[#E5E7EB] shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-[#64748B] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Scenario ID (e.g. syn_42_test_000001)..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleApplyFilters()}
              className="w-full pl-9 pr-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] text-xs text-[#111827] placeholder:text-[#64748B] focus:outline-none focus:border-[#3B5BDB] transition-all"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full sm:w-auto">
            <select
              value={selectedTier}
              onChange={(e) => setSelectedTier(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] text-xs text-[#475569] focus:outline-none focus:border-[#3B5BDB]"
            >
              <option value="">All Tiers</option>
              <option value="EASY">EASY</option>
              <option value="MEDIUM">MEDIUM</option>
              <option value="HARD">HARD</option>
              <option value="EDGE">EDGE</option>
            </select>

            <select
              value={selectedLabel}
              onChange={(e) => setSelectedLabel(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] text-xs text-[#475569] focus:outline-none focus:border-[#3B5BDB]"
            >
              <option value="">All Labels</option>
              <option value="ALLOW">ALLOW</option>
              <option value="BLOCK">BLOCK</option>
              <option value="ESCALATE">ESCALATE</option>
              <option value="STOP">STOP</option>
            </select>

            <div className="flex items-center rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] p-0.5 text-xs">
              <button
                onClick={() => setCorrectFilter('ALL')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  correctFilter === 'ALL' ? 'bg-[#3B5BDB] text-white shadow-2xs' : 'text-[#64748B]'
                }`}
              >
                All
              </button>
              <button
                onClick={() => setCorrectFilter('CORRECT')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  correctFilter === 'CORRECT' ? 'bg-[#059669] text-white shadow-2xs' : 'text-[#64748B]'
                }`}
              >
                Match
              </button>
              <button
                onClick={() => setCorrectFilter('ERROR')}
                className={`px-2.5 py-1 rounded-lg font-semibold transition-all ${
                  correctFilter === 'ERROR' ? 'bg-[#E11D48] text-white shadow-2xs' : 'text-[#64748B]'
                }`}
              >
                Errors
              </button>
            </div>

            <button
              onClick={() => setViolationOnly(!violationOnly)}
              className={`px-3 py-1.5 rounded-xl border text-xs font-bold transition-all ${
                violationOnly
                  ? 'bg-[#FFF1F2] border-[#FECDD3] text-[#E11D48]'
                  : 'bg-[#F8FAFC] border-[#E5E7EB] text-[#64748B] hover:text-[#111827]'
              }`}
            >
              Violations Only
            </button>

            <button
              onClick={handleApplyFilters}
              className="px-3 py-1.5 rounded-xl bg-[#3B5BDB] hover:bg-[#3048B8] text-white text-xs font-bold transition-all shadow-2xs"
            >
              Apply
            </button>

            <button
              onClick={handleResetFilters}
              className="px-3 py-1.5 rounded-xl bg-white hover:bg-[#F8FAFC] text-[#64748B] border border-[#E5E7EB] text-xs font-semibold transition-all shadow-2xs"
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      {/* Scenario Table */}
      <div className="rounded-2xl bg-white/90 backdrop-blur-md border border-[#E5E7EB] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#64748B] text-[11px] font-bold uppercase tracking-wider border-b border-[#E5E7EB]">
              <tr>
                <th className="py-3.5 px-4">Scenario ID</th>
                <th className="py-3.5 px-4">Family & Tier</th>
                <th className="py-3.5 px-4 text-center">Ground Truth</th>
                <th className="py-3.5 px-4 text-center">Simulation</th>
                <th className="py-3.5 px-4 text-center">Match Status</th>
                <th className="py-3.5 px-4 text-center">Safety Policy</th>
                <th className="py-3.5 px-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] font-medium">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#64748B]">
                    Loading scenario results...
                  </td>
                </tr>
              ) : results.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#94A3B8]">
                    No scenarios matching selected filter criteria.
                  </td>
                </tr>
              ) : (
                results.map((r) => {
                  const d = r.details || {};
                  const isCorrect = d.is_label_correct;
                  const isViolation = d.is_policy_violation;

                  return (
                    <tr
                      key={r.id}
                      onClick={() => onSelectScenario(r)}
                      className="hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-[#3B5BDB]">
                        {r.scenario_id}
                      </td>
                      <td className="py-3 px-4">
                        <div className="text-[#111827] font-semibold truncate max-w-[180px]">
                          {d.scenario_family || 'N/A'}
                        </div>
                        <div className="text-[10px] text-[#64748B] font-mono">
                          {d.difficulty_tier} • {d.dataset_split}
                        </div>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#E5E7EB] text-[#111827]">
                          {r.actual_outcome}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#E5E7EB] text-[#111827]">
                          {r.simulated_outcome}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-center">
                        {isCorrect ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#059669]">
                            <CheckCircle2 className="w-3.5 h-3.5" /> MATCH
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E11D48]">
                            <XCircle className="w-3.5 h-3.5" /> MISMATCH
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {!isViolation ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#059669]">
                            <ShieldCheck className="w-3.5 h-3.5" /> PASSED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#E11D48] bg-[#FFF1F2] px-2 py-0.5 rounded border border-[#FECDD3]">
                            <AlertTriangle className="w-3.5 h-3.5" /> VIOLATION
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectScenario(r);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold text-[#3B5BDB] hover:text-[#3048B8]"
                        >
                          Inspect <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-3 bg-[#F8FAFC] border-t border-[#E5E7EB] flex items-center justify-between text-xs text-[#64748B]">
            <div>
              Page <strong className="text-[#111827]">{page}</strong> of <strong className="text-[#111827]">{totalPages}</strong>
            </div>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => onPageChange(page - 1)}
                className="px-3 py-1 rounded-lg bg-white border border-[#E5E7EB] hover:bg-[#F1F5F9] disabled:opacity-40 disabled:cursor-not-allowed text-[#111827] font-bold shadow-2xs"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => onPageChange(page + 1)}
                className="px-3 py-1 rounded-lg bg-white border border-[#E5E7EB] hover:bg-[#F1F5F9] disabled:opacity-40 disabled:cursor-not-allowed text-[#111827] font-bold shadow-2xs"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
