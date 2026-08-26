import React, { useRef, useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard, ArrowRight, ChevronRight,
  AlertCircle, Search, Cpu, ShieldCheck, Zap, CheckCircle2
} from 'lucide-react';
import { useReducedMotion } from '../../../motion/useReducedMotion';

// ─────────────────────────────────────────────────────────────
// Recovery Flow Stage Definitions
// ─────────────────────────────────────────────────────────────
const STAGES = [
  {
    id: 'failure',
    index: 0,
    label: 'Payment Failed',
    sub: 'Insufficient funds · Mandate debit rejected',
    color: '#E11D48',
    bgLight: '#FFF1F2',
    border: '#FECDD3',
    icon: AlertCircle,
    telemetry: 'Event detected in 5ms',
  },
  {
    id: 'context',
    index: 1,
    label: 'Context Evaluated',
    sub: 'Failure type · history · timing · policy constraints',
    color: '#0891B2',
    bgLight: '#ECFEFF',
    border: '#A5F3FC',
    icon: Search,
    telemetry: 'Why it failed — understood',
  },
  {
    id: 'ai',
    index: 2,
    label: 'AI Strategy',
    sub: 'Mandate retry · Payment link · Operator review',
    color: '#7C3AED',
    bgLight: '#F5F3FF',
    border: '#DDD6FE',
    icon: Cpu,
    telemetry: 'Optimal path proposed',
  },
  {
    id: 'safety',
    index: 3,
    label: 'Safety Gate',
    sub: 'P0–P4 deterministic policy enforced',
    color: '#059669',
    bgLight: '#ECFDF5',
    border: '#A7F3D0',
    icon: ShieldCheck,
    telemetry: 'AI proposes. Policy governs.',
  },
  {
    id: 'recovery',
    index: 4,
    label: 'Recovery Dispatched',
    sub: 'Payment link · WhatsApp · Mandate retry',
    color: '#3B5BDB',
    bgLight: '#EEF2FF',
    border: '#C7D2FE',
    icon: Zap,
    telemetry: 'Authorized rail executing',
  },
  {
    id: 'settlement',
    index: 5,
    label: 'Settlement Reconciled',
    sub: '₹29,497 recovered · Ledger immutable',
    color: '#059669',
    bgLight: '#ECFDF5',
    border: '#A7F3D0',
    icon: CheckCircle2,
    telemetry: '✓ Revenue recovered',
  },
] as const;

// Total animation cycle duration in seconds
const STAGE_DURATION = 1.8; // how long each stage is "active"


