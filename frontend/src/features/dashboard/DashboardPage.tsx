import React, { useEffect, useState } from 'react';
import { fetchOverviewMetrics } from '../../services/api';
import { OverviewMetrics } from '../../types';
import { IndianRupee, TrendingUp, AlertTriangle, CheckCircle2 } from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const [metrics, setMetrics] = useState<OverviewMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOverviewMetrics()
      .then(setMetrics)
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Recovery Dashboard</h1>
        <p className="text-sm text-gray-500">
          Executive overview of at-risk subscription revenue and autonomous recovery performance.
        </p>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading metrics...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between text-gray-500 text-sm mb-2">
              <span>Revenue at Risk</span>
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              ₹{metrics?.revenue_at_risk_inr.toLocaleString('en-IN') || '0'}
            </div>
            <p className="text-xs text-gray-400 mt-1">Active failed subscriptions</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between text-gray-500 text-sm mb-2">
              <span>Recovered Revenue</span>
              <IndianRupee className="w-4 h-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-600">
              ₹{metrics?.recovered_revenue_inr.toLocaleString('en-IN') || '0'}
            </div>
            <p className="text-xs text-gray-400 mt-1">Verified settled funds</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between text-gray-500 text-sm mb-2">
              <span>Recovery Rate</span>
              <CheckCircle2 className="w-4 h-4 text-blue-500" />
            </div>
            <div className="text-2xl font-bold text-gray-900">
              {metrics?.recovery_rate_percent.toFixed(1) || '0.0'}%
            </div>
            <p className="text-xs text-gray-400 mt-1">Eligible failures recovered</p>
          </div>

          <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
            <div className="flex items-center justify-between text-gray-500 text-sm mb-2">
              <span>Recovery Uplift</span>
              <TrendingUp className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600">
              +{metrics?.recovery_uplift_percent.toFixed(1) || '0.0'}%
            </div>
            <p className="text-xs text-gray-400 mt-1">Over fixed retry baseline</p>
          </div>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
        <h2 className="text-base font-bold text-gray-900 mb-2">Architecture Foundation Notice</h2>
        <p className="text-sm text-gray-600">
          SmartMandateRetry is initialized in the <strong>Foundation Stage</strong>. Real-time webhook ingestion and autonomous recovery pipelines will be connected in subsequent phases per the implementation roadmap.
        </p>
      </div>
    </div>
  );
};
