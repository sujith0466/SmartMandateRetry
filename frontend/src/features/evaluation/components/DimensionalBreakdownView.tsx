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
        <div className="flex items-center rounded-xl bg-slate-900 border border-slate-800 p-1">
          <button
            onClick={() => setActiveDimension('family')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeDimension === 'family'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Scenario Families (14)
          </button>
          <button
            onClick={() => setActiveDimension('tier')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeDimension === 'tier'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Difficulty Tiers (4)
          </button>
          <button
            onClick={() => setActiveDimension('category')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeDimension === 'category'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Failure Categories
          </button>
          <button
            onClick={() => setActiveDimension('split')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeDimension === 'split'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Dataset Splits (3)
          </button>
        </div>

        <div className="text-xs text-slate-400">
          Showing <span className="font-semibold text-white">{entries.length}</span> partitions for{' '}
          <span className="font-semibold text-indigo-400">{modeName}</span>
        </div>
      </div>

      {/* Dimensional Breakdown Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-800/80">
              <tr>
                <th className="py-3.5 px-4">Partition Name</th>
                <th className="py-3.5 px-4 text-right">Total Scenarios</th>
                <th className="py-3.5 px-4 text-right">Decision Accuracy</th>
                <th className="py-3.5 px-4 text-right">Recovered Count</th>
                <th className="py-3.5 px-4 text-right">Recovery Rate</th>
                <th className="py-3.5 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
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
                    <tr key={name} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 px-4 font-mono font-bold text-white">
                        {name}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-slate-300">
                        {item.total.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono font-bold text-slate-200">
                        {accPct}%
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-400">
                        {item.recovered_count.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono text-emerald-400 font-bold">
                        {recRate}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        {isPerfect ? (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-800/40">
                            <CheckCircle2 className="w-3 h-3" /> 100% PASS
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/40">
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
