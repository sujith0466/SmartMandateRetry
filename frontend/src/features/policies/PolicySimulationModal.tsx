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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-5xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/80">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                What-If Policy Simulation Studio
                <span className="text-xs px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20 font-mono">
                  DRAFT / NON-MUTATING
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Simulate draft policy rules against certified benchmark scenarios to evaluate recovery yield before saving.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Controls Column (Left) */}
          <div className="lg:col-span-5 space-y-4 bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h3 className="text-sm font-semibold text-slate-200">Simulation Parameters</h3>
              <div className="flex gap-2">
                <select
                  value={split}
                  onChange={(e) => setSplit(e.target.value as any)}
                  className="bg-slate-900 border border-slate-700 text-xs rounded px-2 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                >
                  <option value="TEST">TEST Split (802)</option>
                  <option value="VALIDATION">VAL Split (750)</option>
                  <option value="ALL">Full Dataset (5,000)</option>
                </select>
                <button
                  onClick={handleReset}
                  className="p-1 text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800"
                  title="Reset to current active policy"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Max Retries */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Max Retries per Case</span>
                <span className="text-indigo-400 font-mono font-bold">{draft.max_retries_per_case} attempts</span>
              </div>
              <input
                type="range"
                min="1"
                max="8"
                step="1"
                value={draft.max_retries_per_case ?? 3}
                onChange={(e) => setDraft({ ...draft, max_retries_per_case: parseInt(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Min Retry Interval */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Min Retry Interval</span>
                <span className="text-indigo-400 font-mono font-bold">{draft.min_retry_interval_hours} hrs</span>
              </div>
              <input
                type="range"
                min="6"
                max="72"
                step="6"
                value={draft.min_retry_interval_hours ?? 24}
                onChange={(e) => setDraft({ ...draft, min_retry_interval_hours: parseInt(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Max Recovery Window */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Max Recovery Window</span>
                <span className="text-indigo-400 font-mono font-bold">{draft.max_recovery_window_days} days</span>
              </div>
              <input
                type="range"
                min="3"
                max="30"
                step="1"
                value={draft.max_recovery_window_days ?? 14}
                onChange={(e) => setDraft({ ...draft, max_recovery_window_days: parseInt(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Min AI Confidence */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Min AI Confidence Threshold</span>
                <span className="text-indigo-400 font-mono font-bold">{((draft.min_confidence_threshold ?? 0.75) * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.50"
                max="0.95"
                step="0.05"
                value={draft.min_confidence_threshold ?? 0.75}
                onChange={(e) => setDraft({ ...draft, min_confidence_threshold: parseFloat(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* High Value Threshold */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">High Value Escalation Cap</span>
                <span className="text-indigo-400 font-mono font-bold">₹{(draft.high_value_threshold_inr ?? 10000).toLocaleString('en-IN')}</span>
              </div>
              <input
                type="range"
                min="2000"
                max="50000"
                step="1000"
                value={draft.high_value_threshold_inr ?? 10000}
                onChange={(e) => setDraft({ ...draft, high_value_threshold_inr: parseFloat(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Max Customer Contacts */}
            <div>
              <div className="flex justify-between text-xs mb-1">
                <span className="text-slate-300 font-medium">Max Customer Contacts</span>
                <span className="text-indigo-400 font-mono font-bold">{draft.max_customer_contacts_per_cycle} msgs</span>
              </div>
              <input
                type="range"
                min="1"
                max="5"
                step="1"
                value={draft.max_customer_contacts_per_cycle ?? 3}
                onChange={(e) => setDraft({ ...draft, max_customer_contacts_per_cycle: parseInt(e.target.value) })}
                className="w-full accent-indigo-500 cursor-pointer"
              />
            </div>

            {/* Hard Decline Auto-Stop Toggle */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-300 font-medium">Hard Decline Auto-Stop (P0)</span>
              <button
                type="button"
                onClick={() => setDraft({ ...draft, hard_decline_auto_stop: !draft.hard_decline_auto_stop })}
                className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  draft.hard_decline_auto_stop ? 'bg-indigo-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    draft.hard_decline_auto_stop ? 'translate-x-4' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <button
              onClick={handleRunSimulation}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm flex items-center justify-center gap-2 shadow-lg shadow-indigo-600/20 transition-all mt-4"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <Play className="w-4 h-4 fill-white" />
              )}
              {loading ? 'Running Simulation...' : 'Execute What-If Simulation'}
            </button>
          </div>

          {/* Results Column (Right) */}
          <div className="lg:col-span-7 flex flex-col">
            {error && (
              <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2 mb-4">
                <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                {error}
              </div>
            )}

            {!result && !loading && !error && (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center border border-dashed border-slate-800 rounded-xl bg-slate-950/20">
                <div className="p-3 rounded-full bg-slate-800 text-slate-400 mb-3">
                  <TrendingUp className="w-6 h-6" />
                </div>
                <h4 className="text-sm font-medium text-slate-300 mb-1">Ready for Simulation</h4>
                <p className="text-xs text-slate-500 max-w-sm">
                  Adjust the policy sliders on the left and click "Execute What-If Simulation" to preview estimated recovery performance.
                </p>
              </div>
            )}

            {result && (
              <div className="space-y-4">
                {/* Top Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Recovery Rate</span>
                    <div className="text-lg font-bold text-emerald-400 mt-0.5">
                      {(result.simulated_recovery_rate * 100).toFixed(1)}%
                    </div>
                    <span className="text-[10px] text-slate-500">
                      Baseline: {(result.baseline_recovery_rate * 100).toFixed(1)}%
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Recovery Uplift</span>
                    <div className="text-lg font-bold text-indigo-400 mt-0.5">
                      +{result.recovery_uplift_pp.toFixed(2)} pp
                    </div>
                    <span className="text-[10px] text-emerald-500/80 font-medium">Over native retries</span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Recovered Yield</span>
                    <div className="text-lg font-bold text-amber-400 mt-0.5">
                      ₹{Math.round(result.recovered_revenue_inr).toLocaleString('en-IN')}
                    </div>
                    <span className="text-[10px] text-slate-500">
                      {(result.revenue_recovery_rate * 100).toFixed(1)}% of total volume
                    </span>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-[10px] uppercase font-semibold text-slate-400">Safety Violations</span>
                    <div className="text-lg font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      {result.policy_violations}
                    </div>
                    <span className="text-[10px] text-slate-500">Zero-tolerance certified</span>
                  </div>
                </div>

                {/* Veto Breakdown & Scenario Counts */}
                <div className="p-4 rounded-xl bg-slate-950/40 border border-slate-800/80 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-300 font-semibold">Policy Veto & Escalation Analysis</span>
                    <span className="text-slate-400 font-mono">
                      {result.veto_count} total vetoes ({result.total_scenarios} scenarios evaluated in {result.simulation_duration_ms}ms)
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
                    <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                      <span className="text-[10px] text-slate-400">Hard Decline Stops (P0)</span>
                      <div className="text-sm font-semibold text-slate-200 mt-0.5">
                        {result.veto_breakdown.hard_decline_stops}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                      <span className="text-[10px] text-slate-400">Retry Cap Vetoes (P1)</span>
                      <div className="text-sm font-semibold text-slate-200 mt-0.5">
                        {result.veto_breakdown.retry_cap_vetoes}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                      <span className="text-[10px] text-slate-400">Window Expiry (P2)</span>
                      <div className="text-sm font-semibold text-slate-200 mt-0.5">
                        {result.veto_breakdown.window_expiry_vetoes}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                      <span className="text-[10px] text-slate-400">High-Value Escalated (P2b)</span>
                      <div className="text-sm font-semibold text-slate-200 mt-0.5">
                        {result.veto_breakdown.high_value_escalations}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                      <span className="text-[10px] text-slate-400">Low AI Confidence (P3a)</span>
                      <div className="text-sm font-semibold text-slate-200 mt-0.5">
                        {result.veto_breakdown.confidence_vetoes}
                      </div>
                    </div>
                    <div className="p-2 rounded bg-slate-900/60 border border-slate-800">
                      <span className="text-[10px] text-slate-400">Contact Cap Vetoes (P3b)</span>
                      <div className="text-sm font-semibold text-slate-200 mt-0.5">
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
                      className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors border border-slate-700"
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
