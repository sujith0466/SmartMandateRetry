import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Scale,
  ShieldCheck,
  Target,
  IndianRupee,
  Layers,
  Search,
  AlertTriangle,
  Activity,
  FlaskConical,
} from 'lucide-react';
import {
  fetchEvaluationSummary,
  fetchEvaluationRuns,
  fetchScenarioResults,
  executeBenchmarkRun,
} from '../../services/api';
import {
  BenchmarkMetricsType,
  ComparativeBenchmarkResponse,
  EvaluationRunItem,
  EvaluationScenarioResultItem,
  EvaluationSummaryResponse,
} from '../../types';
import { EvaluationOverview } from './components/EvaluationOverview';
import { ComparativeBenchmarkView } from './components/ComparativeBenchmarkView';
import { SafetyGovernanceDashboard } from './components/SafetyGovernanceDashboard';
import { ConfusionMatrixView } from './components/ConfusionMatrixView';
import { RecoveryFinancialAnalytics } from './components/RecoveryFinancialAnalytics';
import { DimensionalBreakdownView } from './components/DimensionalBreakdownView';
import { RunHistoryDrawer } from './components/RunHistoryDrawer';
import { ScenarioResultTable, ScenarioFilters } from './components/ScenarioResultTable';
import { ScenarioExplorerModal } from './components/ScenarioExplorerModal';
import { LongitudinalTrendView } from './components/LongitudinalTrendView';
import { useReducedMotion } from '../../motion/useReducedMotion';
import { staggerContainer, staggerItem } from '../../motion/motionTokens';

type ActiveTab =
  | 'COMPARATIVE'
  | 'SAFETY'
  | 'CONFUSION_MATRIX'
  | 'FINANCIAL'
  | 'DIMENSIONAL'
  | 'TRENDS'
  | 'SCENARIO_EXPLORER';

