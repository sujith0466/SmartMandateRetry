import React from 'react';
import { X, Clock, Database, ArrowRight } from 'lucide-react';
import { EvaluationRunItem } from '../../../types';

interface RunHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  runs: EvaluationRunItem[];
  activeRunId?: string;
  onSelectRun: (run: EvaluationRunItem) => void;
  isLoading: boolean;
}

export const RunHistoryDrawer: React.FC<RunHistoryDrawerProps> = ({
  isOpen,
  onClose,
  runs,
  activeRunId,
  onSelectRun,
  isLoading,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/40 backdrop-blur-xs transition-opacity">
      <div className="w-full max-w-md bg-white border-l border-[#E5E7EB] h-full flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="p-4 bg-[#F8FAFC] border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#3B5BDB]" />
            <h3 className="text-sm font-bold text-[#111827] font-sans">Evaluation Run History</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-[#64748B] hover:text-[#111827] hover:bg-[#F1F5F9] transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-[#F1F5F9] animate-pulse" />
              ))}
            </div>
          ) : runs.length === 0 ? (
            <div className="py-12 text-center text-[#64748B] space-y-2">
              <Database className="w-8 h-8 mx-auto text-[#94A3B8]" />
              <p className="text-xs">No persisted evaluation runs found in database.</p>
            </div>
          ) : (
            runs.map((run) => {
              const m = run.metrics_summary;
              const isSelected = run.id === activeRunId;
              const violations = m?.safety_metrics?.total_policy_violations ?? 0;
              const acc = m ? (m.label_accuracy * 100).toFixed(1) : '--';
              const rec = m ? (m.simulated_recovery_rate * 100).toFixed(1) : '--';

              return (
                <div
                  key={run.id}
                  onClick={() => onSelectRun(run)}
                  className={`p-4 rounded-xl border cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-[#EEF2FF]/60 border-[#3B5BDB] shadow-xs ring-1 ring-[#3B5BDB]'
                      : 'bg-white border-[#E5E7EB] hover:border-[#CBD5E1] hover:bg-[#F8FAFC]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-[#3B5BDB] font-bold">
                      {run.id}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#E5E7EB] text-[#475569] font-mono">
                      {run.baseline_mode}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-[#111827] mt-2 truncate">
                    {run.dataset_name}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-[#E5E7EB] text-[11px]">
                    <div>
                      <span className="text-[#64748B] block text-[9px] uppercase">Accuracy</span>
                      <span className="font-mono font-bold text-[#111827]">{acc}%</span>
                    </div>
                    <div>
                      <span className="text-[#64748B] block text-[9px] uppercase">Recovery</span>
                      <span className="font-mono font-bold text-[#059669]">{rec}%</span>
                    </div>
                    <div>
                      <span className="text-[#64748B] block text-[9px] uppercase">Violations</span>
                      <span
                        className={`font-mono font-bold ${
                          violations === 0 ? 'text-[#059669]' : 'text-[#E11D48]'
                        }`}
                      >
                        {violations}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-[#64748B] mt-2.5">
                    <span>{run.created_at ? new Date(run.created_at).toLocaleString() : 'N/A'}</span>
                    <span className="flex items-center gap-1 text-[#3B5BDB] font-bold group-hover:translate-x-0.5 transition-transform">
                      Inspect <ArrowRight className="w-3 h-3" />
                    </span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
