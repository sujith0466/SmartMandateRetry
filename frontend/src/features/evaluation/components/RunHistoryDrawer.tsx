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
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-sm transition-opacity">
      <div className="w-full max-w-md bg-slate-900 border-l border-slate-800 h-full flex flex-col shadow-2xl">
        {/* Drawer Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-white">Evaluation Run History</h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-24 rounded-xl bg-slate-800/40 animate-pulse" />
              ))}
            </div>
          ) : runs.length === 0 ? (
            <div className="py-12 text-center text-slate-400 space-y-2">
              <Database className="w-8 h-8 mx-auto text-slate-600" />
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
                      ? 'bg-indigo-950/40 border-indigo-500/80 shadow-[0_0_15px_rgba(99,102,241,0.2)]'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-mono text-indigo-400 font-bold">
                      {run.id}
                    </span>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-900 border border-slate-800 text-slate-300">
                      {run.baseline_mode}
                    </span>
                  </div>

                  <div className="text-xs font-semibold text-white mt-2 truncate">
                    {run.dataset_name}
                  </div>

                  <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-800/60 text-[11px]">
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">Accuracy</span>
                      <span className="font-mono font-bold text-slate-200">{acc}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">Recovery</span>
                      <span className="font-mono font-bold text-emerald-400">{rec}%</span>
                    </div>
                    <div>
                      <span className="text-slate-500 block text-[9px] uppercase">Violations</span>
                      <span
                        className={`font-mono font-bold ${
                          violations === 0 ? 'text-emerald-400' : 'text-rose-400'
                        }`}
                      >
                        {violations}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 mt-2.5">
                    <span>{run.created_at ? new Date(run.created_at).toLocaleString() : 'N/A'}</span>
                    <span className="flex items-center gap-1 text-indigo-400 font-bold group-hover:translate-x-0.5 transition-transform">
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
