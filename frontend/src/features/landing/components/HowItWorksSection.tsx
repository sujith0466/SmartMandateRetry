import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Inbox, Cpu, ShieldCheck, Zap, CheckCircle2, ArrowRight } from 'lucide-react';
import { useReducedMotion } from '../../../motion/useReducedMotion';

interface Step {
  id: number;
  title: string;
  subtitle: string;
  badge: string;
  icon: React.ElementType;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  details: string[];
  codeSample: string;
}

const STEPS: Step[] = [
  {
    id: 1,
    title: '1. Ingestion & Sanitization',
    subtitle: 'HMAC Webhook verification & PII redaction',
    badge: 'INGESTION',
    icon: Inbox,
    color: '#0891B2',
    badgeBg: 'bg-[#ECFEFF]',
    badgeBorder: 'border-[#A5F3FC]',
    details: [
      'Captures razorpay.payment.failed webhooks in sub-5ms with SHA256 HMAC verification.',
      'Sanitizes customer contact data, masking email and phone numbers before AI ingestion.',
      'Initializes idempotent state machine with unique correlation UUIDs.',
    ],
    codeSample: '{\n  "event": "payment.failed",\n  "failure_code": "BAD_REQUEST_PAYMENT_ACCOUNT_INSUFFICIENT_BALANCE",\n  "sanitized": true,\n  "correlation_id": "corr_ingest_7849c"\n}',
  },
  {
    id: 2,
    title: '2. Dual-Brain Context Evaluation',
    subtitle: 'AI reasoning & confidence scoring',
    badge: 'AI INTELLIGENCE',
    icon: Cpu,
    color: '#7C3AED',
    badgeBg: 'bg-[#F5F3FF]',
    badgeBorder: 'border-[#DDD6FE]',
    details: [
      'Gemini 2.0 Flash analyzes failure category, customer history (12 mos tenure), and ticket size.',
      'Identifies optimal clearing house execution windows (06:00 IST) to maximize mandate clearance.',
      'Calculates model confidence score (e.g. 91%) and generates feature attribution weights.',
    ],
    codeSample: '{\n  "ai_proposal": "RETRY_DEBIT",\n  "confidence": 0.91,\n  "optimal_window": "06:00:00+05:30",\n  "attribution": { "customer_tenure": +0.35, "insufficient_funds": +0.45 }\n}',
  },
  {
    id: 3,
    title: '3. Deterministic Safety Validation',
    subtitle: 'Zero-tolerance hard rules P0–P4',
    badge: 'SAFETY GATE',
    icon: ShieldCheck,
    color: '#059669',
    badgeBg: 'bg-[#ECFDF5]',
    badgeBorder: 'border-[#A7F3D0]',
    details: [
      'P0: Hard decline errors (account closed/stolen) trigger immediate HALT — retries strictly blocked.',
      'P1 & P2: Caps total retries at 3 and enforces minimum 24hr cooldown interval.',
      'P2b & P3: Invoices >₹10k or AI confidence <75% transition to human operator queue.',
    ],
    codeSample: '{\n  "safety_status": "ALLOWED",\n  "violations": 0,\n  "rules_checked": ["P0_HARD_DECLINE", "P1_RETRY_CAP", "P2_INTERVAL", "P2b_HIGH_VALUE"],\n  "override_required": false\n}',
  },
  {
    id: 4,
    title: '4. Multi-Channel Rail Dispatch',
    subtitle: 'Automated retry or WhatsApp smart link',
    badge: 'EXECUTION',
    icon: Zap,
    color: '#3B5BDB',
    badgeBg: 'bg-[#EEF2FF]',
    badgeBorder: 'border-[#C7D2FE]',
    details: [
      'For Soft Declines: Schedules automated mandate clearing at 06:00 IST.',
      'For Expired Cards / Limits: Dispatches friction-free WhatsApp & SMS dynamic payment link.',
      'For High-Value Invoices: Alerts finance team in the operator intervention queue.',
    ],
    codeSample: '{\n  "dispatched_action": "SMART_PAYMENT_LINK",\n  "channel": "WHATSAPP_AND_SMS",\n  "link_url": "https://rzp.io/i/plink_9872",\n  "status": "DELIVERED"\n}',
  },
  {
    id: 5,
    title: '5. Settlement Reconciliation',
    subtitle: 'Automated invoice settlement & audit log',
    badge: 'SETTLEMENT',
    icon: CheckCircle2,
    color: '#059669',
    badgeBg: 'bg-[#ECFDF5]',
    badgeBorder: 'border-[#A7F3D0]',
    details: [
      'Captures razorpay.payment.authorized & invoice.paid confirmation webhooks.',
      'Reconciles recovered invoice balance in real time and marks case as RECOVERED.',
      'Logs immutable cryptographic audit record with correlation trace.',
    ],
    codeSample: '{\n  "case_state": "RECOVERED",\n  "recovered_amount_inr": 4999.00,\n  "reconciled_action_id": "act_67b89c",\n  "audit_event": "SETTLEMENT_RECONCILED"\n}',
  },
];

