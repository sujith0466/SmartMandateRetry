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
        <div className="lg:col-span-2 rounded-2xl bg-white/90 backdrop-blur-md border border-[#E5E7EB] p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2 font-sans">
                <Target className="w-4 h-4 text-[#3B5BDB]" />
                4-Class Policy Confusion Matrix
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Ground Truth (Rows) vs Model Simulation (Columns) for <span className="text-[#111827] font-semibold">{modeName}</span>
              </p>
            </div>
            <div className="text-xs text-[#64748B] font-mono">
              N = {metrics.total_evaluated.toLocaleString()}
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-center border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
                  <th className="p-2.5 text-left text-[11px] font-bold text-[#64748B] uppercase tracking-wider">
                    Actual \ Predicted
                  </th>
                  {CLASSES.map((c) => (
                    <th
                      key={c}
                      className="p-2.5 text-[11px] font-bold text-[#475569] uppercase tracking-wider"
                    >
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E7EB]">
                {CLASSES.map((actual) => (
                  <tr key={actual}>
                    <td className="p-2.5 text-left font-bold text-xs text-[#111827] bg-[#F8FAFC]/70">
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
                              ? 'bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE]'
                              : hasErrors
                              ? 'bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3]'
                              : 'text-[#94A3B8]'
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

          <div className="flex items-center gap-4 text-[11px] text-[#64748B] pt-2 border-t border-[#E5E7EB]">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#EEF2FF] border border-[#C7D2FE] inline-block" />
              <span>Correct Classifications (True Positives)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-[#FFF1F2] border border-[#FECDD3] inline-block" />
              <span>Decision Misclassifications (Errors)</span>
            </div>
          </div>
        </div>

        {/* F1 Scores & Macro Summary */}
        <div className="space-y-4">
          <div className="rounded-2xl bg-white/90 backdrop-blur-md border border-[#E5E7EB] p-5 space-y-4 shadow-xs">
            <h4 className="text-xs font-bold text-[#64748B] uppercase tracking-wider font-sans">
              Classification F1 Summary
            </h4>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
                <div className="text-[10px] font-semibold text-[#64748B] uppercase">Macro F1</div>
                <div className="text-xl font-black font-mono text-[#111827] mt-1">
                  {metrics.macro_f1.toFixed(4)}
                </div>
              </div>
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
                <div className="text-[10px] font-semibold text-[#64748B] uppercase">Weighted F1</div>
                <div className="text-xl font-black font-mono text-[#059669] mt-1">
                  {metrics.weighted_f1.toFixed(4)}
                </div>
              </div>
            </div>

            <div className="space-y-2 pt-2 border-t border-[#E5E7EB] text-xs">
              <div className="flex items-center justify-between text-[#64748B]">
                <span>Policy Outcome Acc:</span>
                <span className="font-mono text-[#111827] font-bold">
                  {(metrics.policy_outcome_accuracy * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-[#64748B]">
                <span>Final Action Acc:</span>
                <span className="font-mono text-[#111827] font-bold">
                  {(metrics.final_action_accuracy * 100).toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-[#64748B]">
                <span>Case Outcome Acc:</span>
                <span className="font-mono text-[#111827] font-bold">
                  {(metrics.case_outcome_accuracy * 100).toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Per-Class Precision / Recall / F1 Table */}
      <div className="rounded-2xl bg-white/90 backdrop-blur-md border border-[#E5E7EB] overflow-hidden shadow-xs">
        <div className="p-4 bg-[#F8FAFC] border-b border-[#E5E7EB]">
          <h4 className="text-xs font-bold text-[#111827] uppercase tracking-wider font-sans">
            Per-Class Classification Metrics
          </h4>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F8FAFC] text-[#64748B] text-[11px] font-bold uppercase tracking-wider border-b border-[#E5E7EB]">
              <tr>
                <th className="py-3 px-4">Decision Class</th>
                <th className="py-3 px-4 text-right">Precision</th>
                <th className="py-3 px-4 text-right">Recall</th>
                <th className="py-3 px-4 text-right">F1-Score</th>
                <th className="py-3 px-4 text-right">Support (N)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#E5E7EB] font-medium">
              {CLASSES.map((c) => {
                const cls = perClass[c] || { precision: 0, recall: 0, f1_score: 0, support: 0 };
                return (
                  <tr key={c} className="hover:bg-[#F8FAFC] transition-colors">
                    <td className="py-3 px-4 font-bold text-[#111827]">{c}</td>
                    <td className="py-3 px-4 text-right font-mono text-[#475569]">
                      {(cls.precision * 100).toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#475569]">
                      {(cls.recall * 100).toFixed(2)}%
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#3B5BDB] font-bold">
                      {cls.f1_score.toFixed(4)}
                    </td>
                    <td className="py-3 px-4 text-right font-mono text-[#64748B]">
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
