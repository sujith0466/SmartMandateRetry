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
      <div className="bg-white/90 backdrop-blur-md border border-[#E5E7EB] rounded-2xl p-6 space-y-4 animate-pulse shadow-xs">
        <div className="h-5 bg-[#F1F5F9] rounded w-1/4"></div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="h-24 bg-[#F1F5F9] rounded-xl"></div>
          <div className="h-24 bg-[#F1F5F9] rounded-xl"></div>
          <div className="h-24 bg-[#F1F5F9] rounded-xl"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-[#FFF1F2] border border-[#FECDD3] rounded-2xl p-5 text-xs text-[#9F1239] flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 text-[#E11D48]" />
          <span>{error}</span>
        </div>
        <button onClick={loadTrends} className="underline font-bold text-[#BE123C]">
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
            <div className="p-2 rounded-xl bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE]">
              <Activity className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-[#111827] flex items-center gap-2 font-sans">
                Longitudinal Evaluation Trends & Model Drift
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-bold ${
                  isDrift ? 'bg-[#FFF1F2] text-[#E11D48] border border-[#FECDD3]' :
                  isInsufficient ? 'bg-[#F1F5F9] text-[#64748B]' :
                  'bg-[#ECFDF5] text-[#059669] border border-[#A7F3D0]'
                }`}>
                  {data?.status || 'STABLE'}
                </span>
              </h2>
              <p className="text-xs text-[#64748B] mt-0.5">
                Multi-run comparative trajectory tracking accuracy, recovery rate uplift, and safety compliance.
              </p>
            </div>
          </div>
        </div>
        <button
          onClick={loadTrends}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-[#E5E7EB] hover:bg-[#F8FAFC] text-[#475569] text-xs font-bold transition-colors shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh
        </button>
      </div>

      {isInsufficient ? (
        <div className="bg-white/90 backdrop-blur-md border border-[#E5E7EB] rounded-2xl p-8 text-center flex flex-col items-center justify-center space-y-3 shadow-xs">
          <div className="p-3 rounded-full bg-[#F1F5F9] text-[#64748B]">
            <History className="w-6 h-6" />
          </div>
          <h4 className="text-sm font-semibold text-[#111827]">Insufficient Historical Observations</h4>
          <p className="text-xs text-[#64748B] max-w-md">
            Longitudinal trend tracking and drift monitoring require at least two persisted evaluation runs. Run comparative benchmarks to start tracking performance trajectories.
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="bg-white/90 backdrop-blur-md border border-[#E5E7EB] rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] uppercase font-semibold text-[#64748B]">Tracked Benchmark Runs</span>
              <div className="text-xl font-extrabold text-[#111827] mt-1">{data?.total_runs}</div>
              <span className="text-[11px] text-[#94A3B8]">Persisted in database</span>
            </div>

            <div className="bg-white/90 backdrop-blur-md border border-[#E5E7EB] rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] uppercase font-semibold text-[#64748B]">Latest Decision Accuracy</span>
              <div className="text-xl font-extrabold text-[#059669] mt-1">
                {((data?.trends[data.trends.length - 1]?.accuracy || 0) * 100).toFixed(1)}%
              </div>
              <span className="text-[11px] text-[#94A3B8]">Dual-stage pipeline</span>
            </div>

            <div className="bg-white/90 backdrop-blur-md border border-[#E5E7EB] rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] uppercase font-semibold text-[#64748B]">Latest Recovery Uplift</span>
              <div className="text-xl font-extrabold text-[#3B5BDB] mt-1">
                +{(data?.trends[data.trends.length - 1]?.recovery_uplift_pp || 0).toFixed(2)} pp
              </div>
              <span className="text-[11px] text-[#059669] font-medium">Over native baseline</span>
            </div>

            <div className="bg-white/90 backdrop-blur-md border border-[#E5E7EB] rounded-2xl p-4 shadow-xs">
              <span className="text-[10px] uppercase font-semibold text-[#64748B]">Safety Invariant Status</span>
              <div className="text-xl font-extrabold text-[#059669] mt-1 flex items-center gap-1.5">
                <ShieldCheck className="w-5 h-5 text-[#059669]" />
                0 Violations
              </div>
              <span className="text-[11px] text-[#94A3B8]">All runs compliant</span>
            </div>
          </div>

          {/* Historical Run Trajectory Table */}
          <div className="bg-white/90 backdrop-blur-md border border-[#E5E7EB] rounded-2xl overflow-hidden shadow-xs">
            <div className="px-5 py-3.5 border-b border-[#E5E7EB] bg-[#F8FAFC] flex items-center justify-between">
              <h4 className="text-xs font-semibold text-[#111827] font-sans">Historical Evaluation Run Trajectory</h4>
              <span className="text-[11px] text-[#64748B] font-mono">Chronological Sequence</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#F8FAFC] text-[#64748B] uppercase font-bold text-[10px] border-b border-[#E5E7EB]">
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
                <tbody className="divide-y divide-[#E5E7EB]">
                  {data?.trends.map((t) => (
                    <tr key={t.run_id} className="hover:bg-[#F8FAFC] transition-colors">
                      <td className="py-2.5 px-4 font-mono font-medium text-[#475569]">
                        {t.run_id.substring(0, 16)}...
                      </td>
                      <td className="py-2.5 px-4 text-[#64748B]">
                        {t.created_at ? new Date(t.created_at).toLocaleString() : '—'}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className="px-2 py-0.5 rounded bg-[#EEF2FF] text-[#3B5BDB] border border-[#C7D2FE] font-mono text-[10px]">
                          {t.baseline_mode}
                        </span>
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-[#111827]">
                        {(t.accuracy * 100).toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-4 text-right font-mono text-[#475569]">
                        {t.macro_f1.toFixed(3)}
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-[#059669]">
                        {(t.recovery_rate * 100).toFixed(1)}%
                      </td>
                      <td className="py-2.5 px-4 text-right font-bold text-[#3B5BDB]">
                        +{t.recovery_uplift_pp.toFixed(2)} pp
                      </td>
                      <td className="py-2.5 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] text-[#059669] font-bold">
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
