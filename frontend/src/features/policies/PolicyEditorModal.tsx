import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle, ShieldCheck, RefreshCw } from 'lucide-react';
import { MerchantPolicy } from '../../types';
import { updatePolicy } from '../../services/api';

interface PolicyEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPolicy: MerchantPolicy;
  initialDraft?: Partial<MerchantPolicy>;
  onPolicyUpdated: (updated: MerchantPolicy) => void;
}

export const PolicyEditorModal: React.FC<PolicyEditorModalProps> = ({
  isOpen,
  onClose,
  currentPolicy,
  initialDraft,
  onPolicyUpdated,
}) => {
  const [formData, setFormData] = useState<MerchantPolicy>(currentPolicy);
  const [reason, setReason] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setFormData({
        ...currentPolicy,
        ...(initialDraft || {}),
      });
      setReason('');
      setError(null);
    }
  }, [isOpen, currentPolicy, initialDraft]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Audit trail requires an operational rationale for modifying policy guardrails');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const res = await updatePolicy(formData);
      onPolicyUpdated(res);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to update policy');
    } finally {
      setLoading(false);
    }
  };

  // Compute diffs
  const diffs: { field: string; label: string; oldVal: any; newVal: any }[] = [];
  if (formData.max_retries_per_case !== currentPolicy.max_retries_per_case) {
    diffs.push({ field: 'max_retries_per_case', label: 'Max Retries', oldVal: currentPolicy.max_retries_per_case, newVal: formData.max_retries_per_case });
  }
  if (formData.min_retry_interval_hours !== currentPolicy.min_retry_interval_hours) {
    diffs.push({ field: 'min_retry_interval_hours', label: 'Min Interval (hrs)', oldVal: currentPolicy.min_retry_interval_hours, newVal: formData.min_retry_interval_hours });
  }
  if (formData.max_recovery_window_days !== currentPolicy.max_recovery_window_days) {
    diffs.push({ field: 'max_recovery_window_days', label: 'Recovery Window (days)', oldVal: currentPolicy.max_recovery_window_days, newVal: formData.max_recovery_window_days });
  }
  if (formData.min_confidence_threshold !== currentPolicy.min_confidence_threshold) {
    diffs.push({ field: 'min_confidence_threshold', label: 'Min AI Confidence', oldVal: currentPolicy.min_confidence_threshold, newVal: formData.min_confidence_threshold });
  }
  if (formData.high_value_threshold_inr !== currentPolicy.high_value_threshold_inr) {
    diffs.push({ field: 'high_value_threshold_inr', label: 'High Value Threshold (₹)', oldVal: currentPolicy.high_value_threshold_inr, newVal: formData.high_value_threshold_inr });
  }
  if (formData.max_customer_contacts_per_cycle !== currentPolicy.max_customer_contacts_per_cycle) {
    diffs.push({ field: 'max_customer_contacts_per_cycle', label: 'Contact Cap', oldVal: currentPolicy.max_customer_contacts_per_cycle, newVal: formData.max_customer_contacts_per_cycle });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="bg-white border border-[#E5E7EB] rounded-2xl w-full max-w-2xl shadow-fintech-modal overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E7EB] bg-[#F7F9FC]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111827]">Edit Merchant Safety Policies</h2>
              <p className="text-xs text-[#64748B]">
                Modifications are audited with version history & compliance logs
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

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3.5 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] text-[#9F1239] text-xs flex items-center gap-2 shadow-2xs">
              <AlertTriangle className="w-4 h-4 shrink-0 text-[#E11D48]" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Max Retries */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#475569]">Max Retries per Case (P1)</label>
              <input
                type="number"
                min="1"
                max="8"
                value={formData.max_retries_per_case}
                onChange={(e) => setFormData({ ...formData, max_retries_per_case: parseInt(e.target.value) || 1 })}
                className="w-full text-xs p-2.5 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB] text-[#111827] focus:outline-none focus:border-[#3B5BDB] focus:bg-white transition-colors"
              />
            </div>

            {/* Min Interval */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#475569]">Min Retry Interval Hours (P1)</label>
              <input
                type="number"
                min="6"
                max="72"
                value={formData.min_retry_interval_hours}
                onChange={(e) => setFormData({ ...formData, min_retry_interval_hours: parseInt(e.target.value) || 6 })}
                className="w-full text-xs p-2.5 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB] text-[#111827] focus:outline-none focus:border-[#3B5BDB] focus:bg-white transition-colors"
              />
            </div>

            {/* Recovery Window */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#475569]">Max Recovery Window Days (P2)</label>
              <input
                type="number"
                min="3"
                max="30"
                value={formData.max_recovery_window_days}
                onChange={(e) => setFormData({ ...formData, max_recovery_window_days: parseInt(e.target.value) || 3 })}
                className="w-full text-xs p-2.5 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB] text-[#111827] focus:outline-none focus:border-[#3B5BDB] focus:bg-white transition-colors"
              />
            </div>

            {/* Min AI Confidence */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#475569]">Min AI Confidence Threshold (P3)</label>
              <input
                type="number"
                step="0.05"
                min="0.50"
                max="0.95"
                value={formData.min_confidence_threshold}
                onChange={(e) => setFormData({ ...formData, min_confidence_threshold: parseFloat(e.target.value) || 0.75 })}
                className="w-full text-xs p-2.5 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB] text-[#111827] focus:outline-none focus:border-[#3B5BDB] focus:bg-white transition-colors"
              />
            </div>

            {/* High Value Threshold */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#475569]">High Value Escalation Cap ₹ (P2b)</label>
              <input
                type="number"
                step="500"
                min="2000"
                max="100000"
                value={formData.high_value_threshold_inr}
                onChange={(e) => setFormData({ ...formData, high_value_threshold_inr: parseFloat(e.target.value) || 10000 })}
                className="w-full text-xs p-2.5 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB] text-[#111827] focus:outline-none focus:border-[#3B5BDB] focus:bg-white transition-colors"
              />
            </div>

            {/* Max Customer Contacts */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-[#475569]">Max Customer Contacts Cap (P3b)</label>
              <input
                type="number"
                min="1"
                max="5"
                value={formData.max_customer_contacts_per_cycle}
                onChange={(e) => setFormData({ ...formData, max_customer_contacts_per_cycle: parseInt(e.target.value) || 3 })}
                className="w-full text-xs p-2.5 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB] text-[#111827] focus:outline-none focus:border-[#3B5BDB] focus:bg-white transition-colors"
              />
            </div>
          </div>

          {/* Diff Preview */}
          {diffs.length > 0 && (
            <div className="p-3.5 bg-[#FFFBEB] rounded-xl border border-[#FDE68A] space-y-1.5 shadow-2xs">
              <span className="text-[10px] font-bold text-[#92400E] uppercase tracking-wider">
                Pending Changes Preview ({diffs.length} parameters modified)
              </span>
              <div className="space-y-1 text-xs">
                {diffs.map((d) => (
                  <div key={d.field} className="flex justify-between font-mono">
                    <span className="text-[#92400E]">{d.label}:</span>
                    <span>
                      <del className="text-[#E11D48] mr-2">{String(d.oldVal)}</del>
                      <ins className="text-[#059669] font-bold no-underline">{String(d.newVal)}</ins>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Reason */}
          <div className="space-y-1 pt-1">
            <label className="text-xs font-bold text-[#475569]">
              Operational Rationale <span className="text-[#E11D48]">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Adjusted retry cap based on Q3 cohort benchmark simulation"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs p-2.5 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB] text-[#111827] focus:outline-none focus:border-[#3B5BDB] focus:bg-white transition-colors"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2.5 pt-3 border-t border-[#E5E7EB]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-[#F1F5F9] hover:bg-[#E5E7EB] text-[#475569] text-xs font-bold transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 rounded-xl bg-[#3B5BDB] hover:bg-[#3048B8] text-white text-xs font-bold flex items-center gap-2 shadow-xs transition-colors disabled:opacity-50"
            >
              {loading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              Save & Log Compliance Audit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
