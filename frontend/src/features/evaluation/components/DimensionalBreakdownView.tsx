import React, { useState } from 'react';
import { CheckCircle2 } from 'lucide-react';
import { BenchmarkMetricsType, DimensionBreakdownItem } from '../../../types';

interface DimensionalBreakdownViewProps {
  metrics: BenchmarkMetricsType;
  modeName: string;
}

type DimensionKey = 'family' | 'tier' | 'category' | 'split';

export const DimensionalBreakdownView: React.FC<DimensionalBreakdownViewProps> = ({
  metrics,
  modeName,
}) => {
  const [activeDimension, setActiveDimension] = useState<DimensionKey>('family');

  let data: Record<string, DimensionBreakdownItem> = {};
  if (activeDimension === 'family') data = metrics.family_breakdown || {};
  if (activeDimension === 'tier') data = metrics.difficulty_breakdown || {};
  if (activeDimension === 'category') data = metrics.category_breakdown || {};
  if (activeDimension === 'split') data = metrics.split_breakdown || {};

  const entries = Object.entries(data);

  return (
    <div className="space-y-6">
      {/* Dimension Sub-Tabs */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center rounded-xl bg-white/90 backdrop-blur-md border border-[#E5E7EB] p-1 shadow-2xs">
          <button
            onClick={() => setActiveDimension('family')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeDimension === 'family'
                ? 'bg-[#3B5BDB] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#111827]'
            }`}
          >
            Scenario Families (14)
          </button>
          <button
            onClick={() => setActiveDimension('tier')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeDimension === 'tier'
                ? 'bg-[#3B5BDB] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#111827]'
            }`}
          >
            Difficulty Tiers (4)
          </button>
          <button
            onClick={() => setActiveDimension('category')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeDimension === 'category'
                ? 'bg-[#3B5BDB] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#111827]'
            }`}
          >
            Failure Categories
          </button>
          <button
            onClick={() => setActiveDimension('split')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeDimension === 'split'
                ? 'bg-[#3B5BDB] text-white shadow-xs'
                : 'text-[#64748B] hover:text-[#111827]'
            }`}
          >
            Dataset Splits (3)
          </button>
        </div>

        <div className="text-xs text-[#64748B]">
          Showing <span className="font-semibold text-[#111827]">{entries.length}</span> partitions for{' '}
          <span className="font-semibold text-[#3B5BDB]">{modeName}</span>
        </div>
      </div>

      {/* Dimensional Breakdown Table */}
      <div className="rounded-2xl bg-white/90 backdrop-blur-md border border-[#E5E7EB] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#64748B] text-[11px] font-bold uppercase tracking-wider border-b border-[#E5E7EB]">
              <tr>
                <th className="py-3.5 px-4">Partition Name</th>
                <th className="py-3.5 px-4 text-right">Total Scenarios</th>
                <th className="py-3.5 px-4 text-right">Decision Accuracy</th>
                <th className="py-3.5 px-4 text-right">Recovered Count</th>
                <th className="py-3.5 px-4 text-right">Recovery Rate</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] font-medium">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#94A3B8]">
                    No dimensional breakdown data available.
                  </td>
                </tr>
              ) : (
                entries.map(([name, item]) => {
                  const accPct = (item.label_accuracy * 100).toFixed(1);
                  const isPerfect = item.label_accuracy >= 1.0;
                  const recRate = item.recovery_rate !== undefined
                    ? `${(item.recovery_rate * 100).toFixed(1)}%`
                    : '--';

                  return (
                    <tr key={name} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-[#111827]">
                        {name}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-[#475569]">
                        {item.total.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-[#111827]">
                        {accPct}%
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-[#059669]">
                        {item.recovered_count.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-[#059669] font-bold">
                        {recRate}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isPerfect ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#059669] bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#A7F3D0]">
                            <CheckCircle2 className="w-3 h-3" /> 100% PASS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#D97706] bg-[#FFFBEB] px-2 py-0.5 rounded border border-[#FDE68A]">
                            {accPct}%
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
