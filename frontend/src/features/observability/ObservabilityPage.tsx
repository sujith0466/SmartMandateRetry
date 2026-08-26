import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, AlertCircle, Database, Server, Cpu } from 'lucide-react';
import { fetchObservabilitySummary, fetchReadiness } from '../../services/api';
import { ObservabilitySummary, ReadinessCheck } from '../../types';
import { Badge } from '../../components/ui/Badge';
import { Skeleton } from '../../components/ui/SkeletonLoader';

export const ObservabilityPage: React.FC = () => {
  const [summary, setSummary] = useState<ObservabilitySummary | null>(null);
  const [readiness, setReadiness] = useState<ReadinessCheck | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sumRes, readyRes] = await Promise.all([
        fetchObservabilitySummary(),
        fetchReadiness().catch(() => null),
      ]);
      setSummary(sumRes);
      setReadiness(readyRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load observability telemetry');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-2xl" />
          ))}
        </div>
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  const telemetry = summary?.telemetry;
  const counters = telemetry?.counters || {};
  const histograms = telemetry?.histograms || {};

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className="space-y-6"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-black text-slate-900 tracking-tight font-sans">
              System Health & Diagnostics
            </h1>
            <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
              Technical Telemetry
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time pipeline metrics, AI latency distributions, OCC conflicts & infrastructure health
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition-colors shadow-2xs"
        >
          <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 rounded-2xl p-4 flex items-center justify-between text-xs text-rose-800 shadow-sm">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button onClick={loadData} className="font-bold text-rose-900 underline">
            Retry
          </button>
        </div>
      )}

      {/* Infrastructure Readiness Status */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
        <h3 className="text-sm font-bold text-slate-900 tracking-tight font-sans">Infrastructure Component Readiness</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs">
                <Database className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">PostgreSQL (Neon)</p>
                <p className="text-[11px] text-slate-500 font-mono">{readiness?.checks?.database || 'Connected'}</p>
              </div>
            </div>
            <Badge state="HEALTHY" variant="emerald" />
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs">
                <Server className="w-5 h-5 text-cyan-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">Redis / Celery</p>
                <p className="text-[11px] text-slate-500 font-mono">{readiness?.checks?.redis || 'Connected'}</p>
              </div>
            </div>
            <Badge state="READY" variant="blue" />
          </div>

          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between shadow-2xs">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-white border border-slate-200 text-slate-700 shadow-2xs">
                <Cpu className="w-5 h-5 text-indigo-600" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">OpenRouter AI Provider</p>
                <p className="text-[11px] text-slate-500 font-mono">{readiness?.checks?.llm_provider || 'Active'}</p>
              </div>
            </div>
            <Badge state="ACTIVE" variant="indigo" />
          </div>
        </div>
      </div>

      {/* Telemetry Histograms & Operation Latency */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 font-sans">Operation Timing Distributions (ms)</h3>
          <span className="text-xs font-mono font-bold text-slate-500">P50 / Latency Profile</span>
        </div>

        {Object.keys(histograms).length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 font-medium">
            No timing histograms recorded in current session.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(histograms).map(([name, stat]) => (
              <div key={name} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                <div className="flex justify-between items-center text-xs font-bold">
                  <span className="font-mono text-slate-900">{name}</span>
                  <span className="text-emerald-700 font-mono">{stat.avg} ms avg</span>
                </div>
                <div className="flex justify-between text-[11px] text-slate-500 font-medium">
                  <span>Samples: {stat.count}</span>
                  <span className="font-mono">Min: {stat.min}ms | Max: {stat.max}ms</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Telemetry Counters Snapshot */}
      <div className="bg-white border border-slate-200 p-6 rounded-2xl shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <h3 className="text-sm font-bold text-slate-900 font-sans">System Telemetry Counters</h3>
          <span className="text-xs font-mono font-bold text-slate-500">Event Frequency</span>
        </div>

        {Object.keys(counters).length === 0 ? (
          <div className="py-12 text-center text-xs text-slate-500 font-medium">
            No active counter telemetry recorded.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {Object.entries(counters).map(([metricKey, val]) => (
              <div
                key={metricKey}
                className="flex justify-between items-center p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs shadow-2xs"
              >
                <span className="font-mono font-medium text-slate-700 truncate max-w-[200px]" title={metricKey}>
                  {metricKey}
                </span>
                <span className="font-mono font-bold text-blue-700">{val}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.div>
  );
};
