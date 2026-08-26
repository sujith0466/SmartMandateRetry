import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LayoutDashboard, Inbox, Sliders, FlaskConical, ArrowRight, CheckCircle2, Sparkles } from 'lucide-react';
import { useReducedMotion } from '../../../motion/useReducedMotion';

interface ShowcaseTab {
  id: string;
  name: string;
  badge: string;
  icon: React.ElementType;
  route: string;
  title: string;
  description: string;
  previewHighlights: string[];
}

const SHOWCASE_TABS: ShowcaseTab[] = [
  {
    id: 'dashboard',
    name: 'Recovery Command Center',
    badge: 'OPERATIONS',
    icon: LayoutDashboard,
    route: '/dashboard',
    title: 'Real-Time Recovery Telemetry & Interventions',
    description: 'Track active recoveries, settled subscription revenue, and high-value risk holds in an enterprise-grade command dashboard.',
    previewHighlights: [
      'Macro financial KPIs with dynamic currency formatting (₹29,497 settled)',
      'Autonomous Recovery Pipeline Network with live stage telemetry',
      'Operator escalation queue for high-value invoices requiring review',
    ],
  },
  {
    id: 'cases',
    name: 'Case Investigation & Attribution',
    badge: 'GOVERNANCE',
    icon: Inbox,
    route: '/cases',
    title: 'Dual-Brain Decision Explainability on Every Mandate',
    description: 'Inspect full auditability for every recovery event: AI confidence, factor weights, and deterministic safety veto chains.',
    previewHighlights: [
      'Dual-Brain 3-stage visualizer: AI proposal -> Safety review -> Execution',
      'Sanitized PII customer track records (12 mos tenure, 95% recovery rate)',
      'One-click operator overrides: dispatch payment links or approve retries',
    ],
  },
  {
    id: 'policies',
    name: 'What-If Simulation Studio',
    badge: 'INTELLIGENCE',
    icon: Sliders,
    route: '/policies',
    title: 'Simulate Policy Changes in Under 2ms',
    description: 'Test draft retry caps, cooldown intervals, and high-value thresholds against synthetic benchmark datasets before applying.',
    previewHighlights: [
      'Sub-2ms non-mutating simulation against 802 test scenarios',
      'Live projected recovery uplift (+17.06 pp) and revenue yield calculations',
      'Full veto breakdown trace for P0–P4 compliance',
    ],
  },
  {
    id: 'evaluation',
    name: 'Evaluation & Benchmarking Lab',
    badge: 'RESEARCH',
    icon: FlaskConical,
    route: '/evaluation',
    title: 'Empirical Rigor Across 5,000 Certified Scenarios',
    description: 'Compare SmartMandateRetry performance against Razorpay native fixed retries, rule-based heuristics, and ablation controls.',
    previewHighlights: [
      '4-mode comparative benchmarking matrix (Accuracy, Recovery Rate, F1 Score)',
      'Zero-tolerance violation metric: 0 safety violations guaranteed',
      'Multi-run longitudinal trend tracking and model drift monitoring',
    ],
  },
];

