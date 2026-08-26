import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Scale,
  ShieldCheck,
  Target,
  IndianRupee,
  Layers,
  Search,
  AlertTriangle,
  Activity,
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

type ActiveTab =
  | 'COMPARATIVE'
  | 'SAFETY'
  | 'CONFUSION_MATRIX'
  | 'FINANCIAL'
  | 'DIMENSIONAL'
  | 'TRENDS'
  | 'SCENARIO_EXPLORER';

export const EvaluationPage: React.FC = () => {
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
  const baselineRecoveryRate = comparativeData?.baseline_recovery_rate || 0.2921;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-sans">
              Recovery Intelligence Benchmark
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
              5,000 SCENARIOS
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Empirical evaluation and zero-tolerance safety governance across 5,000 synthetic failure scenarios
          </p>
        </div>

        {/* Mode Selector for Detailed Views */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-bold">Active Inspector Mode:</span>
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
            className="px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500 shadow-2xs"
          >
            <option value="SMART_MANDATE">SmartMandateRetry (System Under Test)</option>
            <option value="RAZORPAY_NATIVE">Razorpay Native (Baseline A)</option>
            <option value="RULE_BASED">Rule-Based Heuristic (Baseline B)</option>
            <option value="AI_UNGUARDED">AI Unguarded (Ablation Control)</option>
          </select>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 text-rose-600" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Overview & Action Bar */}
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

      {/* Navigation Sub-Tabs (Option B Royal Blue) */}
      <div className="flex items-center gap-1 border-b border-slate-200 pb-px overflow-x-auto">
        <button
          onClick={() => setActiveTab('COMPARATIVE')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'COMPARATIVE'
              ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <Scale className="w-4 h-4 text-blue-600" />
          Comparative Benchmark
        </button>

        <button
          onClick={() => setActiveTab('SAFETY')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'SAFETY'
              ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-600" />
          Safety & Governance
        </button>

        <button
          onClick={() => setActiveTab('CONFUSION_MATRIX')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'CONFUSION_MATRIX'
              ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <Target className="w-4 h-4 text-cyan-600" />
          Confusion Matrix & F1
        </button>

        <button
          onClick={() => setActiveTab('FINANCIAL')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'FINANCIAL'
              ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <IndianRupee className="w-4 h-4 text-amber-600" />
          Recovery & Financials
        </button>

        <button
          onClick={() => setActiveTab('DIMENSIONAL')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'DIMENSIONAL'
              ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <Layers className="w-4 h-4 text-purple-600" />
          Dimensional Breakdowns
        </button>

        <button
          onClick={() => setActiveTab('TRENDS')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'TRENDS'
              ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <Activity className="w-4 h-4 text-emerald-600" />
          Longitudinal Trends & Drift
        </button>

        <button
          onClick={() => setActiveTab('SCENARIO_EXPLORER')}
          className={`flex items-center gap-2 px-4 py-2.5 text-xs font-bold border-b-2 transition-all whitespace-nowrap ${
            activeTab === 'SCENARIO_EXPLORER'
              ? 'border-blue-600 text-blue-600 bg-white rounded-t-xl shadow-2xs'
              : 'border-transparent text-slate-500 hover:text-slate-900 hover:bg-slate-100/60'
          }`}
        >
          <Search className="w-4 h-4 text-pink-600" />
          Scenario Results Explorer
        </button>
      </div>

      {/* Tab Panels */}
      <div>
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
      </div>

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
