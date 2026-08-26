import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Inbox,
  Cpu,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Sparkles,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';
import { useReducedMotion } from '../../motion/useReducedMotion';

interface NetworkNode {
  id: string;
  title: string;
  subtitle: string;
  color: string;
  badgeBg: string;
  badgeBorder: string;
  icon: React.ElementType;
  metric: string;
  metricLabel: string;
  drilldownRoute: string;
  drilldownLabel: string;
}

const NETWORK_NODES: NetworkNode[] = [
  {
    id: 'ingestion',
    title: '1. Mandate Failure Ingestion',
    subtitle: 'Webhook ingestion & PII sanitization from NPCI/Razorpay clearing',
    color: '#0891B2',
    badgeBg: 'bg-[#ECFEFF]',
    badgeBorder: 'border-[#A5F3FC]',
    icon: Inbox,
    metric: '16 Cases Ingested',
    metricLabel: '100% Validated',
    drilldownRoute: '/cases',
    drilldownLabel: 'View Ingested Cases',
  },
  {
    id: 'ai_decision',
    title: '2. AI Decision Engine',
    subtitle: 'Dual-Brain strategy & probabilistic confidence scoring',
    color: '#7C3AED',
    badgeBg: 'bg-[#F5F3FF]',
    badgeBorder: 'border-[#DDD6FE]',
    icon: Cpu,
    metric: '91% Confidence',
    metricLabel: 'Gemini 2.0 + Failover',
    drilldownRoute: '/analytics',
    drilldownLabel: 'Inspect Conversion Analytics',
  },
  {
    id: 'safety_gate',
    title: '3. Deterministic Safety Gate',
    subtitle: 'P0–P4 zero-tolerance hard limits & operator review holds',
    color: '#059669',
    badgeBg: 'bg-[#ECFDF5]',
    badgeBorder: 'border-[#A7F3D0]',
    icon: ShieldCheck,
    metric: '0 Violations',
    metricLabel: '100% Policy Enforced',
    drilldownRoute: '/policies',
    drilldownLabel: 'Configure Safety Guardrails',
  },
  {
    id: 'execution',
    title: '4. Recovery Rail Dispatch',
    subtitle: 'Smart links & clearing house retries (UPI, eNACH, WhatsApp)',
    color: '#3B5BDB',
    badgeBg: 'bg-[#EEF2FF]',
    badgeBorder: 'border-[#C7D2FE]',
    icon: Zap,
    metric: '3 Rails Active',
    metricLabel: 'UPI / eNACH / WhatsApp',
    drilldownRoute: '/cases?tab=active',
    drilldownLabel: 'Inspect Active Rail Queue',
  },
  {
    id: 'settlement',
    title: '5. Reconciled Settlement',
    subtitle: 'Automated invoice settlement & immutable ledger logging',
    color: '#059669',
    badgeBg: 'bg-[#ECFDF5]',
    badgeBorder: 'border-[#A7F3D0]',
    icon: CheckCircle2,
    metric: '₹29,497 Recovered',
    metricLabel: '+17.1 pp Uplift',
    drilldownRoute: '/cases?tab=recovered',
    drilldownLabel: 'View Settled Cases',
  },
];

