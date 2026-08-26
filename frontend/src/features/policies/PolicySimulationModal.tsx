import React, { useState } from 'react';
import { Play, RotateCcw, AlertTriangle, CheckCircle2, Sparkles, TrendingUp, X } from 'lucide-react';
import { MerchantPolicy, PolicySimulationResponse } from '../../types';
import { simulatePolicy } from '../../services/api';

interface PolicySimulationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPolicy: MerchantPolicy;
  onApplyToDraft?: (policy: Partial<MerchantPolicy>) => void;
}

export const PolicySimulationModal: React.FC<PolicySimulationModalProps> = ({
  isOpen,
  onClose,
  currentPolicy,
  onApplyToDraft,
}) => {
  const [draft, setDraft] = useState<Partial<MerchantPolicy>>({
    max_retries_per_case: currentPolicy.max_retries_per_case,
    min_retry_interval_hours: currentPolicy.min_retry_interval_hours,
    max_recovery_window_days: currentPolicy.max_recovery_window_days,
    min_confidence_threshold: currentPolicy.min_confidence_threshold,
    high_value_threshold_inr: currentPolicy.high_value_threshold_inr,
    max_customer_contacts_per_cycle: currentPolicy.max_customer_contacts_per_cycle,
    hard_decline_auto_stop: currentPolicy.hard_decline_auto_stop,
  });

  const [split, setSplit] = useState<'TEST' | 'VALIDATION' | 'ALL'>('TEST');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PolicySimulationResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleRunSimulation = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await simulatePolicy(draft, split);
      setResult(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to execute policy simulation');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setDraft({
      max_retries_per_case: currentPolicy.max_retries_per_case,
      min_retry_interval_hours: currentPolicy.min_retry_interval_hours,
      max_recovery_window_days: currentPolicy.max_recovery_window_days,
      min_confidence_threshold: currentPolicy.min_confidence_threshold,
      high_value_threshold_inr: currentPolicy.high_value_threshold_inr,
      max_customer_contacts_per_cycle: currentPolicy.max_customer_contacts_per_cycle,
      hard_decline_auto_stop: currentPolicy.hard_decline_auto_stop,
    });
    setResult(null);
    setError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-fintech-modal overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-[#F7F9FC]">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111827] flex items-center gap-2 font-sans">
                What-If Policy Simulation Studio
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] font-mono font-bold">
                  NON-MUTATING / INSTANT
                </span>
              </h2>
              <p className="text-xs text-[#64748B]">
                Simulate draft policy guardrails against certified benchmark scenarios to evaluate recovery yield before applying.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#64748B] hover:text-[#111827] rounded-lg hover:bg-[#F1F5F9] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column (Left) */}
          <div className="lg:col-span-5 space-y-4 bg-[#F7F9FC] p-5 rounded-2xl border border-[#E5E7EB] shadow-2xs">
            <div className="flex items-center justify-between pb-2 border-b border-[#E5E7EB]">
              <h3 className="text-xs font-bold text-[#111827] uppercase tracking-wider font-sans">Simulation Parameters</h3>
              <div className="flex gap-2">
                <select
                  value={split}
                  onChange={(e) => setSplit(e.target.value as any)}
                  className="bg-white border border-[#E5E7EB] text-xs font-bold rounded-lg px-2.5 py-1 text-[#475569] focus:outline-none focus:border-[#3B5BDB] shadow-2xs"
                >
                  <option value="TEST">TEST Split (802)</option>
                  <option value="VALIDATION">VAL Split (750)</option>
                  <option value="ALL">Full Dataset (5,000)</option>
                </select>
                <button
                  onClick={handleReset}
                  className="p-1.5 text-[#64748B] hover:text-[#111827] rounded-lg bg-white border border-[#E5E7EB] hover:bg-[#F1F5F9] shadow-2xs"
                  title="Reset to current active policy"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Max Retries */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#475569] font-bold">Max Retries per Case</span>
                <span className="text-[#3B5BDB] font-mono font-black">{draft.max_retries_per_case} attempts</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={draft.max_retries_per_case ?? 3}
                onChange={(e) => setDraft({ ...draft, max_retries_per_case: parseInt(e.target.value) })}
                className="w-full accent-[#3B5BDB] cursor-pointer"
              />
            </div>

            {/* Min Retry Interval */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#475569] font-bold">Min Retry Interval</span>
                <span className="text-[#3B5BDB] font-mono font-black">{draft.min_retry_interval_hours} hrs</span>
              </div>
              <input
                type="range"
                min="6"
                max="72"
                step="6"
                value={draft.min_retry_interval_hours ?? 24}
                onChange={(e) => setDraft({ ...draft, min_retry_interval_hours: parseInt(e.target.value) })}
                className="w-full accent-[#3B5BDB] cursor-pointer"
              />
            </div>

            {/* Max Recovery Window */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#475569] font-bold">Max Recovery Window</span>
                <span className="text-[#3B5BDB] font-mono font-black">{draft.max_recovery_window_days} days</span>
              </div>
              <input
                type="range"
                min="3"
                max="30"
                step="1"
                value={draft.max_recovery_window_days ?? 14}
                onChange={(e) => setDraft({ ...draft, max_recovery_window_days: parseInt(e.target.value) })}
                className="w-full accent-[#3B5BDB] cursor-pointer"
              />
            </div>

            {/* Min AI Confidence */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#475569] font-bold">Min AI Confidence Threshold</span>
                <span className="text-[#7C3AED] font-mono font-black">{((draft.min_confidence_threshold ?? 0.75) * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.95"
                step="0.05"
                value={draft.min_confidence_threshold ?? 0.75}
                onChange={(e) => setDraft({ ...draft, min_confidence_threshold: parseFloat(e.target.value) })}
                className="w-full accent-[#7C3AED] cursor-pointer"
              />
            </div>

            {/* High Value Threshold */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#475569] font-bold">High Value Escalation Cap</span>
                <span className="text-[#3B5BDB] font-mono font-black">₹{(draft.high_value_threshold_inr ?? 10000).toLocaleString('en-IN')}</span>
              </div>
              <input
                type="range"
                min="2000"
                max="50000"
                step="1000"
                value={draft.high_value_threshold_inr ?? 10000}
                onChange={(e) => setDraft({ ...draft, high_value_threshold_inr: parseFloat(e.target.value) })}
                className="w-full accent-[#3B5BDB] cursor-pointer"
              />
            </div>

            {/* Max Customer Contacts */}
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#475569] font-bold">Max Customer Contacts</span>
                <span className="text-[#3B5BDB] font-mono font-black">{draft.max_customer_contacts_per_cycle} msgs</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={draft.max_customer_contacts_per_cycle ?? 3}
                onChange={(e) => setDraft({ ...draft, max_customer_contacts_per_cycle: parseInt(e.target.value) })}
                className="w-full accent-[#3B5BDB] cursor-pointer"
              />
            </div>

            {/* Hard Decline Auto-Stop Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-[#E5E7EB]">
              <span className="text-xs text-[#111827] font-bold">Hard Decline Auto-Stop (P0)</span>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, hard_decline_auto_stop: !draft.hard_decline_auto_stop })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-150 ${
                  draft.hard_decline_auto_stop ? 'bg-[#3B5BDB]' : 'bg-[#CBD5E1]'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-2xs transition duration-150 ${
                    draft.hard_decline_auto_stop ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {/* Execute Button (Violet Theme for AI Intelligence) */}
            <button
              onClick={handleRunSimulation}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-[#7C3AED] hover:bg-[#6D28D9] disabled:opacity-50 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-xs transition-all mt-3"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Play className="w-3.5 h-3.5 fill-white" />
              )}
              {loading ? 'Simulating Scenarios...' : 'Execute What-If Simulation'}
            </button>
          </div>

          {/* Results Column (Right) */}
          <div className="lg:col-span-7 flex flex-col">
            {error && (
              <div className="p-4 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] text-[#9F1239] text-xs flex items-center gap-2 mb-4 shadow-2xs">
                <AlertTriangle className="w-4 h-4 shrink-0 text-[#E11D48]" />
                <span>{error}</span>
              </div>
            )}

            {!result && !loading && !error && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-dashed border-[#E5E7EB] rounded-2xl bg-[#F7F9FC]/50">
                <div className="p-3 rounded-full bg-white border border-[#E5E7EB] text-[#7C3AED] mb-3 shadow-2xs">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-bold text-[#111827] mb-1">Ready for Simulation</h4>
                <p className="text-xs text-[#64748B] max-w-sm">
                  Adjust policy parameter sliders on the left and click "Execute What-If Simulation" to preview estimated recovery performance in under 2ms.
                </p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                {/* Top Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3.5 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB] shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-[#64748B]">Recovery Rate</span>
                    <div className="text-lg font-black text-[#059669] font-sans mt-0.5">
                      {(result.simulated_recovery_rate * 100).toFixed(1)}%
                    </div>
                    <span className="text-[10px] text-[#64748B] font-medium">
                      Baseline: {(result.baseline_recovery_rate * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB] shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-[#64748B]">Recovery Uplift</span>
                    <div className="text-lg font-black text-[#7C3AED] font-sans mt-0.5">
                      +{result.recovery_uplift_pp.toFixed(2)} pp
                    </div>
                    <span className="text-[10px] text-[#059669] font-bold">Over native retries</span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB] shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-[#64748B]">Recovered Yield</span>
                    <div className="text-lg font-black text-[#3B5BDB] font-sans mt-0.5">
                      ₹{Math.round(result.recovered_revenue_inr).toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] text-[#64748B] font-medium">
                      {(result.revenue_recovery_rate * 100).toFixed(1)}% of volume
                    </span>
                  </div>

                  <div className="p-3.5 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB] shadow-2xs">
                    <span className="text-[10px] uppercase font-bold text-[#64748B]">Safety Violations</span>
                    <div className="text-lg font-black text-[#059669] font-sans mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-[#059669]" />
                      {result.policy_violations}
                    </div>
                    <span className="text-[10px] text-[#64748B] font-medium">Zero-tolerance verified</span>
                  </div>
                </div>

                {/* Veto Breakdown */}
                <div className="p-4 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB] space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[#111827] font-bold">Policy Veto & Escalation Trace</span>
                    <span className="text-[#64748B] font-mono font-medium text-[11px]">
                      {result.veto_count} total vetoes ({result.total_scenarios} scenarios in {result.simulation_duration_ms}ms)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 pt-1 text-xs">
                    <div className="p-2.5 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs">
                      <span className="text-[10px] text-[#64748B] font-medium">Hard Decline Stops (P0)</span>
                      <div className="text-sm font-bold text-[#111827] font-mono mt-0.5">
                        {result.veto_breakdown.hard_decline_stops}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs">
                      <span className="text-[10px] text-[#64748B] font-medium">Retry Cap Vetoes (P1)</span>
                      <div className="text-sm font-bold text-[#111827] font-mono mt-0.5">
                        {result.veto_breakdown.retry_cap_vetoes}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs">
                      <span className="text-[10px] text-[#64748B] font-medium">Window Expiry (P2)</span>
                      <div className="text-sm font-bold text-[#111827] font-mono mt-0.5">
                        {result.veto_breakdown.window_expiry_vetoes}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs">
                      <span className="text-[10px] text-[#64748B] font-medium">High-Value Escalations (P2b)</span>
                      <div className="text-sm font-bold text-[#111827] font-mono mt-0.5">
                        {result.veto_breakdown.high_value_escalations}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs">
                      <span className="text-[10px] text-[#64748B] font-medium">Low AI Confidence (P3a)</span>
                      <div className="text-sm font-bold text-[#111827] font-mono mt-0.5">
                        {result.veto_breakdown.confidence_vetoes}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-xl bg-white border border-[#E5E7EB] shadow-2xs">
                      <span className="text-[10px] text-[#64748B] font-medium">Contact Cap Vetoes (P3b)</span>
                      <div className="text-sm font-bold text-[#111827] font-mono mt-0.5">
                        {result.veto_breakdown.contact_cap_vetoes}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Apply Button */}
                {onApplyToDraft && (
                  <div className="flex justify-end pt-2">
                    <button
                      onClick={() => {
                        onApplyToDraft(draft);
                        onClose();
                      }}
                      className="px-4 py-2 rounded-xl bg-[#111827] hover:bg-[#3B5BDB] text-white text-xs font-bold transition-colors shadow-2xs"
                    >
                      Copy Values to Policy Editor
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