export const EvaluationPage: React.FC = () => {
  const reducedMotion = useReducedMotion();
  const [activeTab, setActiveTab] = useState<ActiveTab>('COMPARATIVE');
  const [selectedSplit, setSelectedSplit] = useState<'TEST' | 'VALIDATION' | 'TRAIN' | 'ALL'>('TEST');
  const [selectedMode, setSelectedMode] = useState<string>('SMART_MANDATE');

  // Async data states
  const [summary, setSummary] = useState<EvaluationSummaryResponse | null>(null);
  const [runs, setRuns] = useState<EvaluationRunItem[]>([]);
  const [activeRun, setActiveRun] = useState<EvaluationRunItem | null>(null);
  const [comparativeData, setComparativeData] = useState<ComparativeBenchmarkResponse | null>(null);
  const [activeMetrics, setActiveMetrics] = useState<BenchmarkMetricsType | null>(null);

  // Scenario results state
  const [scenarioResults, setScenarioResults] = useState<EvaluationScenarioResultItem[]>([]);
  const [scenarioPage, setScenarioPage] = useState(1);
  const [scenarioTotalPages, setScenarioTotalPages] = useState(1);
  const [scenarioFilters, setScenarioFilters] = useState<ScenarioFilters>({});
  const [selectedScenario, setSelectedScenario] = useState<EvaluationScenarioResultItem | null>(null);

  // UI state
  const [isLoading, setIsLoading] = useState(true);
  const [isScenarioLoading, setIsScenarioLoading] = useState(false);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadInitialData = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      // 1. Fetch macro summary
      const sum = await fetchEvaluationSummary();
      setSummary(sum);

      // 2. Fetch recent runs
      const runsResp = await fetchEvaluationRuns(1, 20);
      setRuns(runsResp.data);

      // 3. Execute comparative benchmark across all 4 modes on selected split to populate UI
      const comp = (await executeBenchmarkRun({
        split: selectedSplit,
        compare: true,
        persist: true,
      })) as ComparativeBenchmarkResponse;

      setComparativeData(comp);

      // Set active metrics to SmartMandate by default
      if (comp.mode_metrics && comp.mode_metrics[selectedMode]) {
        setActiveMetrics(comp.mode_metrics[selectedMode]);
      } else if (comp.mode_metrics && comp.mode_metrics['SMART_MANDATE']) {
        setActiveMetrics(comp.mode_metrics['SMART_MANDATE']);
      }

      // If a persisted run ID was returned for SmartMandate, load its scenario results
      const runId = comp.persisted_run_ids?.[selectedMode] || comp.persisted_run_ids?.['SMART_MANDATE'];
      if (runId) {
        loadScenarioResultsForRun(runId, 1, scenarioFilters);
      }
    } catch (err: any) {
      console.error('Failed to load evaluation benchmark data:', err);
      setErrorMessage(err.message || 'Failed to load evaluation benchmark data');
    } finally {
      setIsLoading(false);
    }
  };

  const loadScenarioResultsForRun = async (
    runId: string,
    page: number = 1,
    filters: ScenarioFilters = {}
  ) => {
    setIsScenarioLoading(true);
    try {
      const resp = await fetchScenarioResults(runId, page, 20, filters);
      setScenarioResults(resp.data);
      setScenarioPage(resp.pagination.page);
      setScenarioTotalPages(resp.pagination.pages);
    } catch (err) {
      console.error('Failed to load scenario results:', err);
    } finally {
      setIsScenarioLoading(false);
    }
  };

  useEffect(() => {
    loadInitialData();
  }, [selectedSplit]);

  const handleRunBenchmark = async () => {
    setIsRunningBenchmark(true);
    setErrorMessage(null);
    try {
      const comp = (await executeBenchmarkRun({
        split: selectedSplit,
        compare: true,
        persist: true,
      })) as ComparativeBenchmarkResponse;

      setComparativeData(comp);
      if (comp.mode_metrics && comp.mode_metrics[selectedMode]) {
        setActiveMetrics(comp.mode_metrics[selectedMode]);
      }

      // Refresh recent runs list
      const runsResp = await fetchEvaluationRuns(1, 20);
      setRuns(runsResp.data);

      const runId = comp.persisted_run_ids?.[selectedMode] || comp.persisted_run_ids?.['SMART_MANDATE'];
      if (runId) {
        loadScenarioResultsForRun(runId, 1, scenarioFilters);
      }
    } catch (err: any) {
      console.error('Benchmark execution failed:', err);
      setErrorMessage(err.message || 'Benchmark execution failed');
    } finally {
      setIsRunningBenchmark(false);
    }
  };

  const handleSelectRun = async (run: EvaluationRunItem) => {
    setActiveRun(run);
    setActiveMetrics(run.metrics_summary);
    setSelectedMode(run.baseline_mode);
    setIsHistoryOpen(false);
    loadScenarioResultsForRun(run.id, 1, scenarioFilters);
  };

  const handleFilterChange = (newFilters: ScenarioFilters) => {
    setScenarioFilters(newFilters);
    const runId = activeRun?.id || comparativeData?.persisted_run_ids?.[selectedMode];
    if (runId) {
      loadScenarioResultsForRun(runId, 1, newFilters);
    }
  };

  const handlePageChange = (newPage: number) => {
    const runId = activeRun?.id || comparativeData?.persisted_run_ids?.[selectedMode];
    if (runId) {
      loadScenarioResultsForRun(runId, newPage, scenarioFilters);
    }
  };

  const modeMetrics = comparativeData?.mode_metrics || {};
  const baselineRecoveryRate = modeMetrics['RAZORPAY_NATIVE']?.simulated_recovery_rate || 0.3125;

  return (
    <motion.div
      variants={staggerContainer}
      initial="initial"
      animate="animate"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={staggerItem} className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-[#111827] tracking-tight font-sans">
              Evaluation & Benchmarking Lab
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#F5F3FF] text-[#7C3AED] border border-[#DDD6FE] flex items-center gap-1 font-mono">
              <FlaskConical className="w-3.5 h-3.5 text-[#7C3AED]" />
              5,000 SCENARIOS
            </span>
          </div>
          <p className="text-xs text-[#64748B] mt-1">
            Empirical evaluation and zero-tolerance safety governance across 5,000 synthetic failure scenarios
          </p>
        </div>

        {/* Mode Selector for Detailed Views */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-[#64748B] font-bold">Active Inspector Mode:</span>
          <select
            value={selectedMode}
            onChange={(e) => {
              const m = e.target.value;
              setSelectedMode(m);
              if (modeMetrics[m]) {
                setActiveMetrics(modeMetrics[m]);
              }
              const runId = comparativeData?.persisted_run_ids?.[m];
              if (runId) {
                loadScenarioResultsForRun(runId, 1, scenarioFilters);
              }
            }}
            className="px-3 py-2 rounded-xl bg-white border border-[#E5E7EB] text-xs font-bold text-[#111827] focus:outline-none focus:border-[#3B5BDB] shadow-2xs"
          >
            <option value="SMART_MANDATE">SmartMandateRetry (System Under Test)</option>
            <option value="RAZORPAY_NATIVE">Razorpay Native (Baseline A)</option>
            <option value="RULE_BASED">Rule-Based Heuristic (Baseline B)</option>
            <option value="AI_UNGUARDED">AI Unguarded (Ablation Control)</option>
          </select>
        </div>
      </motion.div>

      {/* Error Alert */}
      {errorMessage && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-xl bg-[#FFF1F2] border border-[#FECDD3] text-[#9F1239] text-xs flex items-center gap-3 shadow-sm"
        >
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-[#E11D48]" />
          <span>{errorMessage}</span>
        </motion.div>
      )}

      {/* Overview & Action Bar */}
      <motion.div variants={staggerItem}>
        <EvaluationOverview
          summary={summary}
          activeRun={activeRun}
          activeMetrics={activeMetrics}
          selectedSplit={selectedSplit}
          onSplitChange={setSelectedSplit}
          isRunningBenchmark={isRunningBenchmark}
          onRunBenchmark={handleRunBenchmark}
          onRefresh={loadInitialData}
          onOpenHistory={() => setIsHistoryOpen(true)}
        />
      </motion.div>

      {/* Navigation Sub-Tabs (Sapphire Active Treatment) */}
      <motion.div variants={staggerItem} className="flex items-center gap-1 border-b border-[#E5E7EB] pb-px overflow-x-auto">
        {[
          { id: 'COMPARATIVE', label: 'Comparative Benchmark', icon: Scale, color: 'text-[#3B5BDB]' },
          { id: 'SAFETY', label: 'Safety & Governance', icon: ShieldCheck, color: 'text-[#059669]' },
          { id: 'CONFUSION_MATRIX', label: 'Confusion Matrix & F1', icon: Target, color: 'text-[#0891B2]' },
          { id: 'FINANCIAL', label: 'Recovery & Financials', icon: IndianRupee, color: 'text-[#D97706]' },
          { id: 'DIMENSIONAL', label: 'Dimensional Breakdowns', icon: Layers, color: 'text-[#7C3AED]' },
          { id: 'TRENDS', label: 'Longitudinal Trends & Drift', icon: Activity, color: 'text-[#059669]' },
          { id: 'SCENARIO_EXPLORER', label: 'Scenario Results Explorer', icon: Search, color: 'text-[#7C3AED]' },
        ].map((t) => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as ActiveTab)}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap z-0 ${
                isActive ? 'text-[#3B5BDB]' : 'text-[#64748B] hover:text-[#111827]'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="evalActiveSubTabPill"
                  className="absolute inset-0 bg-white border-b-2 border-[#3B5BDB] rounded-t-xl -z-10 shadow-2xs"
                  transition={{ type: 'spring', stiffness: 450, damping: 35 }}
                />
              )}
              <Icon className={`w-4 h-4 ${isActive ? 'text-[#3B5BDB]' : t.color}`} />
              <span>{t.label}</span>
            </button>
          );
        })}
      </motion.div>

      {/* Tab Panels with AnimatePresence */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={reducedMotion ? {} : { opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reducedMotion ? {} : { opacity: 0, y: -4 }}
          transition={{ duration: 0.16 }}
        >
          {activeTab === 'COMPARATIVE' && (
            <ComparativeBenchmarkView
              modeMetrics={modeMetrics}
              baselineRecoveryRate={baselineRecoveryRate}
            />
          )}

          {activeTab === 'SAFETY' && activeMetrics && (
            <SafetyGovernanceDashboard
              safetyMetrics={activeMetrics.safety_metrics}
              modeName={selectedMode}
            />
          )}

          {activeTab === 'CONFUSION_MATRIX' && activeMetrics && (
            <ConfusionMatrixView
              metrics={activeMetrics}
              modeName={selectedMode}
            />
          )}

          {activeTab === 'FINANCIAL' && activeMetrics && (
            <RecoveryFinancialAnalytics
              metrics={activeMetrics}
              modeName={selectedMode}
            />
          )}

          {activeTab === 'DIMENSIONAL' && activeMetrics && (
            <DimensionalBreakdownView
              metrics={activeMetrics}
              modeName={selectedMode}
            />
          )}

          {activeTab === 'TRENDS' && (
            <LongitudinalTrendView />
          )}

          {activeTab === 'SCENARIO_EXPLORER' && (
            <ScenarioResultTable
              results={scenarioResults}
              isLoading={isScenarioLoading}
              onSelectScenario={setSelectedScenario}
              page={scenarioPage}
              totalPages={scenarioTotalPages}
              onPageChange={handlePageChange}
              onFilterChange={handleFilterChange}
            />
          )}
        </motion.div>
      </AnimatePresence>

      {/* Scenario Explorer Inspector Modal */}
      <ScenarioExplorerModal
        scenario={selectedScenario}
        onClose={() => setSelectedScenario(null)}
      />

      {/* Run History Drawer */}
      <RunHistoryDrawer
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        runs={runs}
        activeRunId={activeRun?.id}
        onSelectRun={handleSelectRun}
        isLoading={isLoading}
      />
    </motion.div>
  );
};
