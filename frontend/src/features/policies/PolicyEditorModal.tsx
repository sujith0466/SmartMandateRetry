import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  ShieldCheck,
  ArrowRight,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Clock,
  Scale,
  Award,
  Users,
  ShieldAlert,
} from 'lucide-react';
import { previewPolicyChanges, updatePolicy } from '../../services/api';
import { MerchantPolicy, PolicyChangePreview } from '../../types';

interface PolicyEditorModalProps {
  currentPolicy: MerchantPolicy;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedPolicy: MerchantPolicy) => void;
}

export const PolicyEditorModal: React.FC<PolicyEditorModalProps> = ({
  currentPolicy,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [step, setStep] = useState<'EDIT' | 'PREVIEW'>('EDIT');
  const [formData, setFormData] = useState<MerchantPolicy>({ ...currentPolicy });
  const [preview, setPreview] = useState<PolicyChangePreview | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleInputChange = (field: keyof MerchantPolicy, value: any) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleProceedToPreview = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await previewPolicyChanges(formData);
      setPreview(res);
      setStep('PREVIEW');
    } catch (err: any) {
      setError(err.message || 'Validation failed. Please verify field ranges.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const updated = await updatePolicy(formData);
      onSuccess(updated);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save policy updates.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 10 }}
          transition={{ duration: 0.15 }}
          className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-fintech-modal border border-slate-200 space-y-5 my-8"
        >
          {/* Modal Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-700 border border-purple-200">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">
                  {step === 'EDIT' ? 'Configure Recovery Safety Rules' : 'Review & Confirm Policy Updates'}
                </h3>
                <p className="text-xs text-slate-500">
                  {step === 'EDIT'
                    ? 'Adjust deterministic safety limits and recovery guardrails.'
                    : 'Inspect parameter diffs and deterministic safety impacts before applying.'}
                </p>
              </div>
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors">
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Error Banner */}
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* STEP 1: FORM INPUTS */}
          {step === 'EDIT' && (
            <form onSubmit={handleProceedToPreview} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Max Retries */}
                <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-indigo-600" />
                    Max Retries Cap (1 - 10)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.max_retries_per_case}
                    onChange={(e) => handleInputChange('max_retries_per_case', parseInt(e.target.value) || 1)}
                    className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <p className="text-[10px] text-slate-500 font-medium">Max execution attempts before auto-stop</p>
                </div>

                {/* Min Retry Interval */}
                <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-indigo-600" />
                    Min Spacing (Hours: 1 - 168)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={168}
                    value={formData.min_retry_interval_hours}
                    onChange={(e) => handleInputChange('min_retry_interval_hours', parseInt(e.target.value) || 1)}
                    className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <p className="text-[10px] text-slate-500 font-medium">Spacing between successive retry executions</p>
                </div>

                {/* Recovery Window */}
                <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Scale className="w-3.5 h-3.5 text-indigo-600" />
                    Recovery Window (Days: 1 - 60)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={60}
                    value={formData.max_recovery_window_days}
                    onChange={(e) => handleInputChange('max_recovery_window_days', parseInt(e.target.value) || 1)}
                    className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <p className="text-[10px] text-slate-500 font-medium">Days before an unrecovered case expires</p>
                </div>

                {/* High Value Escalation */}
                <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Award className="w-3.5 h-3.5 text-indigo-600" />
                    High-Value Threshold (INR)
                  </label>
                  <input
                    type="number"
                    min={0}
                    step={100}
                    value={formData.high_value_threshold_inr}
                    onChange={(e) => handleInputChange('high_value_threshold_inr', parseFloat(e.target.value) || 0)}
                    className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <p className="text-[10px] text-slate-500 font-medium">Invoices at or above this require review</p>
                </div>

                {/* AI Confidence Minimum */}
                <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                    Min AI Confidence (0.00 - 1.00)
                  </label>
                  <input
                    type="number"
                    min={0.0}
                    max={1.0}
                    step={0.05}
                    value={formData.min_confidence_threshold}
                    onChange={(e) => handleInputChange('min_confidence_threshold', parseFloat(e.target.value) || 0.0)}
                    className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <p className="text-[10px] text-slate-500 font-medium">AI decisions below this score are vetoed</p>
                </div>

                {/* Max Customer Contacts */}
                <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Users className="w-3.5 h-3.5 text-indigo-600" />
                    Max Contacts Per Cycle (1 - 10)
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={10}
                    value={formData.max_customer_contacts_per_cycle}
                    onChange={(e) => handleInputChange('max_customer_contacts_per_cycle', parseInt(e.target.value) || 1)}
                    className="w-full text-xs font-mono px-3 py-2 rounded-lg bg-white border border-slate-200 text-slate-900 focus:outline-none focus:border-indigo-500"
                    required
                  />
                  <p className="text-[10px] text-slate-500 font-medium">Cap on customer communication triggers</p>
                </div>
              </div>

              {/* Hard Decline Auto Stop */}
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                <div className="space-y-0.5">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <ShieldAlert className="w-4 h-4 text-rose-600" />
                    Hard Decline Auto-Stop Protection
                  </span>
                  <p className="text-[11px] text-slate-500">
                    Immediately stop recovery on non-recoverable failures (e.g. account closed, stolen card).
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={formData.hard_decline_auto_stop}
                  onChange={(e) => handleInputChange('hard_decline_auto_stop', e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded bg-white border-slate-300 focus:ring-emerald-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                >
                  <span>Preview Changes</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </form>
          )}

          {/* STEP 2: PREVIEW & SAFETY IMPACT */}
          {step === 'PREVIEW' && (
            <div className="space-y-4">
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Parameter Diffs</h4>
                {preview?.diffs.length === 0 ? (
                  <div className="p-4 bg-slate-50 rounded-xl text-xs text-slate-500 text-center">
                    No parameter changes detected.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {preview?.diffs.map((d) => (
                      <div
                        key={d.field}
                        className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between text-xs"
                      >
                        <span className="font-bold text-slate-800">{d.label}</span>
                        <div className="flex items-center gap-2 font-mono">
                          <span className="px-2 py-0.5 rounded bg-slate-200 text-slate-500 line-through">
                            {d.current?.toString()}
                          </span>
                          <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                          <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-800 font-bold border border-emerald-200">
                            {d.proposed?.toString()}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Safety Impact Analysis */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Safety Impact Analysis</h4>
                <div className="space-y-1.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                  {preview?.impact_notes.map((note, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
                      <span>{note}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between items-center pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setStep('EDIT')}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
                >
                  Back to Edit
                </button>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmSave}
                    disabled={loading}
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-sm transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Saving...' : 'Confirm & Apply Policy'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
