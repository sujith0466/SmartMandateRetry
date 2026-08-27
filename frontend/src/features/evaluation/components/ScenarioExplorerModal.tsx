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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="w-full max-w-2xl bg-white border border-[#E5E7EB] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-4 bg-[#F8FAFC] border-b border-[#E5E7EB] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#EEF2FF] border border-[#C7D2FE] flex items-center justify-center text-[#3B5BDB] shadow-2xs">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-[#111827] flex items-center gap-2 font-sans">
                Scenario Result Forensic Inspector
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white border border-[#E5E7EB] text-[#475569]">
                  {scenario.scenario_id}
                </span>
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                Evaluation Run ID: <span className="font-mono text-[#111827]">{scenario.evaluation_run_id}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#64748B] hover:text-[#111827] hover:bg-[#F1F5F9] transition-all"
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
                  ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                  : 'bg-[#FFF1F2] border-[#FECDD3] text-[#9F1239]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider">Classification Match</span>
                {isCorrect ? <CheckCircle2 className="w-4 h-4 text-[#059669]" /> : <AlertTriangle className="w-4 h-4 text-[#E11D48]" />}
              </div>
              <div className="text-sm font-black text-[#111827] mt-1 font-sans">
                {isCorrect ? 'PREDICTION MATCHED GROUND TRUTH' : 'MISCLASSIFICATION ERROR'}
              </div>
            </div>

            <div
              className={`p-3.5 rounded-xl border ${
                !isViolation
                  ? 'bg-[#ECFDF5] border-[#A7F3D0] text-[#065F46]'
                  : 'bg-[#FFF1F2] border-[#FECDD3] text-[#9F1239]'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-wider">Policy Safety Gate</span>
                {!isViolation ? <ShieldCheck className="w-4 h-4 text-[#059669]" /> : <AlertTriangle className="w-4 h-4 text-[#E11D48]" />}
              </div>
              <div className="text-sm font-black text-[#111827] mt-1 font-sans">
                {!isViolation ? 'ZERO POLICY BREACH' : `VIOLATION: ${d.violation_type || 'SAFETY_BYPASS'}`}
              </div>
            </div>
          </div>

          {/* Core Decision Comparison Grid */}
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] space-y-3">
            <h4 className="text-[11px] font-bold text-[#64748B] uppercase tracking-wider font-sans">
              Decision Outcome Comparison
            </h4>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5 p-3 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs">
                <div className="text-[10px] font-bold text-[#3B5BDB] uppercase font-sans">Ground Truth Target</div>
                <div className="text-sm font-black font-mono text-[#111827]">{scenario.actual_outcome}</div>
              </div>
              <div className="space-y-1.5 p-3 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs">
                <div className="text-[10px] font-bold text-[#0891B2] uppercase font-sans">Model Simulation Prediction</div>
                <div className="text-sm font-black font-mono text-[#111827]">{scenario.simulated_outcome}</div>
              </div>
            </div>
          </div>

          {/* Extended Prediction Breakdown */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
              <span className="text-[10px] text-[#64748B] font-bold uppercase block font-sans">Scenario Family</span>
              <span className="text-xs font-mono font-bold text-[#111827] mt-0.5 block truncate">
                {d.scenario_family || 'N/A'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
              <span className="text-[10px] text-[#64748B] font-bold uppercase block font-sans">Difficulty Tier</span>
              <span className="text-xs font-mono font-bold text-[#111827] mt-0.5 block">
                {d.difficulty_tier || 'N/A'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
              <span className="text-[10px] text-[#64748B] font-bold uppercase block font-sans">Predicted Action</span>
              <span className="text-xs font-mono font-bold text-[#111827] mt-0.5 block truncate">
                {d.predicted_action || 'N/A'}
              </span>
            </div>
            <div className="p-3 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB]">
              <span className="text-[10px] text-[#64748B] font-bold uppercase block font-sans">Case Outcome</span>
              <span className="text-xs font-mono font-bold text-[#059669] mt-0.5 block">
                {d.predicted_case_outcome || 'N/A'}
              </span>
            </div>
          </div>

          {/* Execution Reasons & Logic */}
          <div className="p-4 rounded-xl bg-[#F8FAFC] border border-[#E5E7EB] space-y-2">
            <div className="flex items-center justify-between text-[11px] font-bold text-[#64748B]">
              <span className="uppercase tracking-wider font-sans">Evaluation Reasons & Policy Trace</span>
              <span className="flex items-center gap-1 text-[#64748B] font-mono">
                <Clock className="w-3 h-3" /> {(d.execution_time_ms ?? 0).toFixed(2)} ms
              </span>
            </div>
            {d.reasons && d.reasons.length > 0 ? (
              <ul className="space-y-1 font-mono text-[#334155]">
                {d.reasons.map((r: string, i: number) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-[#3B5BDB] font-bold">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-[#94A3B8] italic">No specific decision reasons recorded.</p>
            )}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-[#F8FAFC] border-t border-[#E5E7EB] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-[#111827] hover:bg-black text-white font-bold text-xs transition-all shadow-xs"
          >
            Close Inspector
          </button>
        </div>
      </div>
    </div>
  );
};
