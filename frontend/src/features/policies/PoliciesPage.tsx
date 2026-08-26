import React, { useEffect, useState } from 'react';
import { RefreshCw, AlertCircle, Lock, ShieldAlert } from 'lucide-react';
import { fetchPolicies } from '../../services/api';
import { MerchantPolicy } from '../../types';

export const PoliciesPage: React.FC = () => {
  const [policy, setPolicy] = useState<MerchantPolicy | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadPolicies = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchPolicies();
      setPolicy(data);
    } catch (err: any) {
      setError(err.message || 'Failed to load merchant safety policies');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPolicies();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-6 h-6 text-green-600 animate-spin" />
        <span className="ml-2 text-sm text-gray-500 font-medium">Loading safety policies...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Merchant Safety Policies</h1>
          <p className="text-xs text-gray-500 mt-1">
            Deterministic recovery safety rules, contact frequency limits & hard-decline protections
          </p>
        </div>
        <button
          onClick={loadPolicies}
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
          <button onClick={loadPolicies} className="font-semibold text-red-800 underline">
            Retry
          </button>
        </div>
      )}

      {/* Policy Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Max Retries Per Case</span>
            <Lock className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-extrabold text-gray-900">{policy?.max_retries_per_case || 3}</p>
          <p className="text-xs text-gray-500">Maximum execution attempts before auto-stopping a failed mandate.</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Min Retry Interval</span>
            <Lock className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-extrabold text-gray-900">{policy?.min_retry_interval_hours || 24} hours</p>
          <p className="text-xs text-gray-500">Minimum spacing between successive recovery actions.</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Recovery Window</span>
            <Lock className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-extrabold text-gray-900">{policy?.max_recovery_window_days || 14} days</p>
          <p className="text-xs text-gray-500">Maximum lifespan before a non-recovered case expires.</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">High-Value Threshold</span>
            <Lock className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-extrabold text-gray-900">
            ₹{policy?.high_value_threshold_inr?.toLocaleString('en-IN') || '10,000'}
          </p>
          <p className="text-xs text-gray-500">Invoices at or above this amount require human escalation.</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Min AI Confidence</span>
            <Lock className="w-4 h-4 text-gray-400" />
          </div>
          <p className="text-2xl font-extrabold text-gray-900">
            {((policy?.min_confidence_threshold || 0.75) * 100).toFixed(0)}%
          </p>
          <p className="text-xs text-gray-500">AI decisions below this confidence score are automatically vetoed.</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-gray-500 uppercase">Hard Decline Auto-Stop</span>
            <ShieldAlert className="w-4 h-4 text-red-500" />
          </div>
          <p className="text-2xl font-extrabold text-green-700">ENABLED</p>
          <p className="text-xs text-gray-500">
            Mandate cancellations or stolen card errors permanently stop recovery.
          </p>
        </div>
      </div>
    </div>
  );
};
