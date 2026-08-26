import React from 'react';
import { Play, RotateCw, History, ShieldCheck, Database, Layers, Sparkles } from 'lucide-react';
import { StatCard } from '../../../components/ui/StatCard';
import { BenchmarkMetricsType, EvaluationRunItem, EvaluationSummaryResponse } from '../../../types';

interface EvaluationOverviewProps {
  summary: EvaluationSummaryResponse | null;
  activeRun: EvaluationRunItem | null;
  activeMetrics: BenchmarkMetricsType | null;
  selectedSplit: 'TRAIN' | 'VALIDATION' | 'TEST' | 'ALL';
  onSplitChange: (split: 'TRAIN' | 'VALIDATION' | 'TEST' | 'ALL') => void;
  isRunningBenchmark: boolean;
  onRunBenchmark: () => void;
  onRefresh: () => void;
  onOpenHistory: () => void;
}

export const EvaluationOverview: React.FC<EvaluationOverviewProps> = ({
  summary,
  activeRun,
  activeMetrics,
  selectedSplit,
  onSplitChange,
  isRunningBenchmark,
  onRunBenchmark,
  onRefresh,
  onOpenHistory,
}) => {
  const totalEvaluated = activeMetrics?.total_evaluated || summary?.dataset.total_scenarios || 0;
  const labelAccuracy = activeMetrics ? (activeMetrics.label_accuracy * 100).toFixed(2) : '--';
  const recoveryRate = activeMetrics ? (activeMetrics.simulated_recovery_rate * 100).toFixed(2) : '--';
  const upliftPp = activeMetrics?.recovery_uplift_pp !== null && activeMetrics?.recovery_uplift_pp !== undefined
    ? `${activeMetrics.recovery_uplift_pp >= 0 ? '+' : ''}${activeMetrics.recovery_uplift_pp.toFixed(2)} pp`
    : '--';
  const totalViolations = activeMetrics?.safety_metrics.total_policy_violations ?? 0;

  return (
    <div className="space-y-4">
      {/* Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4.5 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#3B5BDB] shadow-2xs">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[#111827] font-sans">
                {activeRun?.dataset_name || summary?.dataset.name || 'eval_dataset_42_5000'}
              </h2>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE] font-mono">
                SEED {summary?.dataset.seed || 42}
              </span>
            </div>
            <p className="text-xs text-[#64748B] mt-0.5">
              5,000 synthetic failure scenarios across 14 failure families & 4 difficulty tiers
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Split Selector */}
          <div className="flex items-center rounded-xl bg-[#F1F5F9] border border-[#E5E7EB] p-1 shadow-2xs">
            {(['TEST', 'VALIDATION', 'TRAIN', 'ALL'] as const).map((s) => (
              <button
                key={s}
                onClick={() => onSplitChange(s)}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-all ${
                  selectedSplit === s
                    ? 'bg-white text-[#111827] shadow-xs'
                    : 'text-[#64748B] hover:text-[#111827]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>

          <button
            onClick={onOpenHistory}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white hover:bg-[#F7F9FC] text-[#475569] border border-[#E5E7EB] text-xs font-bold transition-all shadow-2xs"
          >
            <History className="w-3.5 h-3.5 text-[#64748B]" />
            Runs ({summary?.total_runs || 0})
          </button>

          <button
            onClick={onRefresh}
            className="p-2 rounded-xl bg-white hover:bg-[#F7F9FC] text-[#64748B] hover:text-[#111827] border border-[#E5E7EB] transition-all shadow-2xs"
            title="Refresh Evaluation Data"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={onRunBenchmark}
            disabled={isRunningBenchmark}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#3B5BDB] hover:bg-[#3048B8] text-white text-xs font-bold shadow-xs transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRunningBenchmark ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                Evaluating...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Run Benchmark
              </>
            )}
          </button>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Active Mode Accuracy"
          value={`${labelAccuracy}%`}
          subtitle={`${totalEvaluated.toLocaleString()} scenarios (${selectedSplit} split)`}
          icon={ShieldCheck}
          variant="sapphire"
        />

        <StatCard
          title="Simulated Recovery Rate"
          value={`${recoveryRate}%`}
          subtitle="Strictly eligible failure population"
          icon={Sparkles}
          variant="emerald"
        />

        <StatCard
          title="Recovery Uplift (vs Native)"
          value={upliftPp}
          subtitle="Percentage points over 3-retry baseline"
          icon={Layers}
          variant="violet"
        />

        <StatCard
          title="Zero-Tolerance Violations"
          value={totalViolations.toString()}
          subtitle={totalViolations === 0 ? 'Zero safety policy breaches' : 'CRITICAL SAFETY FAILURE'}
          icon={ShieldCheck}
          variant={totalViolations === 0 ? 'emerald' : 'rose'}
        />
      </div>
    </div>
  );
};