// ─────────────────────────────────────────────────────────────
// Animated Number Counter
// ─────────────────────────────────────────────────────────────
function AnimatedCounter({ target, suffix = '', prefix = '', duration = 1.4 }: {
  target: number; suffix?: string; prefix?: string; duration?: number;
}) {
  const [value, setValue] = useState(0);
  const [started, setStarted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !started) setStarted(true);
    }, { threshold: 0.5 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [started]);

  useEffect(() => {
    if (!started) return;
    let start: number | null = null;
    const step = (ts: number) => {
      if (!start) start = ts;
      const progress = Math.min((ts - start) / (duration * 1000), 1);
      const ease = 1 - Math.pow(1 - progress, 3);
      setValue(parseFloat((ease * target).toFixed(1)));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [started, target, duration]);

  return (
    <div ref={ref}>
      {prefix}{value % 1 === 0 ? Math.round(value).toLocaleString() : value.toFixed(1)}{suffix}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// SVG Recovery Flow Diagram (the main hero visual)
// ─────────────────────────────────────────────────────────────
function RecoveryFlowDiagram({ activeStage, reducedMotion }: { activeStage: number; reducedMotion: boolean }) {
  // Node positions — 6 nodes in two rows of 3 with connector paths
  // Row 1: Failure(0), Context(1), AI(2)
  // Row 2: Safety(3), Recovery(4), Settlement(5)
  // Connector: 0→1→2→3→4→5 with S-bend between rows

  const nodeRadius = 32;
  const W = 560;
  const H = 320;

  // Node centers
  const nodes = [
    { x: 80,  y: 80  },  // 0 Failure
    { x: 280, y: 80  },  // 1 Context
    { x: 480, y: 80  },  // 2 AI
    { x: 480, y: 240 },  // 3 Safety Gate
    { x: 280, y: 240 },  // 4 Recovery
    { x: 80,  y: 240 },  // 5 Settlement
  ];

  // SVG path for the connector (snake path through all nodes)
  // 0→1: straight right on row 1
  // 1→2: straight right on row 1
  // 2→3: curve down (right-side S)
  // 3→4: straight left on row 2
  // 4→5: straight left on row 2
  const connectorPath = `
    M ${nodes[0].x} ${nodes[0].y}
    L ${nodes[1].x} ${nodes[1].y}
    L ${nodes[2].x} ${nodes[2].y}
    C ${nodes[2].x + 60} ${nodes[2].y} ${nodes[3].x + 60} ${nodes[3].y} ${nodes[3].x} ${nodes[3].y}
    L ${nodes[4].x} ${nodes[4].y}
    L ${nodes[5].x} ${nodes[5].y}
  `;

  // Rejected / blocked branch from Safety Gate (drops down slightly then stops)
  const blockedPath = `
    M ${nodes[3].x} ${nodes[3].y + nodeRadius}
    L ${nodes[3].x} ${nodes[3].y + nodeRadius + 40}
  `;

  // Progress ratio for "packet" animation along connector
  const pathProgress = activeStage / (STAGES.length - 1);

  return (
    <div className="relative w-full max-w-[580px] mx-auto select-none">
      {/* Light vertical grid lines for structure — premium engineering feel */}
      <svg
        viewBox={`0 0 ${W} ${H}`}
        className="w-full h-auto overflow-visible"
        aria-hidden="true"
      >
        <defs>
          {/* Connector gradient — flows left→right then wraps */}
          <linearGradient id="connGrad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#E11D48" stopOpacity="0.4" />
            <stop offset="40%" stopColor="#7C3AED" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#059669" stopOpacity="0.6" />
          </linearGradient>

          {/* Animated dash for the "live packet" */}
          <filter id="glow">
            <feGaussianBlur stdDeviation="3" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>

          <clipPath id="flowClip">
            <rect x="0" y="0" width={W} height={H} />
          </clipPath>
        </defs>

        {/* ── Background connector (full path, muted) ── */}
        <path
          d={connectorPath}
          fill="none"
          stroke="#E8E1D5"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* ── Active connector — reveals progressively per stage ── */}
        {!reducedMotion && (
          <motion.path
            d={connectorPath}
            fill="none"
            stroke="url(#connGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={{ pathLength: 0 }}
            animate={{ pathLength: Math.min(pathProgress + 0.15, 1) }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
          />
        )}
        {reducedMotion && (
          <path
            d={connectorPath}
            fill="none"
            stroke="url(#connGrad)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {/* ── Rejected branch from Safety Gate ── */}
        <path
          d={blockedPath}
          fill="none"
          stroke={activeStage >= 3 ? '#E11D48' : '#E8E1D5'}
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeDasharray="4 4"
          opacity={0.6}
        />
        {/* Small X at end of blocked path */}
        {activeStage >= 3 && (
          <g transform={`translate(${nodes[3].x}, ${nodes[3].y + nodeRadius + 44})`}>
            <circle r="10" fill="#FFF1F2" stroke="#FECDD3" strokeWidth="1.5" />
            <line x1="-5" y1="-5" x2="5" y2="5" stroke="#E11D48" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="5" y1="-5" x2="-5" y2="5" stroke="#E11D48" strokeWidth="1.5" strokeLinecap="round" />
          </g>
        )}
        {activeStage >= 3 && (
          <text
            x={nodes[3].x + 16}
            y={nodes[3].y + nodeRadius + 48}
            fontSize="9"
            fill="#E11D48"
            fontFamily="monospace"
            opacity={0.8}
          >
            UNSAFE · BLOCKED
          </text>
        )}

        {/* ── Stage Nodes ── */}
        {STAGES.map((stage, i) => {
          const node = nodes[i];
          const isActive = i === activeStage;
          const isCompleted = i < activeStage;
          const isPending = i > activeStage;

          const bgColor = isActive ? stage.bgLight : isCompleted ? stage.bgLight : '#FFFFFF';
          const strokeColor = isActive || isCompleted ? stage.border : '#E2E8F0';
          const strokeWidth = isActive ? 2.5 : 1.5;

          return (
            <g key={stage.id}>
              {/* Active pulse ring */}
              {isActive && !reducedMotion && (
                <motion.circle
                  cx={node.x}
                  cy={node.y}
                  r={nodeRadius + 6}
                  fill="none"
                  stroke={stage.color}
                  strokeWidth="1.5"
                  opacity={0.5}
                  initial={{ r: nodeRadius + 2, opacity: 0.7 }}
                  animate={{ r: nodeRadius + 12, opacity: 0 }}
                  transition={{ duration: 1.2, repeat: Infinity, ease: 'easeOut' }}
                />
              )}

              {/* Node circle background */}
              <motion.circle
                cx={node.x}
                cy={node.y}
                r={nodeRadius}
                fill={bgColor}
                stroke={strokeColor}
                strokeWidth={strokeWidth}
                animate={{ fill: bgColor, stroke: strokeColor }}
                transition={{ duration: 0.4 }}
              />

              {/* Completed checkmark overlay */}
              {isCompleted && (
                <motion.circle
                  cx={node.x + nodeRadius * 0.65}
                  cy={node.y - nodeRadius * 0.65}
                  r={10}
                  fill={stage.color}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ duration: 0.2 }}
                />
              )}
              {isCompleted && (
                <text
                  x={node.x + nodeRadius * 0.65}
                  y={node.y - nodeRadius * 0.65 + 4}
                  textAnchor="middle"
                  fontSize="10"
                  fill="white"
                  fontWeight="bold"
                >
                  ✓
                </text>
              )}

              {/* Stage number above node */}
              <text
                x={node.x}
                y={node.y - nodeRadius - 10}
                textAnchor="middle"
                fontSize="9"
                fill={isActive || isCompleted ? stage.color : '#94A3B8'}
                fontFamily="monospace"
                fontWeight="bold"
                letterSpacing="1"
              >
                {String(i + 1).padStart(2, '0')}
              </text>

              {/* Stage label below node */}
              <text
                x={node.x}
                y={node.y + nodeRadius + 16}
                textAnchor="middle"
                fontSize="10.5"
                fill={isActive || isCompleted ? '#111827' : '#94A3B8'}
                fontFamily="system-ui, -apple-system, sans-serif"
                fontWeight={isActive ? '700' : '500'}
              >
                {stage.label}
              </text>

              {/* Foreignobject icon placeholder — we use text icons */}
              {isPending && (
                <text
                  x={node.x}
                  y={node.y + 5}
                  textAnchor="middle"
                  fontSize="16"
                  fill="#CBD5E1"
                >
                  {i === 0 ? '!' : i === 1 ? '⌕' : i === 2 ? '◈' : i === 3 ? '⬡' : i === 4 ? '↯' : '✓'}
                </text>
              )}
              {(isActive || isCompleted) && (
                <text
                  x={node.x}
                  y={node.y + 5}
                  textAnchor="middle"
                  fontSize="16"
                  fill={stage.color}
                >
                  {i === 0 ? '!' : i === 1 ? '⌕' : i === 2 ? '◈' : i === 3 ? '⬡' : i === 4 ? '↯' : '✓'}
                </text>
              )}
            </g>
          );
        })}

        {/* ── Animated "live packet" traveling the path ── */}
        {!reducedMotion && activeStage > 0 && (
          <motion.circle
            r="6"
            fill="white"
            filter="url(#glow)"
            stroke={STAGES[activeStage].color}
            strokeWidth="2"
            style={{
              offsetPath: `path("${connectorPath}")`,
            }}
            initial={{ offsetDistance: `${((activeStage - 1) / (STAGES.length - 1)) * 100}%` }}
            animate={{ offsetDistance: `${(activeStage / (STAGES.length - 1)) * 100}%` }}
            transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
          />
        )}
      </svg>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// Hero Section — the main export
// ─────────────────────────────────────────────────────────────
export const HeroSection2: React.FC = () => {
  const reducedMotion = useReducedMotion();
  const [activeStage, setActiveStage] = useState(0);
  const [isAutoPlaying, setIsAutoPlaying] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Auto-advance through stages every STAGE_DURATION seconds
  useEffect(() => {
    if (reducedMotion) return;

    const tick = () => {
      setActiveStage(prev => (prev + 1) % STAGES.length);
    };

    if (isAutoPlaying) {
      intervalRef.current = setInterval(tick, STAGE_DURATION * 1000);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isAutoPlaying, reducedMotion]);

  const handleStageClick = (i: number) => {
    setActiveStage(i);
    setIsAutoPlaying(false);
    // Resume autoplay after 4s of inactivity
    setTimeout(() => setIsAutoPlaying(true), 4000);
  };

  const scrollToArchitecture = () => {
    const el = document.getElementById('architecture');
    if (el) el.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth' });
  };

  const active = STAGES[activeStage];

  return (
    <section
      className="relative min-h-screen flex flex-col justify-center overflow-hidden bg-[#FAF8F3]"
      style={{ paddingTop: '88px' }}
    >
      {/* ── Very subtle warm radial backgrounds — no hard edges ── */}
      <div
        className="absolute inset-0 pointer-events-none -z-10"
        style={{
          background: `
            radial-gradient(ellipse 70% 50% at 65% 40%, rgba(59,91,219,0.04) 0%, transparent 70%),
            radial-gradient(ellipse 50% 60% at 20% 70%, rgba(8,145,178,0.03) 0%, transparent 60%)
          `,
        }}
      />

      <div className="max-w-7xl mx-auto px-6 sm:px-10 xl:px-8 w-full py-16 lg:py-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

          {/* ════════════════════════════════════════ */}
          {/* LEFT COLUMN — 5 cols — Editorial Content */}
          {/* ════════════════════════════════════════ */}
          <div className="lg:col-span-5 space-y-8">

            {/* Eyebrow badge */}
            <motion.div
              initial={reducedMotion ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-[#E8E1D5] shadow-sm text-[11px] font-bold tracking-widest text-[#475569] uppercase">
                <span className="w-1.5 h-1.5 rounded-full bg-[#059669] animate-pulse shrink-0" />
                Autonomous Mandate Recovery
              </span>
            </motion.div>

            {/* Primary Headline */}
            <motion.div
              initial={reducedMotion ? {} : { opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.18, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="text-[2.6rem] sm:text-5xl xl:text-[3.2rem] font-black text-[#111827] tracking-tight leading-[1.07]">
                Every Failed Mandate Is a{' '}
                <span className="text-[#3B5BDB]">
                  Recovery Opportunity.
                </span>
              </h1>
            </motion.div>

            {/* Supporting copy */}
            <motion.p
              initial={reducedMotion ? {} : { opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="text-[15px] text-[#475569] leading-relaxed max-w-lg"
            >
              When a recurring payment fails, SmartMandateRetry evaluates the failure, selects the right recovery
              strategy, applies deterministic safety policies, and executes the safest path back to settlement.
            </motion.p>

            {/* Safety differentiator pill — must be visible */}
            <motion.div
              initial={reducedMotion ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.36, ease: [0.16, 1, 0.3, 1] }}
              className="flex items-start gap-3 p-4 rounded-2xl bg-white border border-[#E8E1D5] shadow-sm"
            >
              <div className="mt-0.5 p-1.5 rounded-lg bg-[#ECFDF5] shrink-0">
                <ShieldCheck className="w-4 h-4 text-[#059669]" />
              </div>
              <div>
                <p className="text-xs font-bold text-[#111827] mb-0.5">
                  AI proposes.{' '}
                  <span className="text-[#059669]">Deterministic policy governs.</span>
                </p>
                <p className="text-[11px] text-[#64748B] leading-relaxed">
                  No AI recommendation executes without passing a zero-tolerance P0–P4 safety gate. Policy cannot be overridden.
                </p>
              </div>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={reducedMotion ? {} : { opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.44, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
            >
              <Link
                to="/dashboard"
                className="group flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-[#3B5BDB] hover:bg-[#3451CC] text-white text-sm font-bold shadow-md shadow-[#3B5BDB]/20 hover:shadow-lg hover:shadow-[#3B5BDB]/25 transition-all duration-200"
              >
                <LayoutDashboard className="w-4 h-4" />
                Open Merchant Console
                <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform duration-150" />
              </Link>

              <button
                onClick={scrollToArchitecture}
                className="flex items-center justify-center gap-2 px-5 py-3.5 rounded-xl bg-white hover:bg-[#F8F5EF] text-[#111827] text-sm font-semibold border border-[#E8E1D5] hover:border-[#D4CAC0] shadow-sm transition-all duration-200"
              >
                <ChevronRight className="w-4 h-4 text-[#7C3AED]" />
                See How Recovery Works
              </button>
            </motion.div>

            {/* Evidence strip — 4 verified metrics with real visual weight */}
            <motion.div
              initial={reducedMotion ? {} : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: 0.52, ease: [0.16, 1, 0.3, 1] }}
              className="grid grid-cols-4 gap-0 pt-2 border-t border-[#E8E1D5]"
            >
              {[
                { label: 'Recovery Uplift', num: 17.1, prefix: '+', suffix: ' pp', color: '#059669', footnote: 'vs fixed retries' },
                { label: 'Platform Rate', num: 48.3, prefix: '', suffix: '%', color: '#3B5BDB', footnote: 'Eligible cohorts' },
                { label: 'Policy Violations', num: 0, prefix: '', suffix: '', color: '#059669', footnote: 'P0–P4 enforced' },
                { label: 'Certified Scenarios', num: 5000, prefix: '', suffix: '', color: '#0891B2', footnote: 'Benchmark dataset' },
              ].map((m, i) => (
                <div key={m.label} className={`py-4 space-y-0.5 ${i > 0 ? 'pl-4 border-l border-[#E8E1D5]' : ''}`}>
                  <div className="text-[10px] text-[#94A3B8] font-semibold uppercase tracking-wider leading-none">{m.label}</div>
                  <div className="text-xl font-black leading-tight" style={{ color: m.color }}>
                    <AnimatedCounter target={m.num} prefix={m.prefix} suffix={m.suffix} />
                  </div>
                  <div className="text-[10px] text-[#94A3B8]">{m.footnote}</div>
                </div>
              ))}
            </motion.div>
          </div>

          {/* ════════════════════════════════════════════ */}
          {/* RIGHT COLUMN — 7 cols — Recovery Flow Visual */}
          {/* ════════════════════════════════════════════ */}
          <motion.div
            initial={reducedMotion ? {} : { opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.22, ease: [0.16, 1, 0.3, 1] }}
            className="lg:col-span-7 space-y-5"
          >
            {/* Section label — above diagram */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-[#3B5BDB] animate-pulse" />
                <span className="text-[11px] font-bold text-[#64748B] uppercase tracking-widest">
                  Recovery Circuit · 6 Stages
                </span>
              </div>
              {!isAutoPlaying && (
                <button
                  onClick={() => setIsAutoPlaying(true)}
                  className="text-[10px] text-[#3B5BDB] font-semibold hover:underline"
                >
                  Resume auto ↺
                </button>
              )}
            </div>

            {/* ── THE FLOW DIAGRAM on a clean cream-tinted card ── */}
            <div className="relative rounded-2xl bg-white border border-[#E8E1D5] shadow-sm overflow-hidden p-6 sm:p-8">
              {/* Very subtle inner gradient tint */}
              <div
                className="absolute inset-0 pointer-events-none"
                style={{
                  background: `radial-gradient(ellipse 60% 60% at 85% 15%, ${active.bgLight} 0%, transparent 65%)`,
                  transition: 'all 0.6s ease',
                }}
              />

              <div className="relative">
                <RecoveryFlowDiagram activeStage={activeStage} reducedMotion={reducedMotion} />
              </div>

              {/* Clickable stage pills beneath diagram */}
              <div className="relative flex flex-wrap gap-2 mt-4 pt-4 border-t border-[#F3EFE6]">
                {STAGES.map((stage, i) => (
                  <button
                    key={stage.id}
                    onClick={() => handleStageClick(i)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all duration-200"
                    style={{
                      background: i === activeStage ? stage.bgLight : 'transparent',
                      color: i === activeStage ? stage.color : '#94A3B8',
                      border: `1px solid ${i === activeStage ? stage.border : '#F1EDE6'}`,
                    }}
                  >
                    <stage.icon className="w-3 h-3" />
                    {stage.label}
                  </button>
                ))}
              </div>
            </div>

            {/* ── Active Stage Telemetry — below diagram, NOT overlaid ── */}
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStage}
                initial={reducedMotion ? {} : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                className="flex items-start gap-4 p-4 rounded-xl bg-white border border-[#E8E1D5] shadow-sm"
              >
                {/* Icon */}
                <div
                  className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                  style={{ background: active.bgLight, border: `1.5px solid ${active.border}` }}
                >
                  <active.icon className="w-4.5 h-4.5" style={{ color: active.color }} />
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="text-[10px] font-black font-mono uppercase tracking-widest"
                      style={{ color: active.color }}
                    >
                      Stage {String(activeStage + 1).padStart(2, '0')} · {active.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#475569] leading-relaxed">{active.sub}</p>
                </div>

                <div
                  className="shrink-0 px-2 py-1 rounded-lg text-[9px] font-bold font-mono uppercase"
                  style={{ background: active.bgLight, color: active.color, border: `1px solid ${active.border}` }}
                >
                  {active.telemetry}
                </div>
              </motion.div>
            </AnimatePresence>

            {/* Progress bar */}
            <div className="h-0.5 rounded-full bg-[#E8E1D5] overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: active.color }}
                animate={{ width: `${((activeStage + 1) / STAGES.length) * 100}%` }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
              />
            </div>
          </motion.div>

        </div>
      </div>
    </section>
  );
};
