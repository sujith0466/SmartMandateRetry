/**
 * Merchant-Friendly Terminology Dictionary & Formatters for SmartMandateRetry.
 * 
 * Maps internal technical state machine labels, policy rule codes, and AI actions
 * into clear, professional, merchant-comprehensible language while preserving
 * technical keys for raw audit inspection.
 */

export const STATE_LABELS: Record<string, { label: string; description: string; variant: 'emerald' | 'amber' | 'indigo' | 'rose' | 'slate' | 'violet' }> = {
  DETECTED: {
    label: 'Failure Ingested',
    description: 'Mandate payment failure detected and queued for classification',
    variant: 'slate',
  },
  ANALYZING: {
    label: 'Analyzing Failure',
    description: 'AI model evaluating customer context and optimal recovery strategy',
    variant: 'indigo',
  },
  DECISION_PENDING: {
    label: 'Formulating Strategy',
    description: 'Formulating optimal recovery timing and contact channel',
    variant: 'indigo',
  },
  POLICY_REVIEW: {
    label: 'Safety Gate Check',
    description: 'Evaluating proposal against merchant safety guardrails',
    variant: 'violet',
  },
  SCHEDULED: {
    label: 'Retry Scheduled',
    description: 'Optimal automated retry window scheduled for execution',
    variant: 'amber',
  },
  ACTION_PENDING: {
    label: 'Smart Link Active',
    description: 'Customer notification dispatched with direct payment link',
    variant: 'indigo',
  },
  WAITING_FOR_OUTCOME: {
    label: 'Awaiting Settlement',
    description: 'Dispatched recovery action awaiting gateway confirmation',
    variant: 'amber',
  },
  RECOVERED: {
    label: 'Successfully Recovered',
    description: 'Mandate payment collected and settled with gateway reconciliation',
    variant: 'emerald',
  },
  ESCALATED: {
    label: 'Needs Manual Review',
    description: 'High-value invoice or risk threshold requires operator review',
    variant: 'rose',
  },
  HALTED: {
    label: 'Halted / Auto-Stopped',
    description: 'Hard decline or terminal fraud trigger stopped to avoid penalty fees',
    variant: 'rose',
  },
  FAILED: {
    label: 'Exhausted / Unrecovered',
    description: 'All permitted retry attempts completed without recovery',
    variant: 'slate',
  },
};

export const STAGE_LABELS: Record<string, string> = {
  PENDING_OBSERVATION: 'Active Monitoring',
  HALTED_RECOVERY: 'Halted / Finalized',
};

export const ACTION_TYPE_LABELS: Record<string, { label: string; description: string }> = {
  AUTO_RETRY: {
    label: 'Automated Mandate Retry',
    description: 'Scheduled intelligent debit against customer bank account',
  },
  PAYMENT_LINK_DELIVERY: {
    label: 'Smart Payment Link',
    description: 'Multi-channel payment link dispatched via WhatsApp & SMS',
  },
  MANUAL_ESCALATION: {
    label: 'Route to Human Review',
    description: 'Escalated to merchant operations queue for high-touch review',
  },
  STOP_RECOVERY: {
    label: 'Halt All Retries',
    description: 'Permanently stop retries to avoid gateway penalty fees',
  },
};

export const FAILURE_CATEGORY_LABELS: Record<string, { label: string; description: string; badge: string }> = {
  TEMPORARY: {
    label: 'Temporary / Soft Decline',
    description: 'Insufficient funds, bank server downtime, or transient network limits',
    badge: 'Soft Decline',
  },
  ACTION_REQUIRED: {
    label: 'Customer Action Required',
    description: 'Card expired, 3D Secure step-up needed, or new mandate authorization required',
    badge: 'Card/Mandate Update',
  },
  PERMANENT: {
    label: 'Permanent / Hard Decline',
    description: 'Account closed, stolen card, or terminal fraud block',
    badge: 'Hard Decline',
  },
  RISK_FLAGGED: {
    label: 'Risk / Anomaly Flagged',
    description: 'Abnormal velocity or low model confidence requiring safety review',
    badge: 'Risk Review',
  },
};

export const GOVERNING_AUTHORITY_LABELS: Record<string, { label: string; badgeVariant: 'emerald' | 'amber' | 'rose' | 'indigo' }> = {
  AI_PROPOSED_POLICY_AUTHORIZED: {
    label: 'Autonomous AI Recovery (Safety Verified)',
    badgeVariant: 'emerald',
  },
  'POLICY_ENGINE_SAFETY_GATE (VETO)': {
    label: 'Safety Guardrail Enforced (AI Vetoed)',
    badgeVariant: 'rose',
  },
  'POLICY_ENGINE_SAFETY_GATE (MODIFIED)': {
    label: 'Safety Guardrail Adjusted',
    badgeVariant: 'amber',
  },
  MERCHANT_OPERATOR: {
    label: 'Manual Operator Intervention',
    badgeVariant: 'indigo',
  },
};

export const AUDIT_EVENT_TYPE_LABELS: Record<string, string> = {
  PAYMENT_FAILURE_CLASSIFIED: 'Payment Failure Ingested & Classified',
  CUSTOMER_CONTEXT_AGGREGATED: 'Customer Recovery Profile Loaded',
  AI_DECISION_PRODUCED: 'AI Strategy Formulated',
  POLICY_DECISION_EVALUATED: 'Safety Guardrail Evaluated',
  RECOVERY_ACTION_SCHEDULED: 'Recovery Action Scheduled',
  RECOVERY_ACTION_EXECUTED: 'Recovery Action Dispatched',
  PAYMENT_OUTCOME_RECONCILED: 'Settlement Reconciled & Confirmed',
  RECOVERY_STATE_TRANSITIONED: 'Recovery State Updated',
  POLICY_CONFIG_UPDATED: 'Merchant Policy Rule Modified',
  CASE_MANUALLY_ESCALATED: 'Case Routed to Human Queue',
  CASE_HUMAN_INTERVENTION_RESOLVED: 'Operator Intervention Applied',
};

export function formatState(state?: string): { label: string; description: string; variant: 'emerald' | 'amber' | 'indigo' | 'rose' | 'slate' | 'violet' } {
  if (!state) return { label: 'Unknown', description: '', variant: 'slate' };
  return STATE_LABELS[state.toUpperCase()] || { label: state, description: '', variant: 'slate' };
}

export function formatActionType(action?: string): string {
  if (!action) return 'Standard Action';
  return ACTION_TYPE_LABELS[action.toUpperCase()]?.label || action.replace(/_/g, ' ');
}

export function formatFailureCategory(cat?: string): { label: string; badge: string } {
  if (!cat) return { label: 'General Failure', badge: 'General' };
  const info = FAILURE_CATEGORY_LABELS[cat.toUpperCase()];
  return info ? { label: info.label, badge: info.badge } : { label: cat, badge: cat };
}

export function formatAuditEventType(type?: string): string {
  if (!type) return 'System Event';
  return AUDIT_EVENT_TYPE_LABELS[type] || type.replace(/_/g, ' ');
}
