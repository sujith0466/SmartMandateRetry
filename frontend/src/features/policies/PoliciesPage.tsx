import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ShieldCheck,
  RefreshCw,
  Edit3,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Lock,
} from 'lucide-react';
import { fetchPolicies, updatePolicy } from '../../services/api';
import { MerchantPolicy } from '../../types';
import { PolicyEditorModal } from './PolicyEditorModal';
import { PolicySimulationModal } from './PolicySimulationModal';
import { Skeleton } from '../../components/ui/SkeletonLoader';
import { ToastContainer, ToastMessage } from '../../components/ui/Toast';

export const PoliciesPage: React.FC = () => {
  const [policy, setPolicy] = useState<MerchantPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [isSimulationOpen, setIsSimulationOpen] = useState(false);
  const [draftFromSimulation, setDraftFromSimulation] = useState<Partial<MerchantPolicy> | null>(null);

  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  };

  const loadPolicy = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPolicies();
      setPolicy(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load merchant safety policies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicy();
  }, []);

  const handleResetPolicy = async () => {
    if (!window.confirm('Reset all policy guardrails to platform certified defaults?')) return;
    try {
      setLoading(true);
      const res = await updatePolicy({
        max_retries_per_case: 3,
        min_retry_interval_hours: 24,
        max_recovery_window_days: 14,
        min_confidence_threshold: 0.75,
        high_value_threshold_inr: 10000,
        max_customer_contacts_per_cycle: 3,
        hard_decline_auto_stop: true,
      });
      setPolicy(res);
      showToast('Policy guardrails reset to platform defaults!', 'info');
    } catch (err: any) {
      showToast(err.message || 'Failed to reset policy', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyFromSimulation = (simulatedDraft: Partial<MerchantPolicy>) => {
    setDraftFromSimulation(simulatedDraft);
    setIsSimulationOpen(false);
    setIsEditorOpen(true);
    showToast('Simulation parameters imported into editor. Review diff and click Save.', 'info');
  };

  if (loading && !policy) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-32 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      <ToastContainer toasts={toasts} onDismiss={(id) => setToasts((prev) => prev.filter((t) => t.id !== id))} />

      {/* Modals */}
      {policy && (
        <>
          <PolicyEditorModal
            isOpen={isEditorOpen}
            onClose={() => {
              setIsEditorOpen(false);
              setDraftFromSimulation(null);
            }}
            currentPolicy={policy}
            initialDraft={draftFromSimulation || undefined}
            onPolicyUpdated={(newPol) => {
              setPolicy(newPol);
              showToast('Policy guardrails updated & audit event logged!', 'success');
              setDraftFromSimulation(null);
            }}
          />
          <PolicySimulationModal
            isOpen={isSimulationOpen}
            onClose={() => setIsSimulationOpen(false)}
            currentPolicy={policy}
            onApplyToDraft={handleApplyFromSimulation}
          />
        </>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-[#111827] tracking-tight font-sans">
              Merchant Safety Policy Guardrails
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]">
              P0–P4 Enforced
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Deterministic business guardrails governing automated retries, customer contact caps & risk thresholds
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={() => setIsSimulationOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#F5F3FF] hover:bg-[#EDE9FE] text-[#7C3AED] border border-[#DDD6FE] text-xs font-bold transition-colors shadow-2xs"
          >
            <Sparkles className="w-3.5 h-3.5 text-[#7C3AED]" />
            <span>What-If Simulator</span>
          </button>

          <button
            onClick={() => setIsEditorOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#3B5BDB] hover:bg-[#3048B8] text-white text-xs font-bold transition-colors shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>Edit Policy Parameters</span>
          </button>

          <button
            onClick={handleResetPolicy}
            className="p-2 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F7F9FC] text-[#64748B] hover:text-[#111827] transition-colors shadow-2xs"
            title="Reset to Platform Defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={loadPolicy}
            className="p-2 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F7F9FC] text-[#64748B] hover:text-[#111827] transition-colors shadow-2xs"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-[#3B5BDB]' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-[#FFF1F2] border border-[#FECDD3] rounded-2xl p-4 flex items-center justify-between text-xs text-[#9F1239] shadow-sm">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-[#E11D48] shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={loadPolicy} className="font-bold text-[#BE123C] underline">
            Retry
          </button>
        </div>
      )}

      {/* Active Parameters Grid */}
      {policy && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Max Retries */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Retry Cap (P1)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE] font-bold">
                Configurable
              </span>
            </div>
            <div className="text-3xl font-black text-[#111827] font-mono">
              {policy.max_retries_per_case} <span className="text-xs text-[#64748B] font-sans font-medium">attempts max</span>
            </div>
            <p className="text-xs text-[#64748B] pt-2 border-t border-[#E5E7EB]">
              Limits automated debit retries per failure cycle. Cases exceeding this transition to EXHAUSTED.
            </p>
          </div>

          {/* Min Interval */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Retry Interval (P1)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE] font-bold">
                Configurable
              </span>
            </div>
            <div className="text-3xl font-black text-[#111827] font-mono">
              {policy.min_retry_interval_hours} <span className="text-xs text-[#64748B] font-sans font-medium">hours minimum</span>
            </div>
            <p className="text-xs text-[#64748B] pt-2 border-t border-[#E5E7EB]">
              Enforces cooldown between retry attempts to prevent bank debit frequency penalty fees.
            </p>
          </div>

          {/* Recovery Window */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Recovery Window (P2)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE] font-bold">
                Configurable
              </span>
            </div>
            <div className="text-3xl font-black text-[#111827] font-mono">
              {policy.max_recovery_window_days} <span className="text-xs text-[#64748B] font-sans font-medium">days cutoff</span>
            </div>
            <p className="text-xs text-[#64748B] pt-2 border-t border-[#E5E7EB]">
              Elapsed time from original failure. Beyond this window, recovery actions cease.
            </p>
          </div>

          {/* AI Confidence Threshold */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">AI Confidence Gate (P3)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE] font-bold">
                AI Safety
              </span>
            </div>
            <div className="text-3xl font-black text-[#7C3AED] font-mono">
              {((policy.min_confidence_threshold ?? 0.75) * 100).toFixed(0)}%
            </div>
            <p className="text-xs text-[#64748B] pt-2 border-t border-[#E5E7EB]">
              AI recommendations below this threshold are held for human operator review.
            </p>
          </div>

          {/* High Value Escalation Cap */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">High Value Gate (P2b)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#FFFBEB] text-[#D97706] border border-[#FDE68A] font-bold">
                Escalation
              </span>
            </div>
            <div className="text-3xl font-black text-[#111827] font-mono">
              ₹{(policy.high_value_threshold_inr ?? 10000).toLocaleString('en-IN')}
            </div>
            <p className="text-xs text-[#64748B] pt-2 border-t border-[#E5E7EB]">
              Invoices exceeding this amount require explicit operator approval before debit retry dispatch.
            </p>
          </div>

          {/* Customer Contact Cap */}
          <div className="p-5 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#64748B] uppercase tracking-wider">Contact Cap (P3b)</span>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE] font-bold">
                Anti-Fatigue
              </span>
            </div>
            <div className="text-3xl font-black text-[#111827] font-mono">
              {policy.max_customer_contacts_per_cycle} <span className="text-xs text-[#64748B] font-sans font-medium">messages</span>
            </div>
            <p className="text-xs text-[#64748B] pt-2 border-t border-[#E5E7EB]">
              Protects customer experience by capping total WhatsApp/SMS links per billing period.
            </p>
          </div>
        </div>
      )}

      {/* Immutable Deterministic Safety Guardrails Card */}
      <div className="p-6 rounded-2xl bg-white border border-[#E5E7EB] shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-[#E5E7EB] pb-3">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#059669]" />
            <h3 className="text-sm font-bold text-[#111827] font-sans">
              Immutable Zero-Tolerance Safety Rules (P0 & P4)
            </h3>
          </div>
          <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-[#F1F5F9] text-[#475569] border border-[#E5E7EB] font-mono font-bold flex items-center gap-1">
            <Lock className="w-3 h-3" /> HARDCODED SAFETY
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB] space-y-1.5 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-[#111827]">
              <span className="w-2 h-2 rounded-full bg-[#E11D48]" />
              P0 — Hard Decline Auto-Stop
            </div>
            <p className="text-[#475569] leading-relaxed text-[11px]">
              Terminal errors (account closed, card stolen, fraudulent mandate) trigger immediate HALT. Retries are strictly blocked with 0 exceptions.
            </p>
          </div>

          <div className="p-4 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB] space-y-1.5 shadow-2xs">
            <div className="flex items-center gap-2 font-bold text-[#111827]">
              <span className="w-2 h-2 rounded-full bg-[#059669]" />
              P4 — Bank Working Hours Optimization
            </div>
            <p className="text-[#475569] leading-relaxed text-[11px]">
              Bank retry execution is dynamically aligned with clearing house processing windows (06:00 IST) to maximize mandate debit clearance.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};