export const ProductConsoleShowcase2: React.FC = () => {
  const [activeTabId, setActiveTabId] = useState<string>('dashboard');
  const reducedMotion = useReducedMotion();

  const currentTab = SHOWCASE_TABS.find((t) => t.id === activeTabId) || SHOWCASE_TABS[0];
  const Icon = currentTab.icon;

  return (
    <section className="py-24 bg-[#FAF8F3] border-b border-[#E8E1D5] relative">
      <div className="max-w-7xl mx-auto px-6 sm:px-8 space-y-16">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto space-y-3">
          <div className="inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#EEF2FF] border border-[#C7D2FE] text-xs font-bold text-[#3B5BDB]">
            <Sparkles className="w-3.5 h-3.5 text-[#3B5BDB]" />
            <span>Merchant Console Experience</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-black text-[#111827] tracking-tight font-sans">
            Built for Finance & Revenue Operations Teams
          </h2>
          <p className="text-sm sm:text-base text-[#64748B] font-medium leading-relaxed">
            Experience the production-ready SmartMandateRetry merchant console built with strict light-mode fintech aesthetics.
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center justify-between border border-[#E8E1D5] rounded-2xl p-2 bg-white overflow-x-auto gap-2 shadow-2xs">
          {SHOWCASE_TABS.map((t) => {
            const TabIcon = t.icon;
            const isSelected = activeTabId === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setActiveTabId(t.id)}
                className={`flex-1 min-w-[170px] flex items-center justify-center gap-2 py-3 px-3 rounded-xl text-xs font-bold transition-all ${
                  isSelected
                    ? 'bg-[#FAF8F3] text-[#3B5BDB] shadow-sm border border-[#C7D2FE]'
                    : 'text-[#64748B] hover:text-[#111827] hover:bg-[#FAF8F3]/60'
                }`}
              >
                <TabIcon className="w-4 h-4" />
                <span className="truncate">{t.name}</span>
              </button>
            );
          })}
        </div>

        {/* Showcase Content Panel */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentTab.id}
            initial={reducedMotion ? {} : { opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reducedMotion ? {} : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-white border border-[#E8E1D5] rounded-3xl p-8 shadow-sm"
          >
            {/* Left Description */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-2">
                <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE] font-mono">
                  {currentTab.badge}
                </span>
                <h3 className="text-xl font-black text-[#111827] font-sans">{currentTab.title}</h3>
                <p className="text-xs text-[#64748B] leading-relaxed">{currentTab.description}</p>
              </div>

              <div className="space-y-3">
                {currentTab.previewHighlights.map((h, i) => (
                  <div key={i} className="flex items-start gap-2.5 text-xs text-[#475569]">
                    <CheckCircle2 className="w-4 h-4 text-[#059669] shrink-0 mt-0.5" />
                    <span className="leading-relaxed">{h}</span>
                  </div>
                ))}
              </div>

              <div className="pt-2">
                <Link
                  to={currentTab.route}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#111827] hover:bg-[#3B5BDB] text-white text-xs font-bold shadow-2xs transition-all"
                >
                  <span>Open {currentTab.name} in Console</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>

            {/* Right Mock UI Card Representation */}
            <div className="lg:col-span-7 bg-[#FAF8F3] rounded-2xl p-6 border border-[#E8E1D5] shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8E1D5] pb-3 text-xs">
                <div className="flex items-center gap-2">
                  <div className="p-1.5 rounded-lg bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE]">
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-[#111827]">{currentTab.name} (Live Console)</span>
                </div>
                <span className="text-[10px] font-mono text-[#059669] font-bold">● CONNECTED</span>
              </div>

              <div className="p-4 rounded-xl bg-white border border-[#E8E1D5] space-y-3 text-xs">
                <div className="flex justify-between items-center font-mono">
                  <span className="text-[#64748B]">Active Merchant:</span>
                  <span className="font-bold text-[#111827]">SaaS Metrics Cloud Pvt Ltd</span>
                </div>
                <div className="flex justify-between items-center font-mono">
                  <span className="text-[#64748B]">Safety Governance:</span>
                  <span className="font-bold text-[#059669]">P0–P4 Enforced (0 Violations)</span>
                </div>
                <div className="flex justify-between items-center font-mono">
                  <span className="text-[#64748B]">Recovered Revenue:</span>
                  <span className="font-bold text-[#059669]">₹29,497.00 (+17.1 pp Uplift)</span>
                </div>
              </div>

              <div className="text-[11px] text-[#64748B] flex items-center justify-between pt-1">
                <span>Production Console Route: <strong className="font-mono text-[#111827]">{currentTab.route}</strong></span>
                <span className="text-[#3B5BDB] font-bold">Verified Production UI</span>
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
};