export const HowItWorksSection: React.FC = () => {
  const [selectedStep, setSelectedStep] = useState<number>(1);
  const reducedMotion = useReducedMotion();

  const currentStep = STEPS.find((s) => s.id === selectedStep) || STEPS[0];
  const StepIcon = currentStep.icon;

  return (
    <section id="how-it-works" className="py-24 bg-white border-b border-[#E5E7EB] relative">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#ECFEFF] border border-[#A5F3FC] text-xs font-bold text-[#0891B2]">
            <Zap className="w-3.5 h-3.5" />
            <span>Interactive Lifecycle</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#111827] tracking-tight font-sans">
            How SmartMandate Recovers Failed Subscriptions
          </h2>
          <p className="text-sm sm:text-base text-[#64748B] font-medium leading-relaxed">
            From the instant a recurring invoice fails to settled bank reconciliation in 5 deterministic steps.
          </p>
        </div>

        {/* Step Navigation Bar */}
        <div className="flex items-center justify-between border border-[#E5E7EB] rounded-2xl p-2 bg-[#F7F9FC] overflow-x-auto gap-2">
          {STEPS.map((s) => {
            const Icon = s.icon;
            const isSelected = selectedStep === s.id;
            return (
              <button
                key={s.id}
                onClick={() => setSelectedStep(s.id)}
                className={`flex-1 min-w-[150px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all relative ${
                  isSelected
                    ? 'bg-white text-[#111827] shadow-sm border border-[#CBD5E1]'
                    : 'text-[#64748B] hover:text-[#111827] hover:bg-white/60'
                }`}
              >
                <div
                  className={`w-6 h-6 rounded-lg flex items-center justify-center border text-xs shrink-0 ${s.badgeBg} ${s.badgeBorder}`}
                  style={{ color: s.color }}
                >
                  <Icon className="w-3.5 h-3.5" />
                </div>
                <span className="truncate">{s.title.split('. ')[1]}</span>
              </button>
            );
          })}
        </div>

        {/* Interactive Step Detail Card */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep.id}
            initial={reducedMotion ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? {} : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-[#F7F9FC] border border-[#E5E7EB] rounded-3xl p-8 shadow-sm"
          >
            {/* Left Content */}
            <div className="lg:col-span-6 space-y-6">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div
                    className={`p-2 rounded-xl border shadow-2xs ${currentStep.badgeBg} ${currentStep.badgeBorder}`}
                    style={{ color: currentStep.color }}
                  >
                    <StepIcon className="w-5 h-5" />
                  </div>
                  <span
                    className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full border ${currentStep.badgeBg} ${currentStep.badgeBorder}`}
                    style={{ color: currentStep.color }}
                  >
                    {currentStep.badge}
                  </span>
                </div>
                <h3 className="text-xl font-black text-[#111827] font-sans">{currentStep.title}</h3>
                <p className="text-xs text-[#64748B] font-medium">{currentStep.subtitle}</p>
              </div>

              <div className="space-y-3">
                {currentStep.details.map((d, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-xs text-[#475569]">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#3B5BDB] mt-1.5 shrink-0" />
                    <span className="leading-relaxed">{d}</span>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-3 pt-2">
                <button
                  onClick={() => setSelectedStep(selectedStep === 5 ? 1 : selectedStep + 1)}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-[#3B5BDB] hover:text-[#3048B8] transition-colors"
                >
                  <span>{selectedStep === 5 ? 'Restart Lifecycle' : 'Next Step'}</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Right Code/Telemetry Box */}
            <div className="lg:col-span-6 bg-[#111827] rounded-2xl p-5 border border-slate-800 shadow-lg text-slate-200 font-mono text-xs overflow-x-auto space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800 text-[10px] text-slate-400">
                <span>TELEMETRY PAYLOAD</span>
                <span className="text-[#059669]">● REAL-TIME EXECUTION</span>
              </div>
              <pre className="text-[11px] text-[#A5F3FC] leading-relaxed overflow-x-auto">
                {currentStep.codeSample}
              </pre>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};
