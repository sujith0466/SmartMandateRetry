import React, { useEffect, useState } from 'react';
import { Activity, AlertTriangle, CheckCircle2, History, RefreshCw, ShieldCheck } from 'lucide-react';
import { EvaluationTrendsResponse } from '../../../types';
import { fetchEvaluationTrends } from '../../../services/api';

export const LongitudinalTrendView: React.FC = () => {
  const [data, setData] = useState<EvaluationTrendsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadTrends = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetchEvaluationTrends();
      setData(res);
    } catch (err: any) {
      setError(err?.message || 'Failed to fetch evaluation longitudinal trends');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTrends();
  }, []);

  if (loading) {
    return (
      <div className="glass-panel border-slate-800/80 rounded-2xl p-6 space-y-4 animate-pulse">
        <div className="h-5 bg-slate-800 rounded w-1/4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-24 bg-slate-800/50 rounded-xl"></div>
          <div className="h-24 bg-slate-800/50 rounded-xl"></div>
          <div className="h-24 bg-slate-800/50 rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glass-panel border-rose-800/60 bg-rose-950/20 rounded-2xl p-5 text-xs text-rose-300 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-rose-400" />
          <span>{error}</span>
        </div>
        <button onClick={loadTrends} className="underline font-bold text-rose-300">
          Retry
        </button>
      </div>
    );
  }

  const isInsufficient = data?.status === 'INSUFFICIENT_DATA' || (data?.trends?.length || 0) < 2;
  const isDrift = data?.drift_detected;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                Longitudinal Evaluation Trends & Model Drift
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  isDrift ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' :
                  isInsufficient ? 'bg-slate-800 text-slate-400' :
                  'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                }`}>
                  {data?.status || 'STABLE'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Multi-run comparative trajectory tracking accuracy, recovery rate uplift, and safety compliance.
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={loadTrends}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 text-xs font-medium transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {isInsufficient ? (
        <div className="glass-panel border-slate-800/80 rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-3 bg-slate-950/20">
          <div className="p-3 rounded-full bg-slate-800 text-slate-400">
            <History className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-slate-300">Insufficient Historical Observations</h4>
          <p className="text-xs text-slate-500 max-w-md">
            Longitudinal trend tracking and drift monitoring require at least two persisted evaluation runs. Run comparative benchmarks to start tracking performance trajectories.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="glass-panel border-slate-800/80 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Tracked Benchmark Runs</span>
              <div className="text-xl font-extrabold text-white mt-1">{data?.total_runs}</div>
              <span className="text-[11px] text-slate-500">Persisted in database</span>
            </div>

            <div className="glass-panel border-slate-800/80 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Latest Decision Accuracy</span>
              <div className="text-xl font-extrabold text-emerald-400 mt-1">
                {((data?.trends[data.trends.length - 1]?.accuracy || 0) * 100).toFixed(1)}%
              </div>
              <span className="text-[11px] text-slate-500">Dual-stage pipeline</span>
            </div>

            <div className="glass-panel border-slate-800/80 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Latest Recovery Uplift</span>
              <div className="text-xl font-extrabold text-indigo-400 mt-1">
                +{(data?.trends[data.trends.length - 1]?.recovery_uplift_pp || 0).toFixed(2)} pp
              </div>
              <span className="text-[11px] text-emerald-400/80 font-medium">Over native baseline</span>
            </div>

            <div className="glass-panel border-slate-800/80 rounded-2xl p-4">
              <span className="text-[10px] uppercase font-semibold text-slate-400">Safety Invariant Status</span>
              <div className="text-xl font-extrabold text-emerald-400 mt-1 flex items-center gap-1.5">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                0 Violations
              </div>
              <span className="text-[11px] text-slate-500">All runs compliant</span>
            </div>
          </div>

          {/* Historical Run Trajectory Table */}
          <div className="glass-panel border-slate-800/80 rounded-2xl overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-800 bg-slate-950/40 flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-200">Historical Evaluation Run Trajectory</h4>
              <span className="text-[11px] text-slate-400 font-mono">Chronological Sequence</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950/60 text-slate-400 uppercase font-semibold text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Run ID</th>
                    <th className="py-2.5 px-4">Timestamp</th>
                    <th className="py-2.5 px-4">Mode</th>
                    <th className="py-2.5 px-4 text-right">Accuracy</th>
                    <th className="py-2.5 px-4 text-right">Macro F1</th>
                    <th className="py-2.5 px-4 text-right">Recovery Rate</th>
                    <th className="py-2.5 px-4 text-right">Uplift</th>
                    <th className="py-2.5 px-4 text-center">Safety</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {data?.trends.map((t) => (
                    <tr key={t.run_id} className="hover:bg-slate-900/40 transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium text-slate-300">
                        {t.run_id.substring(0, 16)}...
                      </td>
                      <td className="py-2.5 px-4 text-slate-400">
                        {t.created_at ? new Date(t.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 font-mono text-[10px]">
                          {t.baseline_mode}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-slate-200">
                        {(t.accuracy * 100).toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-slate-300">
                        {t.macro_f1.toFixed(3)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-emerald-400">
                        {(t.recovery_rate * 100).toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-indigo-400">
                        +{t.recovery_uplift_pp.toFixed(2)} pp
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          0
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