export const RecoveryNetworkVisualizer: React.FC = () => {
  const navigate = useNavigate();
  const [activeNode, setActiveNode] = useState<string>('ai_decision');
  const reducedMotion = useReducedMotion();

  const activeNodeData = NETWORK_NODES.find((n) => n.id === activeNode) || NETWORK_NODES[1];

  return (
    <div className="bg-white border border-[#E5E7EB] rounded-2xl p-6 shadow-sm space-y-5 text-left">
      {/* Visualizer Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E5E7EB] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE]">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-[#111827] tracking-tight font-sans">
              Autonomous Recovery Pipeline Network
            </h3>
            <p className="text-[11px] text-[#64748B]">
              Real-time visualization of mandate failure telemetry, AI reasoning, safety gates & settlement
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1.5 text-[11px] font-mono font-bold text-[#059669]">
            <span className="w-2 h-2 rounded-full bg-[#059669] animate-pulse" />
            Autonomous Pipeline: Active
          </span>
        </div>
      </div>

      {/* SVG/DOM Interactive Flow Track */}
      <div className="relative py-4 px-2 overflow-x-auto">
        <div className="flex items-center justify-between min-w-[680px] relative z-10">
          {NETWORK_NODES.map((node, index) => {
            const Icon = node.icon;
            const isSelected = activeNode === node.id;

            return (
              <React.Fragment key={node.id}>
                {/* Node Item */}
                <motion.div
                  onClick={() => setActiveNode(node.id)}
                  whileHover={reducedMotion ? {} : { scale: 1.05, y: -2 }}
                  whileTap={reducedMotion ? {} : { scale: 0.98 }}
                  transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                  className={`flex flex-col items-center text-center cursor-pointer p-3 rounded-2xl transition-all duration-150 relative ${
                    isSelected
                      ? 'bg-[#F7F9FC] border border-[#CBD5E1] shadow-md ring-2 ring-[#EEF2FF]'
                      : 'hover:bg-[#F7F9FC] border border-transparent'
                  }`}
                >
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-2xs transition-all ${
                      node.badgeBg
                    } ${node.badgeBorder}`}
                    style={{ color: node.color }}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <span className="text-xs font-bold text-[#111827] mt-2 tracking-tight">
                    {node.title.split('. ')[1]}
                  </span>
                  <span className="text-[10px] font-mono font-bold text-[#64748B] mt-0.5">
                    {node.metric}
                  </span>

                  {isSelected && (
                    <motion.div
                      layoutId="activeNetworkNodeDot"
                      className="w-1.5 h-1.5 rounded-full mt-1.5"
                      style={{ backgroundColor: node.color }}
                    />
                  )}
                </motion.div>

                {/* Connecting Rail */}
                {index < NETWORK_NODES.length - 1 && (
                  <div className="flex-1 px-1 relative flex items-center justify-center">
                    <div className="w-full h-0.5 bg-[#E5E7EB] relative overflow-hidden rounded-full">
                      {!reducedMotion && (
                        <motion.div
                          animate={{
                            x: ['-100%', '100%'],
                          }}
                          transition={{
                            repeat: Infinity,
                            duration: 2.2,
                            ease: 'linear',
                            delay: index * 0.35,
                          }}
                          className="w-8 h-full rounded-full bg-gradient-to-r from-transparent via-[#3B5BDB] to-transparent"
                        />
                      )}
                    </div>
                    <ArrowRight className="w-3.5 h-3.5 text-[#94A3B8] absolute right-0" />
                  </div>
                )}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Selected Node Telemetry Inspector Box with Drilldown Action */}
      <motion.div
        key={activeNodeData.id}
        initial={reducedMotion ? {} : { opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.18 }}
        className="p-4 rounded-xl bg-[#F7F9FC] border border-[#E5E7EB] flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
      >
        <div className="flex items-center gap-3">
          <div
            className={`p-2.5 rounded-xl border shadow-2xs ${activeNodeData.badgeBg} ${activeNodeData.badgeBorder}`}
            style={{ color: activeNodeData.color }}
          >
            <activeNodeData.icon className="w-4.5 h-4.5" />
          </div>
          <div>
            <h4 className="text-xs font-bold text-[#111827] flex items-center gap-2">
              {activeNodeData.title}
              <span className="text-[10px] px-2 py-0.5 rounded bg-white text-[#475569] font-mono border border-[#E5E7EB]">
                {activeNodeData.metricLabel}
              </span>
            </h4>
            <p className="text-[11px] text-[#64748B] mt-0.5">{activeNodeData.subtitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => navigate(activeNodeData.drilldownRoute)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE] text-xs font-bold shadow-2xs transition-colors"
          >
            <span>{activeNodeData.drilldownLabel}</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </motion.div>
    </div>
  );
};
