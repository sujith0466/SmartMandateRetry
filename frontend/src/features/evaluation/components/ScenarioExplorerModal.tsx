import React from 'react';
import { X, ShieldCheck, AlertTriangle, CheckCircle2, Clock, FileText } from 'lucide-react';
import { EvaluationScenarioResultItem } from '../../../types';

interface ScenarioExplorerModalProps {
  scenario: EvaluationScenarioResultItem | null;
  onClose: () => void;
}

export const ScenarioExplorerModal: React.FC<ScenarioExplorerModalProps> = ({
  scenario,
  onClose,
}) => {
  if (!scenario) return null;

  const d = scenario.details || {};
  const isCorrect = d.is_label_correct;
  const isViolation = d.is_policy_violation;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-950 border border-indigo-800 flex items-center justify-center text-indigo-400">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                Scenario Result Forensic Inspector
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {scenario.scenario_id}
                </span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Evaluation Run ID: <span className="font-mono text-slate-300">{scenario.evaluation_run_id}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Top Status Cards */}
          <div className="grid grid-cols-2 gap-3">
            <div
              className={`p-3.5 rounded-xl border ${
                isCorrect
                  ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider">Classification Match</span>
                {isCorrect ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
              </div>
              <div className="text-sm font-black text-white mt-1">
                {isCorrect ? 'PREDICTION MATCHED GROUND TRUTH' : 'MISCLASSIFICATION ERROR'}
              </div>
            </div>

            <div
              className={`p-3.5 rounded-xl border ${
                !isViolation
                  ? 'bg-emerald-950/40 border-emerald-800/80 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800/80 text-rose-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider">Policy Safety Gate</span>
                {!isViolation ? <ShieldCheck className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
              </div>
              <div className="text-sm font-black text-white mt-1">
                {!isViolation ? 'ZERO POLICY BREACH' : `VIOLATION: ${d.violation_type || 'SAFETY_BYPASS'}`}
              </div>
            </div>
          </div>

          {/* Core Decision Comparison Grid */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Decision Outcome Comparison
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] font-bold text-indigo-400 uppercase">Ground Truth Target</div>
                <div className="text-sm font-black font-mono text-white">{scenario.actual_outcome}</div>
              </div>
              <div className="space-y-1.5 p-3 rounded-lg bg-slate-900 border border-slate-800">
                <div className="text-[10px] font-bold text-cyan-400 uppercase">Model Simulation Prediction</div>
                <div className="text-sm font-black font-mono text-white">{scenario.simulated_outcome}</div>
              </div>
            </div>
          </div>

          {/* Extended Prediction Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Scenario Family</span>
              <span className="text-xs font-mono font-bold text-slate-200 mt-0.5 block truncate">
                {d.scenario_family || 'N/A'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Difficulty Tier</span>
              <span className="text-xs font-mono font-bold text-slate-200 mt-0.5 block">
                {d.difficulty_tier || 'N/A'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Predicted Action</span>
              <span className="text-xs font-mono font-bold text-slate-200 mt-0.5 block truncate">
                {d.predicted_action || 'N/A'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Case Outcome</span>
              <span className="text-xs font-mono font-bold text-emerald-400 mt-0.5 block">
                {d.predicted_case_outcome || 'N/A'}
              </span>
            </div>
          </div>

          {/* Execution Reasons & Logic */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
              <span className="uppercase tracking-wider">Evaluation Reasons & Policy Trace</span>
              <span className="flex items-center gap-1 text-slate-500 font-mono">
                <Clock className="w-3 h-3" /> {(d.execution_time_ms ?? 0).toFixed(2)} ms
              </span>
            </div>
            {d.reasons && d.reasons.length > 0 ? (
              <ul className="space-y-1 font-mono text-slate-300">
                {d.reasons.map((r: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-indigo-400 font-bold">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-slate-500 italic">No specific decision reasons recorded.</p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition-all"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
