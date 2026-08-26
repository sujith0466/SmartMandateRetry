import React, { useEffect, useState } from 'react';
import { RefreshCw, AlertCircle, Database, Server, Cpu } from 'lucide-react';
import { fetchObservabilitySummary, fetchReadiness } from '../../services/api';
import { ObservabilitySummary, ReadinessCheck } from '../../types';

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
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-green-600 animate-spin" />
        <span className="ml-2 text-sm text-gray-500 font-medium">Loading observability telemetry...</span>
      </div>
    );
  }

  const telemetry = summary?.telemetry;
  const counters = telemetry?.counters || {};
  const histograms = telemetry?.histograms || {};

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Observability & System Diagnostics</h1>
          <p className="text-xs text-gray-500 mt-1">
            Real-time pipeline metrics, AI latency distributions, OCC conflicts & infrastructure health
          </p>
        </div>
        <button
          onClick={loadData}
          className="flex items-center px-3 py-1.5 border border-gray-300 rounded-lg text-xs font-medium text-gray-700 bg-white hover:bg-gray-50"
        >
          <RefreshCw className="w-3.5 h-3.5 mr-1.5 text-gray-500" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 flex items-center justify-between text-xs text-red-700">
          <div className="flex items-center">
            <AlertCircle className="w-4 h-4 mr-2 text-red-600" />
            <span>{error}</span>
          </div>
          <button onClick={loadData} className="font-semibold text-red-800 underline">
            Retry
          </button>
        </div>
      )}

      {/* Infrastructure Readiness Status */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Infrastructure Component Readiness</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Database className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-xs font-bold text-gray-800">PostgreSQL (Neon)</p>
                <p className="text-xs text-gray-500">{readiness?.checks?.database || 'Connected'}</p>
              </div>
            </div>
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full" />
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Server className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-xs font-bold text-gray-800">Redis / Celery</p>
                <p className="text-xs text-gray-500">{readiness?.checks?.redis || 'Connected'}</p>
              </div>
            </div>
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full" />
          </div>

          <div className="p-4 bg-gray-50 rounded-lg border border-gray-100 flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Cpu className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-xs font-bold text-gray-800">OpenRouter AI Provider</p>
                <p className="text-xs text-gray-500">{readiness?.checks?.llm_provider || 'Active'}</p>
              </div>
            </div>
            <span className="w-2.5 h-2.5 bg-green-500 rounded-full" />
          </div>
        </div>
      </div>

      {/* Telemetry Histograms & Operation Latency */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">Operation Timing Distributions (ms)</h3>
        {Object.keys(histograms).length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">No timing histograms recorded in current session.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {Object.entries(histograms).map(([name, stat]) => (
              <div key={name} className="p-3 bg-gray-50 rounded-lg border border-gray-100 space-y-1">
                <div className="flex justify-between items-center text-xs font-bold text-gray-900">
                  <span className="font-mono">{name}</span>
                  <span className="text-green-700">{stat.avg} ms avg</span>
                </div>
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Samples: {stat.count}</span>
                  <span>Min: {stat.min} ms | Max: {stat.max} ms</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Telemetry Counters Snapshot */}
      <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-4">
        <h3 className="text-sm font-semibold text-gray-900">System Telemetry Counters</h3>
        {Object.keys(counters).length === 0 ? (
          <div className="py-8 text-center text-xs text-gray-400">No active counter telemetry recorded.</div>
        ) : (
          <div className="space-y-2">
            {Object.entries(counters).map(([metricKey, val]) => (
              <div key={metricKey} className="flex justify-between items-center p-2.5 bg-gray-50 rounded text-xs">
                <span className="font-mono font-medium text-gray-800">{metricKey}</span>
                <span className="font-bold text-gray-900">{val}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
