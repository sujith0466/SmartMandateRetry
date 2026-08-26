import React from 'react';
import { Target } from 'lucide-react';
import { BenchmarkMetricsType } from '../../../types';

interface ConfusionMatrixViewProps {
  metrics: BenchmarkMetricsType;
  modeName: string;
}

const CLASSES = ['ALLOW', 'BLOCK', 'ESCALATE', 'STOP'] as const;

export const ConfusionMatrixView: React.FC<ConfusionMatrixViewProps> = ({
  metrics,
  modeName,
}) => {
  const cm = metrics.confusion_matrix || {};
  const perClass = metrics.per_class_metrics || {};

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Confusion Matrix Grid (2 Columns on large screens) */}
        <div className="lg:col-span-2 rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-400" />
                4-Class Policy Confusion Matrix
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Ground Truth (Rows) vs Model Simulation (Columns) for <span className="text-white font-semibold">{modeName}</span>
              </p>
            </div>
            <div className="text-xs text-slate-400 font-mono">
              N = {metrics.total_evaluated.toLocaleString()}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-left text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Actual \ Predicted
                  </th>
                  {CLASSES.map((c) => (
                    <th
                      key={c}
                      className="p-2 text-[11px] font-bold text-slate-300 uppercase tracking-wider border-b border-slate-800"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {CLASSES.map((actual) => (
                  <tr key={actual}>
                    <td className="p-2.5 text-left font-bold text-xs text-slate-300 bg-slate-950/40">
                      {actual}
                    </td>
                    {CLASSES.map((pred) => {
                      const count = cm[actual]?.[pred] ?? 0;
                      const isDiagonal = actual === pred;
                      const hasErrors = !isDiagonal && count > 0;

                      return (
                        <td
                          key={pred}
                          className={`p-2.5 font-mono text-xs font-bold transition-all ${
                            isDiagonal && count > 0
                              ? 'bg-indigo-950/80 text-indigo-200 border border-indigo-700/60 shadow-inner'
                              : hasErrors
                              ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                              : 'text-slate-500'
                          }`}
                        >
                          {count}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center gap-4 text-[11px] text-slate-400 pt-2 border-t border-slate-800/80">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-indigo-950 border border-indigo-700/60 inline-block" />
              <span>Correct Classifications (True Positives)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-rose-950 border border-rose-800/40 inline-block" />
              <span>Decision Misclassifications (Errors)</span>
            </div>
          </div>
        </div>

        {/* F1 Scores & Macro Summary */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-5 space-y-4 shadow-xl">
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
              Classification F1 Summary
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <div className="text-[10px] font-semibold text-slate-500 uppercase">Macro F1</div>
                <div className="text-xl font-black font-mono text-white mt-1">
                  {metrics.macro_f1.toFixed(4)}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800/80">
                <div className="text-[10px] font-semibold text-slate-500 uppercase">Weighted F1</div>
                <div className="text-xl font-black font-mono text-emerald-400 mt-1">
                  {metrics.weighted_f1.toFixed(4)}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800/80 text-xs">
              <div className="flex items-center justify-between text-slate-400">
                <span>Policy Outcome Acc:</span>
                <span className="font-mono text-white font-bold">
                  {(metrics.policy_outcome_accuracy * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Final Action Acc:</span>
                <span className="font-mono text-white font-bold">
                  {(metrics.final_action_accuracy * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span>Case Outcome Acc:</span>
                <span className="font-mono text-white font-bold">
                  {(metrics.case_outcome_accuracy * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Per-Class Precision / Recall / F1 Table */}
      <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 overflow-hidden shadow-xl">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800/80">
          <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
            Per-Class Classification Metrics
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/40 text-slate-400 text-[11px] font-bold uppercase tracking-wider border-b border-slate-800/80">
              <tr>
                <th className="py-3 px-4">Decision Class</th>
                <th className="py-3 px-4 text-right">Precision</th>
                <th className="py-3 px-4 text-right">Recall</th>
                <th className="py-3 px-4 text-right">F1-Score</th>
                <th className="py-3 px-4 text-right">Support (N)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-medium">
              {CLASSES.map((c) => {
                const cls = perClass[c] || { precision: 0, recall: 0, f1_score: 0, support: 0 };
                return (
                  <tr key={c} className="hover:bg-slate-800/30">
                    <td className="py-3 px-4 font-bold text-white">{c}</td>
                    <td className="py-3 px-4 text-right font-mono text-slate-300">
                      {(cls.precision * 100).toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-300">
                      {(cls.recall * 100).toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-indigo-300 font-bold">
                      {cls.f1_score.toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-slate-400">
                      {cls.support.toLocaleString()}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
